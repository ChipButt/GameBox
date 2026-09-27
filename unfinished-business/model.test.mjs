import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,buy,cost,capacity,sanitize,points,START,level,rayBlocked} from './model.js';
test('two 25-point attempts fund the first speed upgrade and preserve change',()=>{const p=initial();p.bank+=25;assert.equal(buy(p,'speed'),false);p.bank+=25;assert.equal(buy(p,'speed'),true);assert.equal(p.bank,0);assert.equal(p.speed,1);p.bank=cost(p,'speed')+15;buy(p,'speed');assert.equal(p.bank,15)});
test('locked skills cannot be purchased; invisibility begins tiny',()=>{const p=initial();p.bank=10000;assert.equal(buy(p,'phase'),false);assert.equal(capacity(p),0);p.invisibility=1;assert.equal(capacity(p),.65);assert.equal(buy(p,'invisibility'),true)});
test('forward distance cannot pay for walking in circles',()=>{assert.equal(points(START),0);assert.equal(points(START-200),25);assert.equal(points(START+200),0)});
test('solid objects occlude vision, opened objects do not',()=>{const b={x:40,y:0,w:10,h:40};assert.equal(rayBlocked(0,20,100,20,[b]),true);b.open=true;assert.equal(rayBlocked(0,20,100,20,[b]),false)});
test('save data is bounded and material barriers have reachable tiers',()=>{assert.equal(sanitize({speed:Infinity,bank:-10}).speed,12);assert.equal(sanitize({bank:-10}).bank,0);for(const b of level().filter(b=>b.phase<99))assert.ok(b.phase<=7&&b.touch<=5)});
