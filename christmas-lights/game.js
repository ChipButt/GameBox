(()=>{"use strict";
const KEY="gamebox_christmas_lights_v2",D=["N","E","S","W"],DR=[-1,0,1,0],DC=[0,1,0,-1],OP={N:"S",E:"W",S:"N",W:"E"};
const TREE_MASK=[
[0,0,0,1,0,0,0],
[0,0,1,1,1,0,0],
[0,1,1,1,1,1,0],
[0,0,1,1,1,0,0],
[0,1,1,1,1,1,0],
[1,1,1,1,1,1,1],
[0,0,0,1,0,0,0]
];
const SIZE=7,SOURCE=6*SIZE+3,TARGET=3;
const ACTIVE=[];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(TREE_MASK[r][c])ACTIVE.push(r*SIZE+c);
const ACTIVE_SET=new Set(ACTIVE);
const packs=[
{id:"classic",name:"Classic Lights",icon:"💡",desc:"Build a clean circuit from the plug to the star.",unlock:0,count:50,mode:"classic"},
{id:"garland",name:"Garland Tangles",icon:"🎄",desc:"More junction pieces and convincing dead ends.",unlock:12,count:50,mode:"junctions"},
{id:"frozen",name:"Frozen Cables",icon:"❄️",desc:"Some correctly placed strings are frozen in place.",unlock:35,count:50,mode:"locked"},
{id:"rush",name:"Festive Rush",icon:"⏱",desc:"Build and test the tree before the countdown ends.",unlock:70,count:50,mode:"rush"}
];
const fresh={sparks:150,xp:0,stars:0,sound:true,lastReward:"",completed:{},lastPack:"classic",lastLevel:1};
const BULBS=["#e14b48","#f1c33f","#48c879","#4bb9ec","#dc6bd4"];
const USER_LIGHT_ASSETS={straight:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABxUlEQVR4AeyUMU7DUBBEN65BFFwgBRwC0VJwB87HHShoUQ4BRS5AgaAP8xKN//fajrEAISRbO94/uzP+6y/LTfzxtQywnMByAv/nBG6ebnff+WWM+dsT0NMVw1vY7DysGq/a51wr9wNoZ0WEboq6HZFNmVsto8Ks5KzPvJFLUQwiisK/spJBMfwCU/79CRwTPV4/rOp+5tpZURQiisKzPvNGT1cUg4iicFY2OVObA/uca+/+BLSjIkI3RfSui/XVbnv3FuQMGRTFIqKInrb2F3VE4wderq9akwXuvX+8xhjQ4MWziljBwZieOn2joZDhpuuh6/TkPDJUbgdjCHy1h/4xD9qmFmAANABr91m/bDcr8LzdQNuBIOgBa3vIcDyANbUaDQ0w1ERInT5grU9cEcEQrqGrgY6eAQfm9sL3H2HdpLi+PwuyQR9oZwWrA0R21tQZ/0HRv+Oh6twOQBH4T+VMbQ7sc6693tQ1eGeAbMqcr9xmcuZZnzmejM4AuTnEvanzkGaslj3wzgD5T5W5H4zR6zpnfeZo7XXuDIDAJmdqc2Cf85DXm9PrDUDxmJn+FOb4BweY2uAn+8sAywn8+glMfbCfAAAA//9aBqvGAAAABklEQVQDAB0URVDpWwU0AAAAAElFTkSuQmCC",dead:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABo0lEQVR4AeyUO07DQBiEN1uDKLhACjhEREvBHTgfd6CgRTkEFLkABYLezGc03vVmY5uHg5BszWT/+d9ZOYnhj59lgeUGlhv4Pzdw/XjTzPGX0d2Augv1ER7us571PW+7gCYLIehD6Dcqh5ba2SoUrKafUVVCKpAQkp5iqUCof4Gx+vYGhpIeru5XebzUmiykDAkh6TErqruQ0iSEpLE81Ce+32J7A5oohKAPIew9F+tNs7t9DZwlVSCkEgkh6TEruuHletMNcJFjb+8v4RDJoZYaTRawpjPWGtMUOka705PzUBK/c1iCGnyQXwvEHmLMmzrRTdGOYz/vtiv4tNsiu4UQrmGJfHBuk1cy0hAS8LD8xE8cYusVF0JgCfucT3x9d8bR49AS7UtINs1MmtjmJA41WcD6pERDHOJhkdovpeYjH3YLIKC39YlvClkCkpsPzG1iJXsLlENLrVdcSC0khKRzi8Ew99Xs3gK1hNKniUI4+J8Rvvj0Fig3LrV7awPB6mdnbwFaeahPfHNybwGGHWs4s6oLEDgWlwWWG5j9BsZe5g8AAAD///r8/H4AAAAGSURBVAMAVxneQe0vXR0AAAAASUVORK5CYII=",corner:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACSUlEQVR4AeyVPU7kQBCFG8e72mBX2nSCZe+ASAm4A+fjDgSkiENAMBcgQJCb+ux5PW+Ktj2GDDHq53r1uv7U/pmufOL3b3PW//3zv8d6mb6UHrg2xT81gBfVEN7Yucc6Xz3Axd1lD7zIy+vT4LYatrQheHdZNYA3Fv/54/euVCmnm7PKRU5KiVUmf0cPoIZeaXP9q7o6hegWa5SDxBr51PXoAW7Pb94Vk+anQKMIPAHwJRw9AIXU0Pnj9j56oYzQwzh6y9dVA1COIQA8Q7fBdW4dcM356gE8WZxT8NugU/DGzpWHrQMsvS4EZ5ADXNcptBq2tGEAFZH1gvBWoseK+ym0blNL65RMI5B9NZdtxaA9bO8xB/CGzj1oOAEXnHtTdPnx2MdC2SOEWHtfjMZAfrZdZMXay+HE2vtTLIJijbtBYo187XU4gciOVfhmDrbsfnny7Edw/eDoyd+lVsMtBVVIpCMRnMZ3HCsoTk1lpbes3gDteWPn2sd2JGWwoUGw26vngkV3oAnS9Sa0Gra0jgQHhfJA+OhqJovGnoAP+DBxe+COltYRLBDsw4ijq0m27CkOiy94Q+faxw4PIQQwCH+xWAGdwnMgljgs+XCBxkB+tgcD6D2XJZiiDj447sMVpzxZ9CXUAXJS9imkh0gWTcjx2VdctnWAvJH93DT7Of5Yvw6Q3/PsLxXM8dmfyq8DEKAkWTQhP0jZJ055smhLOBiA4LlkNZUlPmMuP8fivxsAcQ5zzefypvZWDzBV6KP69wBf/wSWno03AAAA///7PYhoAAAABklEQVQDAB4iQVC/ZPb8AAAAAElFTkSuQmCC"};
let s=load(),pack=packs[0],level=1,tiles=Array(SIZE*SIZE).fill(null),turns=0,timer=0,timerId=null,daily=false,won=false,testing=false,initialRotations=[],fxTimers=[],testTimers=[];
const POWER_STEP=170,POWER_SEGMENT=720;
const q=x=>document.querySelector(x),qa=x=>Array.from(document.querySelectorAll(x));
function load(){try{return Object.assign({},fresh,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){return Object.assign({},fresh)}}
function save(){localStorage.setItem(KEY,JSON.stringify(s));syncSparks()}
function rng(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296}}
function hash(v){let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function today(){return new Date().toISOString().slice(0,10)}
function key(id,n){return id+":"+n}
function stars(id,n){return(s.completed[key(id,n)]||{}).stars||0}
function packDone(p){let n=0;for(let i=1;i<=p.count;i++)if(stars(p.id,i))n++;return n}
function totalDone(){return Object.keys(s.completed||{}).filter(k=>!k.startsWith("daily:")).length}
function view(id){qa(".view").forEach(v=>v.classList.toggle("active",v.id===id));scrollTo(0,0)}
function syncSparks(){qa("[data-sparks]").forEach(e=>e.textContent=s.sparks)}
function toast(t){let e=q("#toast");e.textContent=t;e.classList.add("show");clearTimeout(e.x);e.x=setTimeout(()=>e.classList.remove("show"),1800)}
function tone(f,d,type="square",gain=.025){if(!s.sound)return;try{let A=window.AudioContext||window.webkitAudioContext,c=tone.c||(tone.c=new A),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(gain,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}catch(e){}}
function clearTimers(list){list.forEach(clearTimeout);list.length=0}
function home(){
 syncSparks();q("#statLevel").textContent=totalDone()+1;q("#statXp").textContent=s.xp;q("#statStars").textContent=s.stars;
 let p=packs.find(x=>x.id===s.lastPack)||packs[0];q("#continue").textContent="Play "+p.name+" · "+Math.min(s.lastLevel,p.count);
 let claimed=s.lastReward===today();q("#reward").classList.toggle("claimed",claimed);q("#rewardText").textContent=claimed?"Gift claimed. Come back tomorrow.":"Claim 50 sparks today.";q("#sound").textContent="Sound: "+(s.sound?"On":"Off");
 let box=q("#packs");box.innerHTML="";
 packs.forEach(p=>{let open=s.stars>=p.unlock,b=document.createElement("button");b.className="packButton"+(open?"":" locked");b.innerHTML='<span class="packIcon">'+p.icon+'</span><span><b>'+p.name+'</b><small>'+(open?p.desc:"Unlock at "+p.unlock+" stars")+'</small></span><span class="packCount">'+packDone(p)+"/"+p.count+"</span>";b.onclick=()=>open?openPack(p):toast("Earn "+p.unlock+" stars to unlock this set");box.appendChild(b)})
}
function openPack(p){pack=p;s.lastPack=p.id;save();q("#packBanner").innerHTML="<h2>"+p.icon+" "+p.name+"</h2><p>"+p.desc+"</p>";levels();view("pack")}
function levels(){syncSparks();let box=q("#levels");box.innerHTML="";let max=Math.min(pack.count,Math.max(1,packDone(pack)+1));for(let i=1;i<=pack.count;i++){let st=stars(pack.id,i),open=i<=max,b=document.createElement("button");b.className="level"+(st?" done":"")+(open?"":" locked");b.innerHTML=i+"<small>"+(st?"★".repeat(st):"")+"</small>";b.onclick=()=>{if(open)start(pack,i)};box.appendChild(b)}}
function rot(d,r){return D[(D.indexOf(d)+r+4)%4]}
function con(t){return t.base.map(d=>rot(d,t.rot))}
function rc(i){return[Math.floor(i/SIZE),i%SIZE]}
function idx(r,c){return r*SIZE+c}
function active(r,c){return r>=0&&r<SIZE&&c>=0&&c<SIZE&&!!TREE_MASK[r][c]}
function dirBetween(a,b){let A=rc(a),B=rc(b);if(B[0]<A[0])return"N";if(B[0]>A[0])return"S";if(B[1]>A[1])return"E";return"W"}
function generate(seed,p,n){
 let R=rng(seed),path=[SOURCE],curC=3;
 for(let r=5;r>=0;r--){
   path.push(idx(r,curC));
   if(r===0)break;
   let candidates=[];for(let c=0;c<SIZE;c++)if(active(r,c)&&active(r-1,c))candidates.push(c);
   let nextC=r===1?3:candidates[Math.floor(R()*candidates.length)];
   while(curC!==nextC){curC+=curC<nextC?1:-1;path.push(idx(r,curC))}
 }
 let links=Array.from({length:SIZE*SIZE},()=>[]);
 for(let i=0;i<path.length;i++){
   let cell=path[i];
   if(i===0)links[cell].push("S");
   if(i===path.length-1)links[cell].push("N");
   if(i>0)links[cell].push(OP[dirBetween(path[i-1],cell)]);
   if(i<path.length-1)links[cell].push(dirBetween(cell,path[i+1]))
 }
 let pathSet=new Set(path),simple=[["N","S"],["E","W"],["N","E"],["E","S"],["S","W"],["W","N"],["N","S"],["E","W"],["N","E"],["E","S"],["S","W"],["W","N"],["N"],["E"],["S"],["W"]],busy=simple.concat([["N","E","S"],["E","S","W"],["S","W","N"],["W","N","E"],["N","E","S","W"]]);
 tiles=Array(SIZE*SIZE).fill(null);
 ACTIVE.forEach((cell,k)=>{
   let on=pathSet.has(cell),pool=p.mode==="classic"?simple:busy,base=on?Array.from(new Set(links[cell])):pool[Math.floor(R()*pool.length)].slice();
   let locked=false,rn=Math.floor(R()*4);
   if(p.mode==="locked"&&on&&cell!==SOURCE&&cell!==TARGET&&R()<.18){rn=0;locked=true}
   tiles[cell]={base,rot:rn,on,locked,bulb:BULBS[(k+n)%BULBS.length]}
 });
 let wrong=ACTIVE.map(i=>tiles[i]).filter(t=>t.on&&!t.locked&&t.rot!==0).length;
 if(wrong<4){for(let cell of path){let t=tiles[cell];if(t&&!t.locked&&t.rot===0){t.rot=1+Math.floor(R()*3);if(++wrong>=4)break}}}
 initialRotations=tiles.map(t=>t?t.rot:null)
}
function edgeXY(d){return d==="N"?[16,0]:d==="E"?[32,16]:d==="S"?[16,32]:[0,16]}
function routeD(a,b){let A=edgeXY(a);if(!b)return"M"+A[0]+" "+A[1]+" L16 16";let B=edgeXY(b);if(OP[a]===b)return"M"+A[0]+" "+A[1]+" L"+B[0]+" "+B[1];return"M"+A[0]+" "+A[1]+" L16 16 L"+B[0]+" "+B[1]}
function shapeInfo(base){
 const b=[...base].sort((a,z)=>D.indexOf(a)-D.indexOf(z));
 if(b.length===1){const a={W:0,N:90,E:180,S:270}[b[0]];return{kind:"dead",angle:a,layers:[{src:USER_LIGHT_ASSETS.dead}]}}
 if(b.length===2&&b.includes("N")&&b.includes("S"))return{kind:"straight",angle:90,layers:[{src:USER_LIGHT_ASSETS.straight}]};
 if(b.length===2&&b.includes("E")&&b.includes("W"))return{kind:"straight",angle:0,layers:[{src:USER_LIGHT_ASSETS.straight}]};
 if(b.length===2){
   const key=b.join("");
   const angles={NW:0,EN:90,ES:180,SW:270,NE:90,SE:180,WS:270,WN:0};
   return{kind:"corner",angle:angles[key]??0,layers:[{src:USER_LIGHT_ASSETS.corner}]}
 }
 if(b.length===3){
   const missing=D.find(d=>!b.includes(d));
   const angles={S:0,W:90,N:180,E:270};
   return{kind:"tee",angle:angles[missing],layers:[
     {src:USER_LIGHT_ASSETS.straight,cls:"full"},
     {src:USER_LIGHT_ASSETS.straight,cls:"vertical upper"}
   ]}
 }
 return{kind:"cross",angle:0,layers:[
   {src:USER_LIGHT_ASSETS.straight,cls:"full"},
   {src:USER_LIGHT_ASSETS.straight,cls:"vertical full"}
 ]}
}
function cableSprite(t){
 const info=shapeInfo(t.base),angle=info.angle+t.rot*90;
 const layers=info.layers.map(l=>'<img class="pixelLightLayer '+(l.cls||"")+'" src="'+l.src+'" alt="">').join("");
 return'<div class="pixelLightBundle '+info.kind+'" style="--asset-rot:'+angle+'deg">'+layers+'</div>'
}
function draw(){
 let b=q("#treeBoard");b.innerHTML="";
 for(let i=0;i<SIZE*SIZE;i++){
   if(!ACTIVE_SET.has(i)){let gap=document.createElement("div");gap.className="treeCell empty";b.appendChild(gap);continue}
   let t=tiles[i],e=document.createElement("button");e.className="treeCell"+(t.locked?" locked":"");e.dataset.i=i;e.style.setProperty("--rot",t.rot);
   e.innerHTML=cableSprite(t)+'<svg class="powerOverlay" viewBox="0 0 32 32" aria-hidden="true"></svg>';
   e.onclick=()=>turn(i,e);b.appendChild(e)
 }
 clearVisualPower()
}
function clearVisualPower(){
 q("#targetStar").classList.remove("lit");q("#plug").classList.remove("live");
 qa(".treeCell").forEach(e=>{e.classList.remove("powered");let o=e.querySelector(".powerOverlay");if(o)o.innerHTML=""})
}
function floodInfo(){
 let dist=new Map(),parent=new Map(),queue=[];
 if(!con(tiles[SOURCE]).includes("S"))return{dist,parent,success:false};
 dist.set(SOURCE,0);parent.set(SOURCE,{prev:null,from:"S"});queue.push(SOURCE);
 while(queue.length){
   let i=queue.shift(),p=rc(i);
   for(let d of con(tiles[i])){
     let k=D.indexOf(d),nr=p[0]+DR[k],nc=p[1]+DC[k];
     if(!active(nr,nc))continue;
     let ni=idx(nr,nc);if(!con(tiles[ni]).includes(OP[d]))continue;
     if(!dist.has(ni)){dist.set(ni,dist.get(i)+1);parent.set(ni,{prev:i,from:OP[d]});queue.push(ni)}
   }
 }
 return{dist,parent,success:dist.has(TARGET)&&con(tiles[TARGET]).includes("N")}
}
function childDir(i,d,info){
 if(i===TARGET&&d==="N")return info.success;
 let p=rc(i),k=D.indexOf(d),nr=p[0]+DR[k],nc=p[1]+DC[k];if(!active(nr,nc))return false;
 let ni=idx(nr,nc);return info.parent.has(ni)&&info.parent.get(ni).prev===i
}
function powerStroke(svg,d,delay){
 let p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",d);p.setAttribute("pathLength","100");p.setAttribute("class","powerRoute");p.style.animationDelay=delay+"ms";svg.appendChild(p);
 let c=document.createElementNS("http://www.w3.org/2000/svg","path");c.setAttribute("d",d);c.setAttribute("pathLength","100");c.setAttribute("class","powerCore");c.style.animationDelay=(delay+45)+"ms";svg.appendChild(c)
}
function animateTest(info){
 clearTimers(testTimers);clearVisualPower();q("#plug").classList.add("live");
 let maxDist=0,furthest=SOURCE;
 ACTIVE.forEach(i=>{
   let e=q('.treeCell[data-i="'+i+'"]');if(!e||!info.dist.has(i))return;
   let entry=info.parent.get(i).from,exits=con(tiles[i]).filter(d=>d!==entry&&childDir(i,d,info)),delay=info.dist.get(i)*POWER_STEP;
   if(info.dist.get(i)>=maxDist){maxDist=info.dist.get(i);furthest=i}
   let overlay=e.querySelector(".powerOverlay");if(exits.length)exits.forEach(d=>powerStroke(overlay,routeD(entry,d),delay));else powerStroke(overlay,routeD(entry,null),delay);
   testTimers.push(setTimeout(()=>{if(testing)e.classList.add("powered")},delay+Math.round(POWER_SEGMENT*.55)))
 });
 if(info.success){
   let d=info.dist.get(TARGET)*POWER_STEP+POWER_SEGMENT;
   testTimers.push(setTimeout(()=>{if(testing){q("#targetStar").classList.add("lit");tone(1046,.1);tone(1318,.12)}},d));
   testTimers.push(setTimeout(()=>{if(testing)finish()},d+420))
 }else{
   let d=maxDist*POWER_STEP+POWER_SEGMENT+100;
   testTimers.push(setTimeout(()=>failTest(furthest),d))
 }
}
function turn(i,e){if(testing||won||tiles[i].locked)return;tiles[i].rot=(tiles[i].rot+1)%4;turns++;q("#turns").textContent=turns;let bundle=e.querySelector(".pixelLightBundle");if(bundle)bundle.style.setProperty("--asset-rot",(shapeInfo(tiles[i].base).angle+tiles[i].rot*90)+"deg");tone(330,.035)}
function testCircuit(){
 if(testing||won)return;
 testing=true;q("#powerSwitch").disabled=true;q("#powerSwitch").classList.add("on","testing");
 tone(180,.05);setTimeout(()=>tone(250,.04),65);
 animateTest(floodInfo())
}
function resetToInitial(){
 tiles.forEach((t,i)=>{if(t&&initialRotations[i]!=null)t.rot=initialRotations[i]});
 draw();q("#powerSwitch").classList.remove("on","testing");q("#powerSwitch").disabled=false;testing=false
}
function failurePoint(cell){
 let el=q('.treeCell[data-i="'+cell+'"]')||q("#plug"),r=el.getBoundingClientRect(),spark=q("#sparkBurst");
 spark.style.left=(r.left+r.width/2)+"px";spark.style.top=(r.top+r.height/2)+"px"
}
function failTest(cell){
 if(!testing)return;clearTimers(testTimers);failurePoint(cell);
 tone(90,.16,"sawtooth",.05);setTimeout(()=>tone(55,.22,"square",.05),70);
 let fx=q("#failFx");fx.classList.add("show");setTimeout(()=>fx.classList.add("smoking"),120);
 fxTimers.push(setTimeout(()=>resetToInitial(),690));
 fxTimers.push(setTimeout(()=>{fx.classList.remove("show","smoking")},1750))
}
function start(p,n,opt){
 opt=opt||{};clearInterval(timerId);clearTimers(testTimers);clearTimers(fxTimers);testing=false;won=false;daily=!!opt.daily;pack=p;level=n;turns=0;q("#turns").textContent=0;
 q("#powerSwitch").classList.remove("on","testing");q("#powerSwitch").disabled=false;q("#failFx").classList.remove("show","smoking");
 generate(daily?opt.seed:hash(p.id+"|"+n+"|christmas-tree-lights"),p,n);
 q("#gamePack").textContent=daily?"Daily Light-Up":p.name;q("#gameLevel").textContent=daily?today():"Level "+n;draw();syncSparks();
 let timed=p.mode==="rush"||daily;q("#timerBox").hidden=!timed;q("#timerBox").classList.remove("danger");
 if(timed){timer=daily?95:Math.max(45,85-Math.floor(n/3));q("#timer").textContent=timer;timerId=setInterval(()=>{timer--;q("#timer").textContent=timer;q("#timerBox").classList.toggle("danger",timer<=15);if(timer<=0){clearInterval(timerId);toast("Time is up — finish the tree, but the time bonus is gone.")}},1000)}
 view("game")
}
function spend(n){if(s.sparks<n){toast("You need "+n+" sparks");return false}s.sparks-=n;save();return true}
function fix(count,cost){
 if(testing||won||!spend(cost))return;
 let wrong=ACTIVE.map(i=>({t:tiles[i],i})).filter(x=>x.t.on&&!x.t.locked&&x.t.rot!==0);
 if(!wrong.length){s.sparks+=cost;save();toast("The main circuit is aligned — try the switch");return}
 wrong.slice(0,count).forEach(x=>{x.t.rot=0;let e=q('.treeCell[data-i="'+x.i+'"]');let bundle=e.querySelector(".pixelLightBundle");if(bundle)bundle.style.setProperty("--asset-rot",shapeInfo(x.t.base).angle+"deg");e.classList.add("hint");setTimeout(()=>e.classList.remove("hint"),1200)});
 tone(760,.07)
}
function finish(){
 if(won)return;won=true;testing=false;clearInterval(timerId);clearTimers(testTimers);q("#powerSwitch").classList.remove("testing");q("#powerSwitch").disabled=true;
 tone(659,.08);setTimeout(()=>tone(784,.08),80);setTimeout(()=>tone(988,.12),160);
 let st=3,ideal=ACTIVE.length*.9;if(turns>ideal)st--;if(turns>ideal*1.55)st--;if(pack.mode==="rush"&&timer<=0)st=Math.min(st,1);if(daily)st=3;st=Math.max(1,st);
 let sparks=daily?75:15+st*5,xp=daily?35:10+level+st*3,awardSparks=sparks,awardXp=xp;
 if(daily){let k="daily:"+today();if(!s.completed[k]){s.completed[k]={stars:3};s.sparks+=sparks;s.xp+=xp}else{awardSparks=0;awardXp=0}}
 else{let k=key(pack.id,level),old=(s.completed[k]||{}).stars||0;if(st>old){s.stars+=st-old;s.completed[k]={stars:st,turns};s.sparks+=sparks;s.xp+=xp}else{awardSparks=5;awardXp=3;s.sparks+=5;s.xp+=3}s.lastPack=pack.id;s.lastLevel=Math.min(pack.count,level+1)}
 save();q("#winStars").innerHTML=[1,2,3].map(n=>'<span class="'+(n<=st?"on":"")+'">★</span>').join(" ");q("#wonSparks").textContent=awardSparks;q("#wonXp").textContent=awardXp;q("#next").textContent=daily?"Back Home":level>=pack.count?"Set Complete":"Next Level";q("#win").classList.add("show")
}
function closeWin(){q("#win").classList.remove("show")}
q("#continue").onclick=()=>{let p=packs.find(x=>x.id===s.lastPack)||packs[0];start(p,Math.min(s.lastLevel,p.count))};
q("#reward").onclick=()=>{let d=today();if(s.lastReward===d)return toast("Already claimed today");s.lastReward=d;s.sparks+=50;save();home();tone(880,.09);toast("+50 sparks")};
q("#daily").onclick=()=>start(packs[3],1,{daily:true,seed:hash(today()+"|christmas-tree-lights-daily")});
q("#sound").onclick=()=>{s.sound=!s.sound;save();home()};
qa("[data-home]").forEach(b=>b.onclick=()=>{home();view("home")});
q("#gameBack").onclick=()=>{clearInterval(timerId);clearTimers(testTimers);clearTimers(fxTimers);q("#failFx").classList.remove("show","smoking");if(daily){home();view("home")}else{levels();view("pack")}};
q("#powerSwitch").onclick=testCircuit;
q("#hint").onclick=()=>fix(1,25);q("#fix3").onclick=()=>fix(3,50);
q("#next").onclick=()=>{closeWin();if(daily){home();view("home")}else if(level>=pack.count)openPack(pack);else start(pack,level+1)};
q("#levelSelect").onclick=()=>{closeWin();if(daily){home();view("home")}else{levels();view("pack")}};
home();
})();