/* Browser smoke test: node santas-sorting-shift/browser-smoke.cjs
   Playwright-core with local Chromium; does not require a running production site. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
const fs=require("node:fs");
const PORT=process.env.PORT||8787;
const possible=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium", "/opt/google/chrome/chrome"].filter(Boolean);
const executablePath=possible.find(p=>fs.existsSync(p));
if(!executablePath)throw Error("Chromium/Chrome executable not found");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{Math.random=()=>.32;});
  const response=await page.goto("http://127.0.0.1:"+PORT+"/santas-sorting-shift/",{waitUntil:"domcontentloaded"});
  assert.equal(response.status(),200);
  await page.locator("#world").waitFor({state:"visible"});
  assert.match(await page.title(),/Sorting Shift/);
  assert.equal(await page.locator("#overlay").isVisible(),true);
  await page.screenshot({path:"santas-sorting-shift/preview-menu.png",fullPage:true});
  await page.locator("#primaryButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),false);
  await page.waitForTimeout(1450);
  const box=await page.locator("#world").boundingBox();
  assert.ok(box&&box.width>260);
  const x=n=>box.x+n*box.width/360,y=n=>box.y+n*box.height/540;
  // With the seeded RNG, the first present is red/green/blue but always a gift.
  // It spawns at 0.42s and is near x=37 at 1.45s.
  await page.mouse.move(x(36),y(261));
  await page.mouse.down();
  await page.mouse.move(x(70),y(405),{steps:13});
  await page.mouse.up();
  await page.waitForTimeout(180);
  const after=Number((await page.locator("#score").innerText()).replace(/\D/g,""));
  assert.ok(after>=100,"Expected a correct gift drop to score >= 100, got "+after);
  assert.match(await page.locator("#progressLabel").innerText(),/1 \/ 11/);
  await page.screenshot({path:"santas-sorting-shift/preview-playing.png",fullPage:true});
  await page.locator("#pauseButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),true);
  assert.match(await page.locator("#overlayTitle").innerText(),/PAUSED/);
  const beforePause=await page.locator("#timer").innerText();
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#timer").innerText(),beforePause);
  await page.locator("#primaryButton").click();
  assert.equal(await page.locator("#overlay").isVisible(),false);
  assert.deepEqual(errors,[],"No uncaught browser errors");
  const layout=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    stageBottom:document.querySelector(".playboard").getBoundingClientRect().bottom,
    screenHeight:window.innerHeight
  }));
  assert.ok(layout.width<=layout.viewport+2,"Unexpected horizontal scrolling");
  assert.ok(layout.stageBottom<=layout.screenHeight,"The main playfield should fit on screen");
  console.log("PASS: launched mobile viewport, visible GameBox art, drag gift to bin, score, pause, resume, no page errors",layout);
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
