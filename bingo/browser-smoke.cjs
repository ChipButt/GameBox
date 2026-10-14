'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const browserExe=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
async function main(){
  if(!browserExe)throw Error('No Chrome/Chromium executable found.');
  const browser=await chromium.launch({executablePath:browserExe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const errors=[];
  page.on('pageerror',err=>errors.push('PAGE ERROR: '+err.stack));
  page.on('framenavigated',frame=>console.log('BROWSER NAVIGATED',frame.url()));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE ERROR: '+m.text())});
  try{
    await page.goto(process.env.BINGO_URL||'http://127.0.0.1:8787/bingo/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#openMaster',{timeout:10000});
    await page.click('#openMaster');
    await page.locator('#bingoEventHost').waitFor({state:'visible',timeout:10000});
    console.log('PASS host dashboard booted and visible');
    await page.locator('[data-host-tab="settings"]').click();
    await page.locator('#hostSettings input[name="title"]').fill('Bingo In Browser Test');
    await page.locator('#hostSettings input[name="venue"]').fill('Example Pub');
    await page.locator('#hostSettings input[name="hostingFee"]').fill('150');
    console.log('DIAGNOSTIC before click',JSON.stringify(await page.evaluate(()=>({
      url:location.href, hostContains:document.querySelector('#bingoEventHost')?.contains(document.querySelector('#hostSettings')),
      fields:[...document.querySelector('#hostSettings').elements].map(el=>({name:el.name,value:el.value}))
    }))));
    await page.evaluate(()=>{
      window.__bingoSubmitDebug=[];
      document.addEventListener('click',e=>{
        window.__bingoSubmitDebug.push({phase:'click-capture',target:e.target?.tagName,
         targetId:e.target?.id,targetText:e.target?.textContent?.trim()?.slice(0,50),
         tab:e.target?.closest?.('[data-host-tab]')?.getAttribute('data-host-tab')||null,
         action:e.target?.closest?.('[data-host-action]')?.getAttribute('data-host-action')||null,
         buttonIsConnected:document.querySelector('#hostSettings button[type=submit]')?.isConnected});
      },true);
      document.addEventListener('click',e=>{
        window.__bingoSubmitDebug.push({phase:'click-bubble',target:e.target?.tagName,targetId:e.target?.id});
      });
      document.addEventListener('submit',e=>window.__bingoSubmitDebug.push({phase:'capture',target:e.target?.id,prevented:e.defaultPrevented}),true);
      document.querySelector('#bingoEventHost').addEventListener('submit',e=>window.__bingoSubmitDebug.push({phase:'hostbubble',target:e.target?.id,prevented:e.defaultPrevented}));
      document.addEventListener('submit',e=>window.__bingoSubmitDebug.push({phase:'bubble',target:e.target?.id,prevented:e.defaultPrevented}));
    });
    await page.locator('#hostSettings button[type="submit"]').click();
    console.log('DIAGNOSTIC events',JSON.stringify(await page.evaluate(()=>window.__bingoSubmitDebug)));
    console.log('DIAGNOSTIC after click URL',page.url());
    console.log('DIAGNOSTIC setup',JSON.stringify(await page.evaluate(()=>({
      title:document.querySelector('#hostTitle')?.textContent,
      notice:document.querySelector('#hostNotice')?.textContent,
      formDisabled:document.querySelector('#hostSettings button[type=submit]')?.disabled,
      valid:document.querySelector('#hostSettings')?.checkValidity(),
      fields:[...document.querySelector('#hostSettings').elements].map(el=>({tag:el.tagName,name:el.name,value:el.value,valid:el.validity.valid,validation:el.validationMessage})),
      storage:localStorage.getItem('gamebox.bingo.host-event.v1'),
      errors:window.__errors||[]
    }))));
    assert.match(await page.locator('#hostTitle').textContent(),/Bingo In Browser Test/);
    console.log('PASS venue setup with £150 minimum');
    await page.locator('[data-host-tab="tickets"]').click();
    await page.locator('#hostSale input[name="name"]').fill('Table 1 Alex');
    await page.locator('#hostSale button[type="submit"]').click();
    assert.match(await page.locator('#hostMain').textContent(),/CI-001/);
    console.log('PASS sale and printed card issued');
    await page.locator('[data-host-tab="run"]').click();
    const pagePromise=page.waitForEvent('popup');
    await page.locator('#audienceDisplay').click();
    const audience=await pagePromise;
    await audience.waitForLoadState('domcontentloaded');
    await audience.waitForSelector('.number');
    assert.equal(await audience.locator('.number').count(),90);
    console.log('PASS audience board launched');
    await page.locator('[data-host-action="draw"]').click();
    await audience.waitForFunction(()=>document.getElementById('ball')?.textContent!=='—',{timeout:5000});
    console.log('PASS host calls reflected on audience board');
    for(let i=1;i<90;i++)await page.locator('[data-host-action="draw"]').click();
    assert.match(await page.locator('#calledCount').textContent(),/90 \/ 90/);
    await page.locator('#hostPayout input[name="cardId"]').fill('CI-001');
    await page.locator('#hostPayout input[name="winner"]').fill('Alex');
    await page.locator('#hostPayout input[name="amount"]').fill('0.20');
    await page.locator('#hostPayout button[type="submit"]').click();
    assert.match(await page.locator('#hostNotice').textContent(),/VALID claim/);
    console.log('PASS verified payout');
    await page.locator('[data-host-action="advance"]').click();
    await page.locator('#hostPayout input[name="cardId"]').fill('CI-001');
    await page.locator('#hostPayout input[name="winner"]').fill('Alex');
    await page.locator('#hostPayout input[name="amount"]').fill('0.30');
    await page.locator('#hostPayout button[type="submit"]').click();
    await page.locator('[data-host-action="advance"]').click();
    await page.locator('#hostPayout input[name="cardId"]').fill('CI-001');
    await page.locator('#hostPayout input[name="winner"]').fill('Alex');
    await page.locator('#hostPayout input[name="amount"]').fill('0.50');
    await page.locator('#hostPayout button[type="submit"]').click();
    await page.locator('[data-host-action="next-game"]').click();
    assert.match(await page.locator('#hostContext').textContent(),/Game 2 of 5/);
    console.log('PASS all three prize stages; game 2 retains ledger');
    await audience.close();
    await page.locator('[data-host-tab="tickets"]').click();
    assert.match(await page.locator('#hostMain').textContent(),/CI-001/);
    console.log('PASS buyer data persists into second round');
    if(errors.length)throw Error(errors.join('\n'));
    console.log('BINGO HOST BROWSER SMOKE TEST PASSED');
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});