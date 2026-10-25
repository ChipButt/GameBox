"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require("playwright-core");
const executablePath=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium"].filter(Boolean).find(fs.existsSync);
if(!executablePath)throw Error("No Chromium executable");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  for(const viewport of [{width:390,height:844},{width:360,height:740},{width:320,height:568}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const errors=[],missing=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()===404&&r.url().includes("127.0.0.1:8787"))missing.push(r.url())});
   const response=await page.goto("http://127.0.0.1:8787/christmas-potion-sort/",{waitUntil:"networkidle"});
   assert.equal(response.status(),200);
   assert.match(await page.title(),/Santa.s Potion Sort/);
   assert.ok(await page.locator(".dialog .gifts img").count()===3,"Local Kenney gifts on intro");
   await page.screenshot({path:"christmas-potion-sort/intro-"+viewport.width+".png"});
   await page.locator('[data-act="play"]').click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   assert.equal(await page.locator(".bottle").count(),5,"three colours and two spare bottles on level one");
   const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,buttons:document.querySelector(".tools").getBoundingClientRect().bottom,height:innerHeight,scene:document.querySelector(".scene").getBoundingClientRect().height}));
   assert.ok(bounds.width<=bounds.viewport+2,"Horizontal overflow "+JSON.stringify(bounds));
   assert.ok(bounds.buttons<=bounds.height+2,"Tools outside viewport "+JSON.stringify(bounds));
   assert.ok(bounds.scene>220,"Puzzle too small "+JSON.stringify(bounds));
   await page.locator("#menu").click();
   await page.locator('[data-act="patterns"]').click();
   assert.equal(await page.locator(".bottles.patterns").count(),1);
   await page.locator('[data-act="resume"]').click();
   await page.screenshot({path:"christmas-potion-sort/play-"+viewport.width+".png"});
   if(viewport.width===390){
    const proof=await page.evaluate(async()=>{const m=await import("./engine.mjs");return m.makeLevel(1).proof});
    assert.ok(proof.length>0);
    const first=proof[0];
    await page.locator('[data-index="'+first.from+'"]').click();
    assert.equal(await page.locator(".bottle.selected").count(),1);
    await page.locator('[data-index="'+first.to+'"]').click();
    await page.waitForFunction(()=>Number(document.querySelector("#moves").textContent)===1);
    await page.locator("#undo").click();
    assert.equal(Number(await page.locator("#moves").innerText()),0,"Undo restores moves");
    for(const step of proof){
     await page.locator('[data-index="'+step.from+'"]').click();
     await page.locator('[data-index="'+step.to+'"]').click();
     await page.waitForFunction(n=>Number(document.querySelector("#moves").textContent)===n,proof.indexOf(step)+1);
    }
    await page.locator(".dialog .trophy").waitFor({state:"visible"});
    assert.match(await page.locator(".dialog h2").innerText(),/POTION/);
    await page.screenshot({path:"christmas-potion-sort/win-390.png"});
    await page.locator('[data-act="next"]').click();
    assert.equal(await page.locator("#level").innerText(),"02");
    await page.reload({waitUntil:"networkidle"});
    await page.locator('[data-act="play"]').click();
    assert.equal(await page.locator("#level").innerText(),"02","level progress survives reload");
   }
   assert.deepEqual(errors,[],"Page errors "+viewport.width);
   assert.deepEqual(missing,[],"Missing local artwork "+viewport.width);
   console.log("PASS Potion Sort mobile "+viewport.width+"x"+viewport.height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
