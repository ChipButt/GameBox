'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const executablePath=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
async function main(){
 if(!executablePath)throw Error('Chromium/Chrome is required for Bingo browser QA.');
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 const page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',err=>errors.push(err.stack||String(err)));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource'))errors.push(m.text())});
 page.on('response',res=>{if(res.status()>=400)missing.push(res.status()+' '+res.url())});
 try{
  await page.goto(process.env.BINGO_URL||'http://127.0.0.1:8787/bingo/',{waitUntil:'domcontentloaded'});
  await page.locator('#openMaster').click();
  await page.locator('#bingoEventHost').waitFor({state:'visible'});
  console.log('PASS Bingo Master dashboard appears');
  await page.locator('[data-host-tab="settings"]').click();
  await page.locator('#hostSettings input[name="title"]').fill('Bingo In Browser Test');
  await page.locator('#hostSettings input[name="venue"]').fill('Example Pub');
  await page.locator('#hostSettings input[name="hostingFee"]').fill('150');
  await page.locator('#hostSettings button[type="submit"]').click();
  assert.match(await page.locator('#hostTitle').textContent(),/Bingo In Browser Test/);
  assert.match(await page.locator('#hostNotice').textContent(),/Evening configured/);
  console.log('PASS event setup and £150 venue fee saved');
  await page.locator('[data-host-tab="tickets"]').click();
  await page.locator('#hostSale input[name="name"]').fill('Table 1 Alex');
  await page.locator('#hostSale button[type="submit"]').click();
  assert.match(await page.locator('#hostMain').textContent(),/CI-001/);
  console.log('PASS ticket sale and serial assigned');
  await page.locator('#hostSale input[name="name"]').fill('Table 1 Alex');
  assert.equal(await page.locator('#hostSaleQuantity option').count(),4,'Existing £1/game book must reduce remaining player cap to 4');
  assert.match(await page.locator('#hostSaleQuantity option').last().textContent(),/£4\.00\/game/);
  await page.locator('#hostSale input[name="name"]').fill('Another player');
  assert.equal(await page.locator('#hostSaleQuantity option').count(),5);
  assert.match(await page.locator('#hostSaleQuantity option').last().textContent(),/£25\.00 total \(£5\.00\/game\)/);
  console.log('PASS ticket dropdown labels total and per-game stakes and respects previous purchases');
  // Verify the physical print page is genuinely an A4 sheet split into two
  // A5 landscape tickets, and every 90-ball number cell is square.
  await page.evaluate(()=>{window.print=()=>{window.__printInvoked=true}});
  await page.locator('#printCount').fill('2');
  await page.locator('[data-host-action="print"]').click();
  const printCheck=await page.evaluate(()=>{
    const sheets=[...document.querySelectorAll('#printArea .printSheet')];
    return {sheets:sheets.length,tickets:sheets.map(x=>x.querySelectorAll('.printTicket').length),
      invoked:window.__printInvoked===true};
  });
  assert.equal(printCheck.sheets,1,'Two A5 cards must print on one A4 sheet');
  assert.deepEqual(printCheck.tickets,[2]);
  assert.equal(printCheck.invoked,true);
  await page.emulateMedia({media:'print'});
  const printDimensions=await page.evaluate(()=>{
    const sheet=document.querySelector('#printArea .printSheet'),tickets=[...sheet.querySelectorAll('.printTicket')],
      cells=[...tickets[0].querySelectorAll('.ticketCell')],page=sheet.getBoundingClientRect();
    const first=tickets[0].getBoundingClientRect(),second=tickets[1].getBoundingClientRect(),cell=cells[0].getBoundingClientRect();
    return {page:{w:page.width,h:page.height},a5HalfPixels:page.height/2,
      ticketCount:tickets.length,cardNumberCells:cells.length,first:{top:first.top,height:first.height},second:{top:second.top,height:second.height},
      squareCell:{w:cell.width,h:cell.height},grid:sheet.querySelector('.ticketGrid').getBoundingClientRect().width};
  });
  console.log('A5 PRINT GEOMETRY',JSON.stringify(printDimensions));
  const mmToPx=mm=>mm*96/25.4;
  assert.ok(Math.abs(printDimensions.page.w-mmToPx(210))<3,'Sheet must be A4 width');
  assert.ok(Math.abs(printDimensions.page.h-mmToPx(297))<3,'Sheet must be A4 height');
  assert.equal(printDimensions.cardNumberCells,27,'90-ball ticket must be 3 by 9');
  assert.ok(Math.abs(printDimensions.second.top-printDimensions.first.top-mmToPx(148.5))<3,'A5 cards must be exactly half an A4 page apart');
  assert.ok(Math.abs(printDimensions.squareCell.w-printDimensions.squareCell.h)<1,'Number cells must be square');
  await page.emulateMedia({media:'screen'});
  console.log('PASS two landscape A5 bingo cards per A4, with 27 square cells each');
  await page.locator('[data-host-tab="run"]').click();
  const smallWav=Buffer.alloc(44);smallWav.write('RIFF',0);smallWav.writeUInt32LE(36,4);smallWav.write('WAVEfmt ',8);smallWav.writeUInt32LE(16,16);smallWav.writeUInt16LE(1,20);smallWav.writeUInt16LE(1,22);smallWav.writeUInt32LE(8000,24);smallWav.writeUInt32LE(16000,28);smallWav.writeUInt16LE(2,32);smallWav.writeUInt16LE(16,34);smallWav.write('data',36);smallWav.writeUInt32LE(0,40);
  await page.locator('#hostMusicUpload').setInputFiles({name:'sample-licensed.wav',mimeType:'audio/wav',buffer:smallWav});
  await page.locator('.hostTrackList').getByText('sample-licensed.wav').waitFor();
  console.log('PASS music upload saved to local browser');
  const popupPromise=page.waitForEvent('popup');
  await page.locator('#audienceDisplay').click();
  const audience=await popupPromise;
  await audience.waitForLoadState('domcontentloaded');
  assert.equal(await audience.locator('.number').count(),90);
  await page.locator('[data-host-action="draw"]').click();
  await audience.waitForFunction(()=>document.getElementById('ball')?.textContent!=='—');
  console.log('PASS audience display syncs number calling');
  for(let i=1;i<90;i++)await page.locator('[data-host-action="draw"]').click();
  assert.match(await page.locator('#calledCount').textContent(),/90 \/ 90/);
  async function pay(amount){
    await page.locator('#hostPayout input[name="cardId"]').fill('CI-001');
    await page.locator('#hostPayout input[name="winner"]').fill('Alex');
    await page.locator('#hostPayout input[name="amount"]').fill(amount);
    await page.locator('#hostPayout button[type="submit"]').click();
    assert.match(await page.locator('#hostNotice').textContent(),/VALID claim/);
  }
  await pay('0.20');await page.locator('[data-host-action="advance"]').click();
  await pay('0.30');await page.locator('[data-host-action="advance"]').click();
  await pay('0.50');await page.locator('[data-host-action="next-game"]').click();
  assert.match(await page.locator('#hostContext').textContent(),/Game 2 of 5/);
  await page.locator('[data-host-tab="tickets"]').click();
  assert.match(await page.locator('#hostMain').textContent(),/CI-001/);
  console.log('PASS all payouts verified and game 2 retains sold tickets');
  await audience.close();
  if(missing.length)throw Error('Missing HTTP assets:\n'+missing.join('\n'));
  if(errors.length)throw Error('Browser errors:\n'+errors.join('\n'));
  console.log('BINGO IN REAL BROWSER TEST PASSED');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});