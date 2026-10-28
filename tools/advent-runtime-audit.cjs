'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
if(!chrome)throw Error('Chromium not available');
const catalog=JSON.parse(fs.readFileSync('advent-2026/catalog.json','utf8')).advent;
const starts={
 'Tiny Ski Run':'#startButton','Jigsaw':'#startPuzzleButton','Workshop Watch':'#playButton',
 'Block Breaker':'#startGameButton','Santa Invaders':'#primaryButton',
 'Festive Blocks':null,'Santa’s Letter Sort':'#startButton',
 'North Pole Dash':'#startBtn','North Pole Pizzeria':'#playBtn',
 'Snowy Crossing':'#start',"Santa's Present Stack":'#start',
 'Chimney Drop-In':'#primaryButton',"Santa's Sorting Shift":'#primaryButton',
 'Snow Shoveller':'#startBtn','Snowball Knockdown':'#playBtn',
 "Santa's Arrow Escape":'#playBtn',"Santa's Potion Sort":null,
 'Gift Bubble Shooter':'#startBtn','Snowy Sweets':'#playButton',
 'Shift In Maze':'#soloMode'
};
function delay(t){return new Promise(resolve=>setTimeout(resolve,t))}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const results=[],failures=[];
 try{
  for(const dims of [{width:390,height:844},{width:1280,height:900}]){
   for(const game of catalog){
    const url='http://127.0.0.1:8787/'+game.href;
    const page=await browser.newPage({viewport:dims,isMobile:dims.width<500,hasTouch:dims.width<500,deviceScaleFactor:1});
    await page.setDefaultTimeout(2500);
    const exceptions=[],consoleErrors=[],failedRequests=[];
    page.on('pageerror',e=>exceptions.push(e.message));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,220))});
    page.on('requestfailed',req=>{if(failedRequests.length<12)failedRequests.push(req.url().slice(0,160))});
    const info={game:game.name,href:game.href,width:dims.width,ok:false};
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      info.status=response?.status();
      await page.waitForTimeout(dims.width===390?1600:1100);
      const start=starts[game.name];
      if(start){
       const btn=page.locator(start);
       if(await btn.count()===1&&await btn.isVisible().catch(()=>false)){
         if(await btn.isEnabled().catch(()=>false)){
          await btn.click({timeout:1800}).then(()=>{info.startClicked=true}).catch(e=>{info.startError=e.message.slice(0,170)});
          await page.waitForTimeout(450);
         }else info.startBlocked=true;
       }else info.startNotVisible=true;
      }
      const layout=await page.evaluate(()=>{
        const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>10&&r.height>10&&r.bottom>0&&r.top<innerHeight};
        const visible=[...document.querySelectorAll('canvas')].filter(vis).map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,canvasWidth:c.width,canvasHeight:c.height}));
        const broken=[...document.querySelectorAll('img')].filter(img=>vis(img)&&img.complete&&img.naturalWidth===0).map(img=>img.getAttribute('src')).slice(0,8);
        const fatal=[...document.querySelectorAll('[id*="fatal"],[class*="fatal"],[id*="error"]')].filter(vis).map(el=>(el.textContent||'').trim().slice(0,120));
        return {vw:innerWidth,vh:innerHeight,scrollW:document.documentElement.scrollWidth,bodyW:document.body.scrollWidth,scrollH:document.documentElement.scrollHeight,title:document.title,bodyText:document.body.innerText.trim().slice(0,250),visibleCanvases:visible,brokenImages:broken,fatal};
      });
      Object.assign(info,{title:layout.title,overflow:Math.max(layout.scrollW,layout.bodyW)-layout.vw,visibleCanvases:layout.visibleCanvases.length,brokenImages:layout.brokenImages,exceptions,consoleErrors,failedRequests,fatal:layout.fatal});
      info.ok=info.status===200&&!!info.title&&layout.bodyText.length>20&&info.overflow<15&&info.fatal.length===0&&exceptions.length===0&&layout.brokenImages.length===0;
      if(!info.ok)failures.push(info);
      if(dims.width===390){
        const f='tools/advent-'+String(game.index).padStart(2,'0')+'.png';
        await page.screenshot({path:f,timeout:5000}).catch(()=>{});
      }
    }catch(e){info.error=e.message.slice(0,450);failures.push(info)}
    finally{results.push(info);await page.close()}
    console.log((info.ok?'PASS ':'FAIL ')+dims.width+'px '+game.name+' '+JSON.stringify({status:info.status,overflow:info.overflow,canvases:info.visibleCanvases,exceptions:info.exceptions,broken:info.brokenImages?.length,failed:info.failedRequests?.length,click:info.startClicked,problem:info.error||info.fatal}));
   }
  }
 }finally{await browser.close()}
 fs.writeFileSync('tools/advent-runtime-audit.json',JSON.stringify({checked:new Date().toISOString(),games:catalog.length,results,failures},null,2));
 console.log('ADVENT AUDIT '+results.filter(r=>r.ok).length+'/'+results.length+' startup checks passed; '+failures.length+' errors');
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
