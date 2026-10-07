(()=>{"use strict";
const KEY="gamebox_pipeworks_v1",D=["N","E","S","W"],DR=[-1,0,1,0],DC=[0,1,0,-1],OP={N:"S",E:"W",S:"N",W:"E"};
const packs=[
{id:"classic",name:"Classic Pipes",desc:"Pure rotate-and-connect puzzles.",unlock:0,count:50,mode:"classic"},
{id:"junctions",name:"Junction Works",desc:"Tees, branches and misleading routes.",unlock:12,count:50,mode:"junctions"},
{id:"locked",name:"Locked Lines",desc:"Some correctly placed pipes cannot move.",unlock:35,count:50,mode:"locked"},
{id:"rush",name:"Pressure Rush",desc:"Restore the line before pressure drops.",unlock:70,count:50,mode:"rush"}];
const fresh={coins:150,xp:0,stars:0,sound:true,lastReward:"",completed:{},lastPack:"classic",lastLevel:1};
let s=load(),pack=packs[0],level=1,tiles=[],size=5,sourcePort=null,targetPort=null,turns=0,timer=0,timerMax=0,timerId=null,daily=false,started=0,won=false,flowWinTimer=null,firstTurnShown=false;
const WATER_STEP_MS=210,WATER_SEGMENT_MS=760;
const q=x=>document.querySelector(x),qa=x=>Array.from(document.querySelectorAll(x));
function load(){try{return Object.assign({},fresh,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){return Object.assign({},fresh)}}
function save(){localStorage.setItem(KEY,JSON.stringify(s));syncCoins()}
function rng(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296}}
function hash(v){let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function today(){return new Date().toISOString().slice(0,10)}
function key(id,n){return id+":"+n}
function stars(id,n){return(s.completed[key(id,n)]||{}).stars||0}
function packDone(p){let n=0;for(let i=1;i<=p.count;i++)if(stars(p.id,i))n++;return n}
function totalDone(){return Object.keys(s.completed||{}).filter(k=>k.indexOf("daily:")!==0).length}
function view(id){qa(".view").forEach(v=>v.classList.toggle("active",v.id===id));scrollTo(0,0)}
function syncCoins(){qa("[data-coins]").forEach(e=>e.textContent=s.coins)}
function toast(t){let e=q("#toast");e.textContent=t;e.classList.add("show");clearTimeout(e.x);e.x=setTimeout(()=>e.classList.remove("show"),1800)}
function beep(f,d){if(!s.sound)return;try{let A=window.AudioContext||window.webkitAudioContext,c=beep.c||(beep.c=new A),o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.value=f;g.gain.setValueAtTime(.025,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}catch(e){}}
function haptic(ms=8){try{if(navigator.vibrate)navigator.vibrate(ms)}catch(e){}}
function packIcon(id){
 const paths={classic:'<path d="M2 6h12v4H2z"/><rect x="6" y="3" width="4" height="10"/>',junctions:'<rect x="6" y="1" width="4" height="14"/><rect x="1" y="6" width="14" height="4"/>',locked:'<rect x="3" y="7" width="10" height="7"/><path d="M5 7V5a3 3 0 0 1 6 0v2H9V5a1 1 0 0 0-2 0v2z"/>',rush:'<path d="M7 1h2v2H7zM5 3h6v2H5zM3 5h10v9H3z"/><path d="M8 7v4l3 1" stroke="#ffc431" stroke-width="2" fill="none"/>'};
 return '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="#b7c8cb" shape-rendering="crispEdges">'+paths[id]+'</g></svg>'
}
function home(){syncCoins();q("#statLevel").textContent=totalDone()+1;q("#statXp").textContent=s.xp;q("#statStars").textContent=s.stars;let p=packs.find(x=>x.id===s.lastPack)||packs[0];q("#continue").textContent="PLAY "+p.name.toUpperCase()+" · "+Math.min(s.lastLevel,p.count);let claimed=s.lastReward===today();q("#reward").classList.toggle("claimed",claimed);q("#rewardText").textContent=claimed?"Reward claimed. Back tomorrow.":"Claim 50 coins today.";q("#sound").textContent="SOUND: "+(s.sound?"ON":"OFF");let box=q("#packs");box.innerHTML="";packs.forEach(p=>{let open=s.stars>=p.unlock,b=document.createElement("button");b.className="packButton"+(open?"":" locked");b.innerHTML='<span class="packIcon">'+packIcon(p.id)+'</span><span><b>'+p.name+'</b><small>'+(open?p.desc:"Unlock at "+p.unlock+" stars")+'</small></span><span class="packCount">'+packDone(p)+"/"+p.count+"</span>";b.onclick=()=>open?openPack(p):toast("EARN "+p.unlock+" STARS TO UNLOCK");box.appendChild(b)})}
function openPack(p){pack=p;s.lastPack=p.id;save();q("#packBanner").innerHTML="<h2>"+p.name+"</h2><p>"+p.desc+"</p>";levels();view("pack")}
function levels(){syncCoins();let box=q("#levels");box.innerHTML="";let max=Math.min(pack.count,Math.max(1,packDone(pack)+1));for(let i=1;i<=pack.count;i++){let st=stars(pack.id,i),open=i<=max,b=document.createElement("button");b.className="level"+(st?" done":"")+(open?"":" locked")+(open&&!st&&i===max?" current":"");b.innerHTML=i+"<small>"+(st?"★".repeat(st):"")+"</small>";b.onclick=()=>{if(open)start(pack,i)};box.appendChild(b)}}
function rot(d,r){return D[(D.indexOf(d)+r+4)%4]}
function con(t){return t.base.map(d=>rot(d,t.rot))}
function generate(seed,p,n){
 let R=rng(seed);size=5;
 let cells=size*size,path=[],r=Math.floor(R()*size),c=0;
 path.push(r*size);
 for(c=0;c<size-1;c++){
   let nr=Math.floor(R()*size),limit=2;
   if(Math.abs(nr-r)>limit)nr=r+(nr>r?limit:-limit);
   nr=Math.max(0,Math.min(size-1,nr));
   while(r!==nr){r+=nr>r?1:-1;path.push(r*size+c)}
   path.push(r*size+c+1)
 }
 sourcePort={cell:path[0],side:"W"};targetPort={cell:path[path.length-1],side:"E"};
 let links=Array.from({length:cells},()=>[]);
 for(let i=0;i<path.length;i++){
   let idx=path[i],rr=Math.floor(idx/size),cc=idx%size;
   if(i===0)links[idx].push("W");if(i===path.length-1)links[idx].push("E");
   if(i){let z=path[i-1],zr=Math.floor(z/size),zc=z%size;links[idx].push(rr<zr?"S":rr>zr?"N":cc<zc?"E":"W")}
   if(i<path.length-1){let z=path[i+1],zr=Math.floor(z/size),zc=z%size;links[idx].push(rr<zr?"S":rr>zr?"N":cc<zc?"E":"W")}
 }
 let set=new Set(path),simple=[["N","S"],["E","W"],["N","E"],["E","S"],["S","W"],["W","N"],["N"],["E"],["S"],["W"]],busy=simple.concat([["N","E","S"],["E","S","W"],["S","W","N"],["W","N","E"]]);
 tiles=[];
 for(let i=0;i<cells;i++){
   let on=set.has(i),pool=p.mode==="classic"?simple:busy,base=on?Array.from(new Set(links[i])):pool[Math.floor(R()*pool.length)].slice(),locked=false,rn=Math.floor(R()*4);
   if(p.mode==="locked"&&on&&R()<.18){rn=0;locked=true}
   tiles.push({base,rot:rn,on,locked})
 }
 let wrong=tiles.filter(t=>t.on&&!t.locked&&t.rot!==0).length;
 if(wrong<3){for(let t of tiles){if(t.on&&!t.locked&&t.rot===0){t.rot=1+Math.floor(R()*3);wrong++;if(wrong>=3)break}}}
}
function edgeXY(d){return d==="N"?[50,0]:d==="E"?[100,50]:d==="S"?[50,100]:[0,50]}
function routeD(a,b){let A=edgeXY(a);if(!b)return "M"+A[0]+" "+A[1]+" L50 50";let B=edgeXY(b);if(OP[a]===b)return "M"+A[0]+" "+A[1]+" L"+B[0]+" "+B[1];return "M"+A[0]+" "+A[1]+" L50 50 L"+B[0]+" "+B[1]}
function branchRect(d,outer){let a=outer?5:6,b=outer?6:4;return d==="N"?`<rect x="${a}" y="0" width="${b}" height="8"/>`:d==="E"?`<rect x="8" y="${a}" width="8" height="${b}"/>`:d==="S"?`<rect x="${a}" y="8" width="${b}" height="8"/>`:`<rect x="0" y="${a}" width="8" height="${b}"/>`}
function branchHighlight(d){return d==="N"?'<rect x="7" y="0" width="1" height="8"/>':d==="E"?'<rect x="8" y="7" width="8" height="1"/>':d==="S"?'<rect x="7" y="8" width="1" height="8"/>':'<rect x="0" y="7" width="8" height="1"/>'}
function collar16(d){if(d==="N")return '<rect x="4" y="0" width="8" height="2" fill="#22373d"/><rect x="5" y="0" width="6" height="1" fill="#b7c9cc"/>';if(d==="E")return '<rect x="14" y="4" width="2" height="8" fill="#22373d"/><rect x="15" y="5" width="1" height="6" fill="#b7c9cc"/>';if(d==="S")return '<rect x="4" y="14" width="8" height="2" fill="#22373d"/><rect x="5" y="15" width="6" height="1" fill="#b7c9cc"/>';return '<rect x="0" y="4" width="2" height="8" fill="#22373d"/><rect x="0" y="5" width="1" height="6" fill="#b7c9cc"/>'}
function pipeSvg(t){
 let b=t.base,outer=b.map(d=>branchRect(d,true)).join(""),inner=b.map(d=>branchRect(d,false)).join(""),hi=b.map(branchHighlight).join("");
 let hub=b.length>=3?'<rect x="5" y="5" width="6" height="6" fill="#263b41"/><rect x="6" y="6" width="4" height="4" fill="#82979b"/><rect x="6" y="6" width="2" height="1" fill="#c9d7d9"/><rect x="6" y="6" width="1" height="1" fill="#15282e"/><rect x="9" y="9" width="1" height="1" fill="#15282e"/>':'<rect x="5" y="5" width="6" height="6" fill="#263b41"/><rect x="6" y="6" width="4" height="4" fill="#82979b"/><rect x="7" y="6" width="1" height="4" fill="#c9d7d9"/>';
 if(b.length===1)hub+='<rect x="6" y="10" width="4" height="2" fill="#24373d"/>';
 return '<svg class="pipeArt" viewBox="0 0 16 16" aria-hidden="true"><g fill="#1b2c32">'+outer+'</g><g fill="#6f858a">'+inner+'</g><g fill="#bacacc" opacity=".95">'+hi+'</g>'+hub+b.map(collar16).join("")+'</svg>'
}
function renderPorts(){let board=q("#board"),sTile=board.querySelector('[data-i="'+sourcePort.cell+'"]'),tTile=board.querySelector('[data-i="'+targetPort.cell+'"]');if(!sTile||!tTile)return;q("#sourcePort").style.setProperty("--portTop",(board.offsetTop+sTile.offsetTop+sTile.offsetHeight/2)+"px");q("#targetPort").style.setProperty("--portTop",(board.offsetTop+tTile.offsetTop+tTile.offsetHeight/2)+"px")}
function draw(){let b=q("#board");b.innerHTML="";tiles.forEach((t,i)=>{let e=document.createElement("button");e.className="tile"+(t.locked?" locked":"");e.dataset.i=i;e.style.setProperty("--rot",t.rot);e.setAttribute("aria-label","Rotate pipe "+(i+1));e.innerHTML=pipeSvg(t)+'<svg class="waterOverlay" viewBox="0 0 100 100" aria-hidden="true"></svg>';e.onclick=()=>turn(i,e);b.appendChild(e)});requestAnimationFrame(renderPorts);updateFlowUi(flow())}
function floodInfo(){let dist=new Map(),parent=new Map(),list=[],start=sourcePort.cell;if(!con(tiles[start]).includes(sourcePort.side))return{dist,parent,success:false};dist.set(start,0);parent.set(start,{prev:null,from:sourcePort.side});list.push(start);while(list.length){let i=list.shift(),r=Math.floor(i/size),c=i%size;for(let d of con(tiles[i])){let x=D.indexOf(d),nr=r+DR[x],nc=c+DC[x];if(nr<0||nr>=size||nc<0||nc>=size)continue;let ni=nr*size+nc;if(!con(tiles[ni]).includes(OP[d]))continue;if(!dist.has(ni)){dist.set(ni,dist.get(i)+1);parent.set(ni,{prev:i,from:OP[d]});list.push(ni)}}}let success=dist.has(targetPort.cell)&&con(tiles[targetPort.cell]).includes(targetPort.side);return{dist,parent,success}}
function connectedExit(i,d,info){if(i===targetPort.cell&&d===targetPort.side)return info.success;let r=Math.floor(i/size),c=i%size,x=D.indexOf(d),nr=r+DR[x],nc=c+DC[x];if(nr<0||nr>=size||nc<0||nc>=size)return false;let ni=nr*size+nc;return info.dist.has(ni)&&con(tiles[ni]).includes(OP[d])}
function waterStroke(svg,d,delay){let p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",d);p.setAttribute("pathLength","100");p.setAttribute("class","waterRoute");p.style.animationDelay=delay+"ms";svg.appendChild(p);let shine=document.createElementNS("http://www.w3.org/2000/svg","path");shine.setAttribute("d",d);shine.setAttribute("pathLength","100");shine.setAttribute("class","waterShine");shine.style.animationDelay=(delay+60)+"ms";svg.appendChild(shine)}
function flow(){let info=floodInfo();q("#sourcePort").classList.toggle("live",info.dist.has(sourcePort.cell));q("#targetPort").classList.remove("reached");qa(".tile").forEach((e,i)=>{let overlay=e.querySelector(".waterOverlay");overlay.innerHTML="";if(!info.dist.has(i))return;let entry=info.parent.get(i).from,exits=con(tiles[i]).filter(d=>d!==entry&&connectedExit(i,d,info)),delay=info.dist.get(i)*WATER_STEP_MS;if(exits.length)exits.forEach(d=>waterStroke(overlay,routeD(entry,d),delay));else waterStroke(overlay,routeD(entry,null),delay)});if(info.success){let endDelay=info.dist.get(targetPort.cell)*WATER_STEP_MS+WATER_SEGMENT_MS;setTimeout(()=>{if(floodInfo().success)q("#targetPort").classList.add("reached")},endDelay)}return info}
function updateFlowUi(info){if(!info)info=floodInfo();let connected=info.dist.size,pct=Math.max(8,Math.min(100,Math.round(connected/(size*1.35)*100))),fill=q("#pressureFill"),txt=q("#pressureText");if(timerMax>0){pct=Math.max(0,Math.round(timer/timerMax*100));txt.textContent=timer<=15?"LOW":timer<=Math.round(timerMax*.45)?"FALLING":"STABLE";fill.classList.toggle("low",timer<=15)}else{txt.textContent=info.success?"OPEN":connected>0?"BUILDING":"READY";fill.classList.remove("low")}fill.style.width=pct+"%"}
function queueFinish(info){clearTimeout(flowWinTimer);if(!info.success)return;let delay=info.dist.get(targetPort.cell)*WATER_STEP_MS+WATER_SEGMENT_MS+120;flowWinTimer=setTimeout(()=>{if(!won&&floodInfo().success)finish()},delay)}
function turn(i,e){if(won||tiles[i].locked)return;clearTimeout(flowWinTimer);tiles[i].rot=(tiles[i].rot+1)%4;turns++;q("#turns").textContent=turns;e.style.setProperty("--rot",tiles[i].rot);e.classList.add("turning");setTimeout(()=>e.classList.remove("turning"),170);if(!firstTurnShown){q("#firstHint").classList.add("hide");firstTurnShown=true}beep(330,.035);haptic();let info=flow();updateFlowUi(info);queueFinish(info)}
function start(p,n,opt){opt=opt||{};clearInterval(timerId);clearTimeout(flowWinTimer);won=false;firstTurnShown=false;q("#firstHint").classList.remove("hide");q("#targetPort").classList.remove("reached");daily=!!opt.daily;pack=p;level=n;turns=0;started=Date.now();q("#turns").textContent=0;generate(daily?opt.seed:hash(p.id+"|"+n+"|pipeworks"),p,n);q("#gamePack").textContent=daily?"Daily Challenge":p.name;q("#gameLevel").textContent=daily?today():"Level "+n;timerMax=0;timer=0;let timed=p.mode==="rush"||daily;q("#timerBox").hidden=!timed;q("#timerBox").classList.remove("danger");if(timed){timer=daily?95:Math.max(45,85-Math.floor(n/3));timerMax=timer;q("#timer").textContent=timer}draw();syncCoins();view("game");requestAnimationFrame(renderPorts);if(timed){timerId=setInterval(()=>{timer--;q("#timer").textContent=timer;q("#timerBox").classList.toggle("danger",timer<=15);updateFlowUi();if(timer<=0){clearInterval(timerId);toast("PRESSURE LOST · FINISH FOR 1 STAR")}},1000)}}
function spend(n){if(s.coins<n){toast("NEED "+n+" COINS");return false}s.coins-=n;save();return true}
function fix(count,cost){if(won||!spend(cost))return;clearTimeout(flowWinTimer);let wrong=tiles.map((t,i)=>({t,i})).filter(x=>x.t.on&&!x.t.locked&&x.t.rot!==0);if(!wrong.length){s.coins+=cost;save();toast("MAIN ROUTE ALIGNED · CHECK JOINS");return}wrong.slice(0,count).forEach(x=>{x.t.rot=0;let e=q('.tile[data-i="'+x.i+'"]');e.style.setProperty("--rot",0);e.classList.add("hint");setTimeout(()=>e.classList.remove("hint"),1300)});beep(760,.08);haptic(16);let info=flow();updateFlowUi(info);queueFinish(info)}
function finish(){if(won)return;won=true;clearInterval(timerId);beep(580,.08);setTimeout(()=>beep(780,.1),90);haptic(35);let st=3,ideal=size*size*.9;if(turns>ideal)st--;if(turns>ideal*1.55)st--;if(pack.mode==="rush"&&timer<=0)st=Math.min(st,1);if(daily)st=3;st=Math.max(1,st);let coins=daily?75:15+st*5,xp=daily?35:10+level+st*3,awardCoins=coins,awardXp=xp;if(daily){let k="daily:"+today();if(!s.completed[k]){s.completed[k]={stars:3};s.coins+=coins;s.xp+=xp}else{awardCoins=0;awardXp=0}}else{let k=key(pack.id,level),old=(s.completed[k]||{}).stars||0;if(st>old){s.stars+=st-old;s.completed[k]={stars:st,turns};s.coins+=coins;s.xp+=xp}else{awardCoins=5;awardXp=3;s.coins+=5;s.xp+=3}s.lastPack=pack.id;s.lastLevel=Math.min(pack.count,level+1)}save();q("#winStars").innerHTML=[1,2,3].map(n=>'<span class="'+(n<=st?"on":"")+'">★</span>').join(" ");q("#wonCoins").textContent=awardCoins;q("#wonXp").textContent=awardXp;q("#next").textContent=daily?"BACK HOME":level>=pack.count?"PACK COMPLETE":"NEXT LEVEL";q("#win").classList.add("show")}
function closeWin(){q("#win").classList.remove("show")}
q("#continue").onclick=()=>{let p=packs.find(x=>x.id===s.lastPack)||packs[0];start(p,Math.min(s.lastLevel,p.count))};
q("#reward").onclick=()=>{let d=today();if(s.lastReward===d)return toast("REWARD ALREADY CLAIMED");s.lastReward=d;s.coins+=50;save();home();beep(820,.1);toast("+50 COINS")};
q("#daily").onclick=()=>start(packs[3],1,{daily:true,seed:hash(today()+"|pipeworks-daily")});
q("#sound").onclick=()=>{s.sound=!s.sound;save();home()};
qa("[data-home]").forEach(b=>b.onclick=()=>{home();view("home")});
q("#gameBack").onclick=()=>{clearInterval(timerId);clearTimeout(flowWinTimer);if(daily){home();view("home")}else{levels();view("pack")}};
q("#hint").onclick=()=>fix(1,25);q("#fix3").onclick=()=>fix(3,50);
q("#next").onclick=()=>{closeWin();if(daily){home();view("home")}else if(level>=pack.count)openPack(pack);else start(pack,level+1)};
window.addEventListener("resize",renderPorts);
q("#levelSelect").onclick=()=>{closeWin();if(daily){home();view("home")}else{levels();view("pack")}};
home();
})();
