(() => {
'use strict';
const C={
 navy:'#07182d',navy2:'#0c2542',ink:'#08111d',wood:'#4a2b23',wood2:'#6d3b26',wood3:'#2c1a19',
 snow:'#f0f7ff',snow2:'#c8dcf3',snow3:'#7798c7',green:'#12523d',green2:'#1d6b4c',
 red:'#c51f2d',red2:'#7b1320',gold:'#efb23c',gold2:'#9e641f',stone:'#536f9b',stone2:'#30486d'
};
const px=(x,c,a,b,w=1,h=1)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
const poly=(x,c,p)=>{x.fillStyle=c;x.beginPath();x.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)x.lineTo(p[i][0],p[i][1]);x.closePath();x.fill()};
function snowCap(x,a,b,w){
 px(x,C.snow3,a,b+3,w,2);px(x,C.snow2,a,b+1,w,3);px(x,C.snow,a+2,b,Math.max(2,w-5),2);
}
function lamp(x,cx,cy){
 px(x,C.ink,cx-4,cy-6,8,12);px(x,C.wood3,cx-5,cy-4,10,8);px(x,C.gold2,cx-3,cy-3,6,6);
 px(x,C.gold,cx-2,cy-2,4,4);px(x,'#fff2a1',cx-1,cy-2,2,3);px(x,C.ink,cx-5,cy+4,10,2);
}
function fir(x,cx,cy,flip=1){
 const p=(dx,dy,w,h,c)=>px(x,c,cx+dx*flip-(flip<0?w:0),cy+dy,w,h);
 p(-2,0,5,4,C.green2);p(-4,3,9,5,C.green);p(-6,7,13,5,C.green);p(-8,11,17,5,C.green2);
 p(-7,14,15,4,C.green);p(-5,17,11,3,C.green2);
 p(-5,4,5,2,C.snow3);p(-6,3,7,2,C.snow);p(-7,9,8,2,C.snow2);p(-8,8,9,2,C.snow);
 p(2,6,1,1,C.gold);p(-3,12,1,1,C.red);p(4,15,1,1,C.gold);
}
function cobbles(x){
 px(x,C.stone2,8,226,128,86);
 for(let y=228;y<312;y+=9){
   let off=((y/9)|0)%2?0:6;
   for(let xx=8-off;xx<140;xx+=17){
     const w=14+(xx%3);
     px(x,C.stone,xx,y,w,7);px(x,'#6f8ab4',xx+1,y+1,w-2,2);px(x,C.stone2,xx,y+6,w,1);
     if((xx+y)%4===0)px(x,C.snow2,xx+2,y,w-6,1);
   }
 }
}
function post(x,a){
 px(x,C.wood3,a,28,9,213);px(x,C.wood2,a+2,29,5,210);px(x,C.wood,a+3,30,2,208);
 for(let y=60;y<235;y+=45){px(x,C.ink,a-1,y,11,3);px(x,C.wood2,a,y+3,9,2)}
}
function drawFrame(canvas){
 canvas.width=144;canvas.height=312;const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,144,312);
 // dark winter sky around the carved frame
 px(x,C.navy,0,0,144,312);px(x,C.navy2,0,0,144,27);
 // top timber sign
 px(x,C.wood3,14,11,116,28);px(x,C.wood2,16,13,112,24);px(x,C.wood,18,15,108,20);
 px(x,C.ink,16,35,112,4);snowCap(x,16,9,112);
 // side posts
 post(x,8);post(x,127);
 // play-window cutout (transparent)
 x.clearRect(14,43,116,174);
 // inner dark edging
 px(x,C.ink,12,39,120,4);px(x,C.ink,11,39,3,184);px(x,C.ink,130,39,3,184);px(x,C.ink,12,217,120,5);
 // snow-covered firs beside the screen
 for(let y=42;y<210;y+=30){fir(x,5,y,false);fir(x,139,y,true)}
 // top garland
 for(let xx=22;xx<126;xx+=13){px(x,C.green,xx,11,10,5);px(x,C.green2,xx+2,9,6,5);px(x,C.red,xx+4,10,2,2)}
 // bow
 px(x,C.red2,66,8,12,9);poly(x,C.red,[[66,8],[60,5],[60,13],[66,12]]);poly(x,C.red,[[78,8],[84,5],[84,13],[78,12]]);
 px(x,C.red,69,12,6,8);px(x,C.red2,71,13,2,8);
 // lamps
 lamp(x,11,23);lamp(x,132,23);lamp(x,8,171);lamp(x,135,171);lamp(x,7,239);lamp(x,136,239);
 // lower snow shelf and cobbles
 px(x,C.wood3,5,219,134,9);snowCap(x,5,216,134);cobbles(x);
 // edge fence posts and presents
 for(const xx of [2,12,126,136]){px(x,C.wood3,xx,250,6,62);px(x,C.wood2,xx+1,252,4,60);snowCap(x,xx-1,248,8)}
 px(x,C.red,0,236,12,8);px(x,C.gold,5,233,2,14);px(x,C.green,2,244,9,5);
 px(x,C.red,132,240,12,10);px(x,C.gold,137,236,2,16);px(x,C.green,132,249,10,5);
 // snow along bottom
 for(let xx=0;xx<144;xx+=12){px(x,C.snow3,xx,304,13,4);px(x,C.snow2,xx+1,302,11,4);px(x,C.snow,xx+3,301,7,3)}
}
function arrow(canvas){
 canvas.width=42;canvas.height=42;const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,42,42);
 px(x,C.ink,8,8,26,26);px(x,'#2f667f',10,6,22,2);px(x,'#2f667f',6,10,2,22);px(x,'#2f667f',34,10,2,22);px(x,'#2f667f',10,34,22,2);
 px(x,C.gold2,10,10,22,22);px(x,C.red2,12,12,18,18);px(x,C.red,14,14,14,14);
 // right arrow
 px(x,'#fff1c5',17,19,8,4);px(x,'#fff1c5',22,16,4,10);px(x,'#fff1c5',25,18,3,6);
}
function action(canvas){
 canvas.width=45;canvas.height=46;const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,45,46);
 // pixel circle/octagon
 px(x,C.ink,11,3,23,2);px(x,C.ink,6,7,33,4);px(x,C.ink,3,12,39,22);px(x,C.ink,7,34,31,5);px(x,C.ink,12,39,21,3);
 px(x,C.gold2,11,6,23,2);px(x,C.gold,7,10,31,3);px(x,C.gold,5,14,35,17);px(x,C.gold2,8,32,29,4);
 px(x,C.green,9,12,27,21);px(x,C.green2,12,10,21,3);px(x,'#174f3f',8,16,29,14);
 // A
 const cream='#f4e8bf';px(x,cream,20,16,5,2);px(x,cream,18,18,9,2);px(x,cream,17,20,3,10);px(x,cream,25,20,3,10);px(x,cream,20,23,5,3);
}
window.AdventPixelUI={drawFrame,drawArrow:arrow,drawAction:action};
})();