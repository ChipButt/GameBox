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
 let pathSet=new Set(path),simple=[["N","S"],["E","W"],["N","E"],["E","S"],["S","W"],["W","N"],["N"],["E"],["S"],["W"]],busy=simple.concat([["N","E","S"],["E","S","W"],["S","W","N"],["W","N","E"]]);
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
function edgeXY(d){return d==="N"?[8,0]:d==="E"?[16,8]:d==="S"?[8,16]:[0,8]}
function routeD(a,b){let A=edgeXY(a);if(!b)return"M"+A[0]+" "+A[1]+" L8 8";let B=edgeXY(b);if(OP[a]===b)return"M"+A[0]+" "+A[1]+" L"+B[0]+" "+B[1];return"M"+A[0]+" "+A[1]+" L8 8 L"+B[0]+" "+B[1]}
function cablePath(d){return'<path d="'+d+'" fill="none" stroke="#020805" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/><path d="'+d+'" fill="none" stroke="#143c28" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/><path d="'+d+'" fill="none" stroke="#4e8a62" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter"/>'}
function cableEnd(d){let p=edgeXY(d);return'<rect x="'+(p[0]-1)+'" y="'+(p[1]-1)+'" width="2" height="2" fill="#07140d"/>'}
function cableSvg(t){let b=t.base,art="";if(b.length===2)art+=cablePath(routeD(b[0],b[1]));else b.forEach(d=>art+=cablePath(routeD(d,null)));art+=b.map(cableEnd).join("");art+='<rect x="6" y="6" width="4" height="4" fill="#06130d"/><rect x="7" y="7" width="2" height="2" fill="#2e6848"/>';return'<svg class="cableArt" viewBox="0 0 16 16" aria-hidden="true">'+art+'</svg>'}
function bulbSvg(color){
 return'<svg class="bulbArt" viewBox="0 0 16 16" aria-hidden="true" style="--bulb:'+color+'">'+
 '<rect x="6" y="7" width="4" height="2" fill="#06130d"/><rect x="7" y="8" width="2" height="2" fill="#9a8a5d"/>'+
 '<path d="M5 9h6v1h1v3h-1v1h-1v1H6v-1H5v-1H4v-3h1z" fill="#07100c"/>'+
 '<path class="bulbGlow" d="M6 9h4v1h1v3h-1v1H6v-1H5v-3h1z" fill="'+color+'"/>'+
 '<rect class="bulbHighlight" x="6" y="10" width="1" height="2" fill="#fffbd6"/>'+
 '<rect x="7" y="14" width="2" height="1" fill="#08110c"/></svg>'
}
function draw(){
 let b=q("#treeBoard");b.innerHTML="";
 for(let i=0;i<SIZE*SIZE;i++){
   if(!ACTIVE_SET.has(i)){let gap=document.createElement("div");gap.className="treeCell empty";b.appendChild(gap);continue}
   let t=tiles[i],e=document.createElement("button");e.className="treeCell"+(t.locked?" locked":"");e.dataset.i=i;e.style.setProperty("--rot",t.rot);
   e.innerHTML=cableSvg(t)+bulbSvg(t.bulb)+'<svg class="powerOverlay" viewBox="0 0 16 16" aria-hidden="true"></svg>';
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
function turn(i,e){if(testing||won||tiles[i].locked)return;tiles[i].rot=(tiles[i].rot+1)%4;turns++;q("#turns").textContent=turns;e.style.setProperty("--rot",tiles[i].rot);tone(330,.035)}
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
 wrong.slice(0,count).forEach(x=>{x.t.rot=0;let e=q('.treeCell[data-i="'+x.i+'"]');e.style.setProperty("--rot",0);e.classList.add("hint");setTimeout(()=>e.classList.remove("hint"),1200)});
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