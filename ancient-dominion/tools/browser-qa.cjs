const { chromium } = require('playwright-core');
const fs=require('fs'), assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8787/ancient-dominion/',{waitUntil:'load'});
   await page.locator('#play').click();
   await page.waitForTimeout(1800);
   const initial=await page.evaluate(()=>window.__ancientGame.getState());
   const art=await page.evaluate(()=>window.__ancientGame.artStatus());
   assert(initial.units>=4&&initial.buildings>=3,'missing game objects');
   for(const n of ['house','barracks','tower','castle','stable','blacksmith','villager','spearman','archer','tree'])assert(art[n].ready,'asset not loaded: '+n);
   await page.evaluate(()=>window.__ancientGame.tap(13,21));
   await page.evaluate(()=>window.__ancientGame.tap(16,22));
   await page.waitForTimeout(400);
   await page.evaluate(()=>document.querySelector('#home').click());
   await page.waitForTimeout(200);
   await page.screenshot({path:'/tmp/ancient-'+name+'.png'});
   console.log(JSON.stringify({name,width,height,units:initial.units,buildings:initial.buildings,art,errors}));
   assert.deepStrictEqual(errors,[],'uncaught browser errors');
   await page.close();
 }
 const assetsPage=await browser.newPage({viewport:{width:1150,height:1450},deviceScaleFactor:1});
 await assetsPage.goto('http://127.0.0.1:8787/ancient-dominion/assets/terrain-atlas.png',{waitUntil:'load'});
 await assetsPage.screenshot({path:'/tmp/ancient-atlas.png'});
 await assetsPage.setContent('<body style="background:#ccb88b"><h2>Tree sprite preview</h2><img style="image-rendering:pixelated;width:680px" src="http://127.0.0.1:8787/ancient-dominion/assets/tree.png"></body>');
 await assetsPage.waitForTimeout(400);
 await assetsPage.screenshot({path:'/tmp/ancient-tree.png'});
 await assetsPage.close();
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
