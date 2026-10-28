'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const bin=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
if(!bin)throw new Error('Chrome or Chromium required');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  for(const screen of [{width:390,height:844},{width:1280,height:900}]){
   const page=await browser.newPage({viewport:screen,isMobile:screen.width<500,hasTouch:screen.width<500,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   const origin='http://127.0.0.1:8787/';
   try{
    let response=await page.goto(origin,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    assert.equal(await page.locator('#advent-collection .toyGame').count(),20);
    assert.equal(await page.locator('#standalone-collection .toyGame').count(),16);
    assert.equal(await page.locator('#advent-collection .adventBauble').count(),20);
    assert.equal(await page.locator('#advent-collection .adventBauble img').count(),0,'The home Advent collection should also use only matching line art');
    assert.equal(await page.locator('#standalone-collection #homePlayers').count(),1);
    assert.equal(await page.locator('a[href="character-playground/"]').count(),0);
    const metrics=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(metrics.pageWidth<=metrics.viewport+3,'GameBox should not overflow on '+screen.width+'px: '+JSON.stringify(metrics));
    await page.screenshot({path:'tools/collection-home-'+screen.width+'.png',fullPage:true});
    await page.locator('#standalone-collection button[data-go="cards-setup"]').click();
    assert.equal(await page.locator('[data-view="cards-setup"]').isVisible(),true,'Card Deck still launches');
    await page.locator('[data-view="cards-setup"] button[data-go="home"]').click();
    await page.locator('#standalone-collection button[data-go="coins-setup"]').click();
    assert.equal(await page.locator('[data-view="coins-setup"]').isVisible(),true,'Coin Flip still launches');
    await page.goto(origin+'advent-2026/',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#advent-games .toyGame').count(),20);
    assert.equal(await page.locator('#advent-games a[href="maze-shift.html"]').count(),1);
    assert.equal(await page.locator('#advent-games a[href="north-pole-pizzeria/"]').count(),1);
    // All mini-games must render as true equal-size circular baubles, never
    // the previous mixture of square tiles and unrelated image styles.
    const baubles=await page.locator('#advent-games .adventBauble').evaluateAll(els=>els.map(el=>{
      const a=el.getBoundingClientRect(),globe=el.querySelector('.baubleGlobe'),g=globe?.getBoundingClientRect();
      return {width:a.width,height:a.height,corner:getComputedStyle(globe).borderRadius,icon:!!el.querySelector('svg.baubleIcon'),label:!!el.querySelector('strong'),images:el.querySelectorAll('img').length,globeWidth:g?.width,globeHeight:g?.height};
    }));
    assert.equal(baubles.length,20);
    assert.ok(baubles.every(b=>Math.abs(b.width-b.height)<2&&b.width>115&&Math.abs(b.globeWidth-b.globeHeight)<2&&b.corner==='50%'&&b.icon&&b.label&&b.images===0),'Every ornament must be equally round, readable and use a unified line icon: '+JSON.stringify(baubles));
    assert.ok(Math.max(...baubles.map(b=>b.width))-Math.min(...baubles.map(b=>b.width))<3,'Every bauble must have the same diameter');
    const allLinks=await page.locator('#advent-games a.gameTile').evaluateAll(els=>els.map(el=>el.href));
    assert.equal(allLinks.length,20);
    for(const href of allLinks){const result=await page.request.get(href);assert.equal(result.status(),200,'Existing Advent game must still load: '+href)}
    const styles=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(styles.pageWidth<=styles.viewport+3,'Advent playroom should not overflow '+JSON.stringify(styles));
    await page.screenshot({path:'tools/collection-advent-'+screen.width+'.png',fullPage:true});
    assert.deepEqual(errors,[],'No hub/portal JS errors');
    console.log('PASS GameBox collections '+screen.width+'px: 20 Advent, 16 standalone, navigation and original game routes');
   }catch(e){await page.screenshot({path:'tools/collection-error-'+screen.width+'.png'}).catch(()=>{});throw e}
   finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
