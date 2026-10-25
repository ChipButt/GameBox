'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const exe=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
if(!exe)throw Error('Chromium unavailable');
(async()=>{
  const {makeOrder,ORDERS_PER_DAY,requiredCuts}=await import('./engine.mjs');
  const browser=await chromium.launch({headless:true,executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try {
    for(const size of [{width:390,height:844},{width:360,height:740},{width:1280,height:900}]){
      const page=await browser.newPage({viewport:size,isMobile:size.width<500,hasTouch:size.width<500,deviceScaleFactor:1});
      const errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()===404&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});
      try {
        const res=await page.goto('http://127.0.0.1:8787/north-pole-pizzeria/',{waitUntil:'domcontentloaded'});
        assert.equal(res.status(),200);
        assert.match(await page.title(),/North Pole Pizzeria/);
        assert.equal(await page.locator('#welcome').isVisible(),true);
        await page.screenshot({path:'north-pole-pizzeria/welcome-'+size.width+'.png'});
        await page.locator('#playBtn').click();
        assert.equal(await page.locator('#welcome').isVisible(),false);
        const box=await page.locator('#pizzaCanvas').boundingBox();
        assert.ok(box.width>=260,'Visible pizza board should be large enough: '+JSON.stringify(box));
        assert.equal(await page.locator('#dayLabel').innerText(),'01');
        const metrics=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
        assert.ok(metrics.document<=metrics.viewport+3,'No sideways page scrolling '+JSON.stringify(metrics));
        const rounds=size.width===390?ORDERS_PER_DAY:1;
        for(let i=0;i<rounds;i++){
          const o=makeOrder(1,i);
          assert.equal(await page.locator('#customerName').innerText(),o.customer.toUpperCase());
          if(o.needed.sauce)await page.locator('[data-ingredient="sauce"]').click();
          if(o.needed.cheese)await page.locator('[data-ingredient="cheese"]').click();
          for(const kind of o.needed.toppings){
            await page.locator('[data-ingredient="'+kind+'"]').click();
            const canvasBox=await page.locator('#pizzaCanvas').boundingBox();
            for(let j=0;j<(o.needed.side==='all'?6:3);j++){
              const x=o.needed.side==='left'?.23:o.needed.side==='right'?.77:j%2?.67:.33;
              const y=.37+(j%3)*.13;
              await page.mouse.click(canvasBox.x+canvasBox.width*x,canvasBox.y+canvasBox.height*y);
            }
          }
          await page.screenshot({path:'north-pole-pizzeria/prep-'+size.width+'.png'});
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#ovenPanel').isVisible(),true);
          await page.waitForFunction(()=>parseInt(document.querySelector('#bakePercent').textContent,10)>=86,null,{timeout:17000});
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#slicePanel').isVisible(),true);
          for(let cut=0;cut<requiredCuts(o.needed.slices);cut++)await page.locator('#cutBtn').click();
          assert.equal(Number(await page.locator('#slicesDone').innerText()),requiredCuts(o.needed.slices));
          await page.locator('#mainBtn').click();
          assert.equal(await page.locator('#orderResult').isVisible(),true);
          const rating=await page.locator('#reviewStars').innerText();
          assert.equal(rating,'★★★','Perfect order should earn 3 stars '+i+' '+rating);
          await page.screenshot({path:'north-pole-pizzeria/result-'+size.width+'.png'});
          await page.locator('#nextOrderBtn').click();
        }
        if(size.width===390){
          assert.equal(await page.locator('#endDay').isVisible(),true);
          assert.equal(await page.locator('#ordersServed').innerText(),'4');
          await page.screenshot({path:'north-pole-pizzeria/shop-390.png'});
          await page.locator('#nextDayBtn').click();
          assert.equal(await page.locator('#dayLabel').innerText(),'02');
          assert.equal(await page.locator('[data-ingredient="mushroom"]').count(),1,'Mushrooms unlock on day two');
          assert.ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('gamebox.north-pole-pizzeria.v1'))?.day),'Progress should be saved');
        }
        assert.deepEqual(errors,[],'Browser runtime errors');
        assert.deepEqual(missing,[],'Missing local files');
        console.log('PASS North Pole Pizzeria '+size.width+'x'+size.height+' — full kitchen'+(rounds>1?', four orders, shift and saved progression':'')+', pizza UI and layout');
      }catch(e){await page.screenshot({path:'north-pole-pizzeria/failure-'+size.width+'.png'}).catch(()=>{});console.error('Browser debug',{errors,missing});throw e;}
      finally{await page.close();}
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
