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
   // Verify explicit movement controls and destination state.
   await page.evaluate(()=>window.__ancientGame.tap(13,21));
   const selectedVillager=await page.evaluate(()=>window.__ancientGame.getState().selected);
   assert(selectedVillager?.kind==='unit','villager not selectable');
   await page.locator('#actions').getByText('Move',{exact:true}).click();
   assert.strictEqual((await page.evaluate(()=>window.__ancientGame.getFeedback())).controlMode,'move');
   await page.evaluate(()=>window.__ancientGame.tap(19,21));
   let afterMove=await page.evaluate(()=>window.__ancientGame.getState());
   assert(afterMove.unitDetails.some(u=>u.id===selectedVillager.id&&u.task==='moving'&&u.goal),'move order destination missing');
   assert((await page.evaluate(()=>window.__ancientGame.getFeedback())).orderCount>0,'missing click command marker');
   // A damaged HQ must be obvious, locatable and reparable by a villager.
   const hq=initial.buildingDetails.find(b=>b.type==='town'&&b.team==='blue');
   const damagedHp=await page.evaluate(id=>window.__ancientGame.testDamage(id,490),hq.id);
   await page.waitForTimeout(450);
   const damageDiag=await page.evaluate(()=>({feedback:window.__ancientGame.getFeedback(),alertClass:document.querySelector('#battleAlert').className,alertText:document.querySelector('#battleAlert').textContent,display:getComputedStyle(document.querySelector('#battleAlert')).display}));
   console.log('DAMAGE CHECK',JSON.stringify({damagedHp,damageDiag}));
   assert(damagedHp!==null,'test building not found');
   assert(await page.locator('#battleAlert').isVisible(),'under-attack alert missing');
   await page.locator('#battleAlert').click();
   assert((await page.evaluate(()=>window.__ancientGame.getState())).selected.id===hq.id,'alert did not locate HQ');
   // Issue a genuine repair command.
   const v=afterMove.unitDetails.find(u=>u.id===selectedVillager.id);
   await page.evaluate(p=>window.__ancientGame.tap(p.x,p.y),v);
   await page.locator('#actions').getByText('Repair',{exact:true}).click();
   await page.evaluate(()=>window.__ancientGame.tap(10,18));
   assert((await page.evaluate(()=>window.__ancientGame.getState())).unitDetails.some(u=>u.id===selectedVillager.id&&u.task==='repair'),'repair order not applied');
   // A town centre should have configurable rally point.
   await page.evaluate(()=>window.__ancientGame.tap(10,18));
   await page.locator('#actions').getByText('Set rally',{exact:true}).click();
   await page.evaluate(()=>window.__ancientGame.tap(13,19));
   assert((await page.evaluate(()=>window.__ancientGame.getState())).buildingDetails.find(b=>b.id===hq.id).rally,'rally point absent');
   // Military gets attack-move order and does not silently ignore the target.
   await page.evaluate(()=>window.__ancientGame.spawnArmy());
   await page.locator('#army').click();
   await page.locator('#actions').getByText('Attack-move',{exact:true}).click();
   await page.evaluate(()=>window.__ancientGame.tap(25,20));
   assert((await page.evaluate(()=>window.__ancientGame.getState())).unitDetails.some(u=>u.team==='blue'&&u.kind==='spearman'&&u.task==='attackmove'),'attack-move ignored');
   await page.evaluate(()=>window.__ancientGame.testSkirmish());
   await page.waitForTimeout(1100);
   await page.screenshot({path:'/tmp/ancient-'+name+'.png'});
   console.log(JSON.stringify({name,width,height,units:initial.units,buildings:initial.buildings,art,errors}));
   assert.deepStrictEqual(errors,[],'uncaught browser errors');
   await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
