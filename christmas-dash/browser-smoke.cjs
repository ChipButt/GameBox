'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const executable=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].filter(Boolean).find(fs.existsSync);
if(!executable)throw Error('Chromium binary unavailable');
(async()=>{
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  for(const size of [{width:390,height:844},{width:360,height:740}]){
   const page=await browser.newPage({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[],assets=new Set();
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',e=>{if(e.type()==='warning'&&/model unavailable|tree files could not load/i.test(e.text()))errors.push(e.text());});
   page.on('response',r=>{
     if(r.status()===404)missing.push(r.url());
     if(r.ok()&&/Elf\.gltf|PineTree_Snow_[24]\.fbx/.test(r.url()))assets.add(r.url().split('/').pop());
   });
   try{
    const r=await page.goto('http://127.0.0.1:8787/christmas-dash/',{waitUntil:'domcontentloaded'});
    assert.equal(r.status(),200);
    assert.match(await page.title(),/North Pole Dash/);
    await page.waitForFunction(()=>{const b=document.querySelector('#startBtn');return b&&!b.disabled;},null,{timeout:45000});
    assert.equal(await page.locator('#fatal').isHidden(),true,'No WebGL failure');
    assert.ok(assets.has('Elf.gltf'),'Real Quaternius elf asset did not load');
    assert.ok(assets.has('PineTree_Snow_2.fbx'),'Real snow-covered pine asset did not load');
    assert.ok(Number(await page.locator('#world').getAttribute('data-skin-corrected'))>0,'Actual imported elf Skin material must be recoloured');
    const actionLabels=await page.locator('[data-action]').allTextContents();
    for(const label of ['LEFT','RIGHT','JUMP','DUCK'])assert.ok(actionLabels.some(text=>text.includes(label)),'Missing labelled '+label+' button');
    const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,screenWidth:innerWidth,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
    assert.ok(dimensions.scrollWidth<=dimensions.screenWidth+3,'Horizontal overflow');
    assert.ok(dimensions.canvas.width>=dimensions.screenWidth-3,'Game fills width');
    await page.screenshot({path:'christmas-dash/menu-'+size.width+'.png'});
    await page.locator('#startBtn').click();
    assert.equal(await page.locator('#startOverlay').isVisible(),false);
    await page.waitForTimeout(1200);
    const d1=Number(await page.locator('#distance').innerText());
    assert.ok(d1>3,'The live metres counter must advance during gameplay');
    assert.ok(parseFloat(await page.locator('#distanceFill').evaluate(e=>e.style.width))>0,'Visible distance progress strip must advance');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await page.screenshot({path:'christmas-dash/playing-'+size.width+'.png'});
    await page.locator('#pauseBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),true,'Pause overlay not shown');
    const pausedDistance=Number(await page.locator('#distance').innerText());
    await page.waitForTimeout(350);
    assert.equal(Number(await page.locator('#distance').innerText()),pausedDistance,'Distance advanced while paused');
    await page.locator('#resumeBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),false);
    await page.locator('#pauseBtn').click();
    await page.locator('#restartBtn').click();
    assert.equal(await page.locator('#pauseOverlay').isVisible(),false);
    assert.ok(Number(await page.locator('#distance').innerText())<=1,'Restart must reset distance');
    assert.deepEqual(missing,[],'Missing assets');
    assert.deepEqual(errors,[],'Browser runtime errors');
    console.log('PASS: North Pole Dash mobile '+size.width+'x'+size.height+' real 3D models, render, run, pause, replay');
   }catch(err){
    await page.screenshot({path:'christmas-dash/failure-'+size.width+'.png'}).catch(()=>{});
    console.error('Browser failures:',{errors,missing,assets:[...assets]});
    throw err;
   }finally{await page.close();}
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});