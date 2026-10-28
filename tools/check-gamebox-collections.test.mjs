import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('advent-2026/catalog.json'));
const home=read('hub/index.html'),rootHome=read('index.html'),portal=read('advent-2026/index.html');
const short=href=>href.split('?')[0].split('#')[0];
const chosen=['tiny-ski-run/','jigsaw/','workshop-watch/','block-breaker/','santa-invaders/','festive-blocks/','santa-letter-sort/','christmas-dash/','north-pole-pizzeria/','snowy-crossing/','present-stack/','chimney-drop-in/','santas-sorting-shift/','snow-shoveller/','snowball-knockdown/','santas-arrow-escape/','christmas-potion-sort/','gift-bubble-shooter/','snowy-sweets/','maze-shift.html'];
const standalone=['unfinished-business/','ancient-dominion/','core-empires/','sweet-truck-fever/','christmas-lights/','pipeworks/','#cards-setup','#coins-setup','heads.html','disc-rally.html','bingo/','race-manager/index.html','relic-trail/','christmas-quest/','marble-race/','my-place/'];
const tiles=content=>[...content.matchAll(/<section\b[^>]*class="toyGame [^"]+"[^>]*>[\s\S]*?<\/section>/g)].map(x=>x[0]);
const route=tile=>tile.match(/<a[^>]*href="([^"]+)"/)?.[1] || ('#'+tile.match(/data-go="([^"]+)"/)?.[1]);
const adventPart=home.slice(home.indexOf('id="advent-collection"'),home.indexOf('id="standalone-collection"'));
const standalonePart=home.slice(home.indexOf('id="standalone-collection"'),home.indexOf('<section class="hidden" data-view="cards-setup"'));
test('the 20 confirmed Advent titles are grouped, unique and in the approved order',()=>{
 assert.equal(catalog.advent.length,20);
 assert.deepEqual(catalog.advent.map(g=>short(g.href)),chosen);
 assert.deepEqual(catalog.advent.map(g=>g.index),Array.from({length:20},(_,i)=>i+1));
 assert.deepEqual(tiles(adventPart).map(route),catalog.advent.map(g=>g.href));
 assert.deepEqual(tiles(portal).map(route),catalog.advent.map(g=>g.href));
 assert.equal((portal.match(/data-mini-index="\d\d"/g)||[]).length,20);
 assert.equal((home.match(/data-mini-index="\d\d"/g)||[]).length,20);
});
test('the 16 independent titles remain outside Advent, including Card Deck, Coin Flip and My Place',()=>{
 assert.equal(catalog.standalone.length,16);
 assert.deepEqual(catalog.standalone.map(g=>short(g.href)),standalone);
 assert.deepEqual(tiles(standalonePart).map(route),catalog.standalone.map(g=>g.href));
 assert.equal((home.match(/id="homePlayers"/g)||[]).length,1,'shared roster remains intact');
 assert.match(standalonePart,/data-go="cards-setup"/);
 assert.match(standalonePart,/data-go="coins-setup"/);
});
test('no developer elf test or duplicated public game appears in either collection',()=>{
 const hrefs=[...catalog.advent,...catalog.standalone].map(g=>g.href);
 assert.equal(new Set(hrefs).size,36);
 assert.doesNotMatch(home,/href="character-playground\//);
 assert.doesNotMatch(portal,/href="character-playground\//);
 assert.ok(!catalog.advent.some(g=>standalone.includes(g.href)));
});
test('original playable URL paths and query strings remain exactly as registered',()=>{
 for(const entry of [...catalog.advent,...catalog.standalone]){
  const href=entry.href;
  if(href.startsWith('#'))continue;
  const p=short(href),resolved=path.join(root,p);
  const file=href.endsWith('/')||fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory()?path.join(resolved,'index.html'):resolved;
  assert.ok(fs.existsSync(file),entry.name+' should keep its existing entry: '+href);
 }
 assert.equal(catalog.advent.find(x=>x.name==='Block Breaker')?.href,'block-breaker/?build=christmas-v13');
 assert.equal(catalog.advent.find(x=>x.name==='Festive Blocks')?.href,'festive-blocks/?build=v1');
 assert.equal(catalog.standalone.find(x=>x.name==='Marble Race')?.href,'marble-race/?v=4edacd2');
 assert.equal(catalog.advent.find(x=>x.name==='Shift In Maze')?.href,'maze-shift.html');
});
test('root and source homepage remain byte-for-byte synchronised; both collections have accessible navigation',()=>{
 const marker='\n<!-- GameBox source base: preserve the original root URL context. -->\n<base href="../">';
 assert.equal(home.replace(marker,''),rootHome,'tools/sync-entry-points.py --check must pass');
 for(const id of ['advent-collection','standalone-collection'])assert.ok(home.includes('id="'+id+'"'));
 assert.match(home,/href="advent-2026\//);
 assert.match(portal,/href="\.\/"[^>]*>← GameBox/);
 assert.match(home,/hub\/gamebox-collections\.css/);
 assert.match(portal,/hub\/gamebox-collections\.css/);
});
