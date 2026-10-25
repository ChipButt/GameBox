import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPPINGS,UPGRADES,ORDERS_PER_DAY,makeOrder,availableToppings,newPizza,applyIngredient,evaluate,buyUpgrade,requiredCuts,ovenDuration,customerSeconds} from './engine.mjs';

test('orders are deterministic, fair, available and progressively more complex',()=>{
 let varied=new Set();
 for(let day=1;day<=15;day++)for(let i=0;i<ORDERS_PER_DAY;i++){
   const a=makeOrder(day,i),b=makeOrder(day,i);
   assert.deepEqual(a,b);
   assert.ok(a.price>=8);
   assert.ok(a.description.length>10);
   assert.ok([4,6,8].includes(a.needed.slices));
   assert.ok(a.needed.toppings.every(k=>TOPPINGS[k].day<=day));
   assert.ok(['all','left','right'].includes(a.needed.side));
   varied.add(a.description);
 }
 assert.ok(varied.size>=25,'Later shifts should include plenty of different orders');
 assert.deepEqual(availableToppings(1),['pepperoni']);
 assert.equal(availableToppings(4).length,4);
 assert.deepEqual(makeOrder(1,0).needed,{sauce:true,cheese:true,toppings:[],side:'all',slices:6,wellDone:false});
});
test('pizzas are hand-assembled, with valid topping placement and ingredient spending',()=>{
 const pizza=newPizza();
 assert.equal(applyIngredient(pizza,'sauce'),true);
 assert.equal(applyIngredient(pizza,'sauce'),false);
 assert.equal(applyIngredient(pizza,'cheese'),true);
 assert.equal(applyIngredient(pizza,'pepperoni',.5,.5),true);
 assert.equal(applyIngredient(pizza,'pepperoni',0,0),false,'outside the crust should not count');
 assert.equal(applyIngredient(pizza,'unavailable',.5,.5),false);
 assert.ok(pizza.spend>1.2);
 assert.equal(pizza.toppings.length,1);
});
test('correct recipes earn maximum accuracy, tips and profit',()=>{
 for(let day=1;day<=8;day++)for(let i=0;i<ORDERS_PER_DAY;i++){
   const order=makeOrder(day,i),pizza=newPizza();
   if(order.needed.sauce)applyIngredient(pizza,'sauce');
   if(order.needed.cheese)applyIngredient(pizza,'cheese');
   for(const topping of order.needed.toppings){
     for(let x=0;x<(order.needed.side==='all'?6:3);x++){
       let px=order.needed.side==='left'?.23:order.needed.side==='right'?.77:(x%2?.67:.33);
       applyIngredient(pizza,topping,px,.37+(x%3)*.13);
     }
   }
   pizza.bake=order.needed.wellDone?1.24:.9;
   pizza.cuts=requiredCuts(order.needed.slices);
   const result=evaluate(order,pizza,1,{});
   assert.equal(result.accuracy,100,'Perfect pizza did not score 100% '+day+'/'+i);
   assert.equal(result.stars,3);
   assert.ok(result.earned>0);
 }
});
test('wrong ingredients, uncut pizza and burnt dough earn worse reviews',()=>{
 const order=makeOrder(1,0),good=newPizza(),bad=newPizza();
 for(const p of [good,bad]){applyIngredient(p,'sauce');applyIngredient(p,'cheese');}
 good.bake=.9;good.cuts=3;
 bad.bake=1.62;bad.cuts=0;applyIngredient(bad,'pepperoni',.4,.4);
 assert.ok(evaluate(order,good,1).accuracy>evaluate(order,bad,1).accuracy);
 assert.ok(evaluate(order,bad,1).earned<evaluate(order,good,1).earned);
});
test('half orders reward correct-side toppings and penalise the wrong half',()=>{
 const order={needed:{sauce:true,cheese:true,toppings:['pepperoni'],side:'left',slices:4,wellDone:false},price:11};
 const good=newPizza(),bad=newPizza();
 for(const p of [good,bad]){applyIngredient(p,'sauce');applyIngredient(p,'cheese');p.bake=.92;p.cuts=2;}
 for(let i=0;i<3;i++){applyIngredient(good,'pepperoni',.25,.4+i*.08);applyIngredient(bad,'pepperoni',.75,.4+i*.08);}
 assert.ok(evaluate(order,good,1).accuracy>evaluate(order,bad,1).accuracy+15);
});
test('equipment can only be bought once and must be affordable',()=>{
 const upgrades={};
 assert.equal(buyUpgrade(1,upgrades,'oven'),null);
 assert.equal(buyUpgrade(100,upgrades,'unknown'),null);
 const bought=buyUpgrade(100,upgrades,'oven');
 assert.ok(bought);
 assert.equal(bought.cash,100-UPGRADES.oven.cost);
 assert.equal(bought.upgrades.oven,true);
 assert.equal(buyUpgrade(bought.cash,bought.upgrades,'oven'),null);
 assert.ok(ovenDuration(bought.upgrades)<ovenDuration({}));
 assert.ok(customerSeconds({patience:true})>customerSeconds({}));
});
