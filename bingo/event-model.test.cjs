'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./event-model.js');
function sale(e,name,qty=1,prefix='CI'){const used=(e.sales||[]).flatMap(x=>x.cardIds).length;return M.recordSale(e,{name,quantity:qty,cardIds:Array.from({length:qty},(_,i)=>prefix+'-'+String(used+i+1).padStart(3,'0'))})}
test('five games, £150 venue fee separate from ticket stakes',()=>{
 const e=M.createEvent({title:'Pub Bingo',venue:'The Pub'});
 assert.equal(e.hostingFeePence,15000);
 assert.equal(M.reconcile(e).takingsPence,0);
 sale(e,'Alex',2);sale(e,'Sam',1);
 const a=M.reconcile(e);
 assert.equal(a.takingsPence,1500);assert.equal(a.gamePots.length,5);
 assert.equal(a.gamePots.reduce((x,p)=>x+p.total,0),1500);
 for(const p of a.gamePots)assert.equal(p.line+p.two+p.house,p.total);
});
test('all pennies assigned exactly, even uneven five-way split',()=>{
 const e=M.createEvent();e.ticketPricePence=75;sale(e,'Alice',1);
 const pots=M.allocate(e);
 assert.equal(pots.reduce((x,p)=>x+p.total,0),375);
 for(const p of pots)assert.equal(p.line+p.two+p.house,p.total);
});
test('no overselling to same player, duplicated card or sales after start',()=>{
 const e=M.createEvent();sale(e,'Seat 5',3);
 assert.throws(()=>M.recordSale(e,{name:'seat 5',quantity:3,cardIds:['CI-010','CI-011','CI-012']}),/£5/);
 assert.throws(()=>M.recordSale(e,{name:'Seat 6',quantity:1,cardIds:['CI-001']}),/unique/);
 e.started=true;assert.throws(()=>M.recordSale(e,{name:'Seat 7',quantity:1,cardIds:['CI-050']}),/locked/);
});
test('payouts reconcile, split winner allowed, overspend refused',()=>{
 const e=M.createEvent();sale(e,'Alex',2);const p=M.allocate(e)[0];
 const a=M.recordPayout(e,{gameIndex:0,stage:'line',winner:'Alex',cardId:'CI-001',amount:'0.20'});
 const b=M.recordPayout(e,{gameIndex:0,stage:'line',winner:'Sam',cardId:'CI-002',amount:M.pounds(p.line-20)});
 assert.equal(a.amountPence+b.amountPence,p.line);
 assert.equal(M.stageRemaining(e,0,'line'),0);
 assert.throws(()=>M.recordPayout(e,{gameIndex:0,stage:'line',winner:'Alex',cardId:'CI-001',amount:'0.01'}),/already received/);
 assert.throws(()=>M.recordPayout(e,{gameIndex:0,stage:'line',winner:'Alex',cardId:'CI-001',amount:'0.01'}),/remaining/);
 assert.throws(()=>M.recordPayout(e,{gameIndex:1,stage:'house',winner:'Sam',cardId:'CI-002',amount:'0.10'}),/this game/);
 const outstanding=M.reconcile(e).outstandingPence;assert.equal(outstanding,1000-p.line);
});
test('amount validation protects against malformed money',()=>{
 for(const v of ['1.234','-1','1e4','abc',''])assert.throws(()=>M.toPence(v));
 assert.equal(M.toPence('2.05'),205);
});
