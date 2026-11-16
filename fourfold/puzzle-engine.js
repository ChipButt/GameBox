/* FourFold V5 - mixed connections, genuine crossword layouts, varied cipher wheels. */
(function(root){
'use strict';
const CROSSWORDS=[{"answer":"APPLE","clue":"Crunchy fruit that can be red or green"},{"answer":"PEAR","clue":"Bell-shaped orchard fruit"},{"answer":"LEMON","clue":"Sour yellow citrus fruit"},{"answer":"MANGO","clue":"Sweet tropical fruit with a large stone"},{"answer":"GRAPE","clue":"Small fruit found in bunches"},{"answer":"PEACH","clue":"Fuzzy stone fruit"},{"answer":"PLUM","clue":"Purple stone fruit"},{"answer":"MELON","clue":"Large fruit with juicy flesh"},{"answer":"BERRY","clue":"Small fleshy fruit"},{"answer":"OLIVE","clue":"Small fruit pressed for cooking oil"},{"answer":"BREAD","clue":"Loaf served in slices"},{"answer":"TOAST","clue":"Bread browned by heat"},{"answer":"PASTA","clue":"Italian staple made from flour and water"},{"answer":"RICE","clue":"Grain often served with curry"},{"answer":"FLOUR","clue":"Powder used for baking"},{"answer":"SUGAR","clue":"Sweet crystals used in baking"},{"answer":"HONEY","clue":"Sweet substance made by bees"},{"answer":"CREAM","clue":"Thick dairy topping"},{"answer":"CHEESE","clue":"Food made from curdled milk"},{"answer":"BUTTER","clue":"Spread churned from cream"},{"answer":"SPOON","clue":"Utensil for eating soup"},{"answer":"FORK","clue":"Utensil with prongs"},{"answer":"KNIFE","clue":"Cutting utensil with a blade"},{"answer":"PLATE","clue":"Flat dish used for meals"},{"answer":"BOWL","clue":"Deep round dish for cereal"},{"answer":"GLASS","clue":"Drinking vessel that can be transparent"},{"answer":"MUG","clue":"Handled drinking cup"},{"answer":"TABLE","clue":"Furniture used for dining"},{"answer":"CHAIR","clue":"Seat with a backrest"},{"answer":"SOFA","clue":"Long cushioned seat"},{"answer":"DESK","clue":"Workplace furniture with a writing surface"},{"answer":"LAMP","clue":"Portable source of light"},{"answer":"CLOCK","clue":"Device that shows the time"},{"answer":"RADIO","clue":"Device for receiving broadcast sound"},{"answer":"PHONE","clue":"Handheld device for calls"},{"answer":"BOOK","clue":"Bound collection of printed pages"},{"answer":"PAPER","clue":"Material used for writing"},{"answer":"PENCIL","clue":"Writing tool with graphite"},{"answer":"ERASER","clue":"Rubber tool for removing pencil marks"},{"answer":"RULER","clue":"Straight tool used to measure length"},{"answer":"DOOR","clue":"Hinged entrance panel"},{"answer":"WINDOW","clue":"Glazed opening in a wall"},{"answer":"ROOF","clue":"Top covering of a building"},{"answer":"WALL","clue":"Vertical side of a room"},{"answer":"FLOOR","clue":"Surface you walk on indoors"},{"answer":"STAIRS","clue":"Steps between levels of a building"},{"answer":"BRICK","clue":"Rectangular block used in construction"},{"answer":"STONE","clue":"Hard natural rock material"},{"answer":"METAL","clue":"Material such as iron or copper"},{"answer":"WOOD","clue":"Material from the trunk of a tree"},{"answer":"TREE","clue":"Plant with a woody trunk"},{"answer":"LEAF","clue":"Flat green part of many plants"},{"answer":"ROOT","clue":"Underground part of a plant"},{"answer":"FLOWER","clue":"Bloom of a plant"},{"answer":"GRASS","clue":"Green growth on a lawn"},{"answer":"ROSE","clue":"Flower commonly given on Valentine's Day"},{"answer":"DAISY","clue":"Flower with white petals and yellow centre"},{"answer":"TULIP","clue":"Cup-shaped spring flower"},{"answer":"LILAC","clue":"Pale purple flowering shrub"},{"answer":"BASIL","clue":"Aromatic herb often used with tomatoes"},{"answer":"THYME","clue":"Herb with tiny aromatic leaves"},{"answer":"MINT","clue":"Herb commonly used in toothpaste"},{"answer":"SAGE","clue":"Herb often paired with onion stuffing"},{"answer":"SNAKE","clue":"Legless scaly reptile"},{"answer":"TIGER","clue":"Large striped cat"},{"answer":"LION","clue":"Large cat known for a mane"},{"answer":"ZEBRA","clue":"Striped African animal"},{"answer":"HORSE","clue":"Animal often ridden with a saddle"},{"answer":"SHEEP","clue":"Farm animal that produces wool"},{"answer":"GOAT","clue":"Horned farm animal that bleats"},{"answer":"COW","clue":"Farm animal that gives milk"},{"answer":"PIG","clue":"Farm animal with a snout"},{"answer":"DUCK","clue":"Waterbird that quacks"},{"answer":"GOOSE","clue":"Large waterbird that honks"},{"answer":"ROBIN","clue":"Garden bird with a red breast"},{"answer":"EAGLE","clue":"Large bird of prey"},{"answer":"SWAN","clue":"Large white waterbird with a long neck"},{"answer":"WHALE","clue":"Large ocean mammal"},{"answer":"SHARK","clue":"Predatory fish with rows of teeth"},{"answer":"TROUT","clue":"Freshwater fish prized by anglers"},{"answer":"SALMON","clue":"Fish that migrates upstream to spawn"},{"answer":"CRAB","clue":"Crustacean with pincers"},{"answer":"SHELL","clue":"Hard outside covering of a mollusc"},{"answer":"BEACH","clue":"Sandy shore by the sea"},{"answer":"OCEAN","clue":"Vast body of salt water"},{"answer":"RIVER","clue":"Natural flowing waterway"},{"answer":"LAKE","clue":"Large body of inland water"},{"answer":"POND","clue":"Small body of still water"},{"answer":"BROOK","clue":"Small stream"},{"answer":"RAIN","clue":"Water falling from clouds"},{"answer":"SNOW","clue":"Frozen precipitation that settles white"},{"answer":"HAIL","clue":"Small balls of ice falling from clouds"},{"answer":"WIND","clue":"Moving air"},{"answer":"STORM","clue":"Severe weather with strong wind"},{"answer":"CLOUD","clue":"Visible mass of water droplets in the sky"},{"answer":"FOG","clue":"Cloud close to ground level"},{"answer":"FROST","clue":"Ice crystals forming on cold surfaces"},{"answer":"NIGHT","clue":"Dark part of the daily cycle"},{"answer":"DAY","clue":"Time between sunrise and sunset"},{"answer":"DAWN","clue":"First light before sunrise"},{"answer":"DUSK","clue":"Light fading at the end of the day"},{"answer":"MOON","clue":"Earth's natural satellite"},{"answer":"SUN","clue":"Star at the centre of our solar system"},{"answer":"STAR","clue":"Luminous point in the night sky"},{"answer":"SPACE","clue":"Region beyond Earth's atmosphere"},{"answer":"EARTH","clue":"Planet we live on"},{"answer":"MARS","clue":"Red planet"},{"answer":"VENUS","clue":"Planet named after the Roman goddess of love"},{"answer":"COMET","clue":"Icy celestial body with a tail"},{"answer":"ORBIT","clue":"Path of a planet around a star"},{"answer":"ROBOT","clue":"Machine programmed to carry out tasks"},{"answer":"LASER","clue":"Highly focused beam of light"},{"answer":"MOUSE","clue":"Small rodent or computer pointing device"},{"answer":"SCREEN","clue":"Display on a television or computer"},{"answer":"CABLE","clue":"Bundle of wires used to carry signals"},{"answer":"WHEEL","clue":"Round part that rotates on a vehicle"},{"answer":"TRAIN","clue":"Rail vehicle pulling carriages"},{"answer":"TRUCK","clue":"Large goods vehicle"},{"answer":"PLANE","clue":"Powered vehicle that flies"},{"answer":"BOAT","clue":"Small craft used on water"},{"answer":"SHIP","clue":"Large ocean-going vessel"},{"answer":"CANOE","clue":"Narrow paddle-powered boat"},{"answer":"KAYAK","clue":"Low boat propelled with a double-ended paddle"},{"answer":"SLED","clue":"Vehicle pulled over snow"},{"answer":"ROAD","clue":"Route for wheeled traffic"},{"answer":"TRACK","clue":"Marked path or railway route"},{"answer":"BRIDGE","clue":"Structure spanning a river or road"},{"answer":"TUNNEL","clue":"Passage cut through a hill"},{"answer":"GATE","clue":"Hinged barrier in a fence"},{"answer":"PARK","clue":"Public green space for recreation"},{"answer":"FIELD","clue":"Open area of farmland or grass"},{"answer":"HILL","clue":"Small raised area of land"},{"answer":"CLIFF","clue":"Steep rock face"},{"answer":"CAVE","clue":"Natural underground hollow"},{"answer":"SAND","clue":"Fine grains commonly found on beaches"},{"answer":"MUD","clue":"Wet soil"},{"answer":"DUST","clue":"Fine dry particles"},{"answer":"GOLD","clue":"Precious yellow metal"},{"answer":"SILVER","clue":"Shiny grey precious metal"},{"answer":"COPPER","clue":"Reddish-brown metal"},{"answer":"IRON","clue":"Metal commonly used to make steel"},{"answer":"RUBY","clue":"Red gemstone"},{"answer":"OPAL","clue":"Gemstone known for changing flashes of colour"},{"answer":"PEARL","clue":"Gem formed inside certain shellfish"},{"answer":"JADE","clue":"Green ornamental gemstone"},{"answer":"NORTH","clue":"Direction opposite south"},{"answer":"SOUTH","clue":"Direction opposite north"},{"answer":"EAST","clue":"Direction of sunrise"},{"answer":"WEST","clue":"Direction of sunset"},{"answer":"KING","clue":"Male monarch"},{"answer":"QUEEN","clue":"Female monarch"},{"answer":"PRINCE","clue":"Male child of a monarch"},{"answer":"DUKE","clue":"Noble rank below a prince"},{"answer":"KNIGHT","clue":"Person given the title Sir or Dame"},{"answer":"CASTLE","clue":"Fortified historic residence"},{"answer":"CROWN","clue":"Royal headwear"},{"answer":"SWORD","clue":"Bladed weapon carried by a knight"},{"answer":"SHIELD","clue":"Protective object held in battle"},{"answer":"ARROW","clue":"Pointed projectile shot from a bow"},{"answer":"BOW","clue":"Curved weapon that shoots arrows"},{"answer":"DRUM","clue":"Percussion instrument struck with sticks"},{"answer":"FLUTE","clue":"Wind instrument played by blowing across a hole"},{"answer":"PIANO","clue":"Keyboard instrument with strings and hammers"},{"answer":"VIOLA","clue":"Bowed string instrument slightly larger than a violin"},{"answer":"CELLO","clue":"Large bowed string instrument played seated"},{"answer":"GUITAR","clue":"Six-stringed instrument often strummed"},{"answer":"BANJO","clue":"Round-bodied string instrument with a long neck"},{"answer":"HARP","clue":"Stringed instrument with a triangular frame"},{"answer":"SONG","clue":"Piece of music with sung words"},{"answer":"DANCE","clue":"Movement to music"},{"answer":"TANGO","clue":"Dramatic dance from Argentina"},{"answer":"WALTZ","clue":"Partner dance in triple time"},{"answer":"SALSA","clue":"Energetic Latin social dance"},{"answer":"JAZZ","clue":"Music genre with improvisation"},{"answer":"BLUES","clue":"Music genre built around expressive notes"},{"answer":"ROCK","clue":"Music genre with electric guitars"},{"answer":"RHYME","clue":"Words sharing a final sound"},{"answer":"WORD","clue":"Unit of language with meaning"},{"answer":"LETTER","clue":"Symbol of an alphabet"},{"answer":"VOWEL","clue":"A, E, I, O or U"},{"answer":"NOUN","clue":"Word naming a person, place or thing"},{"answer":"VERB","clue":"Word describing an action"},{"answer":"COMMA","clue":"Punctuation mark marking a short pause"},{"answer":"COLON","clue":"Punctuation mark made of two stacked dots"},{"answer":"DASH","clue":"Long punctuation line"},{"answer":"DOT","clue":"Small round punctuation mark"},{"answer":"ZERO","clue":"Number before one"},{"answer":"ONE","clue":"Number after zero"},{"answer":"TWO","clue":"Number after one"},{"answer":"THREE","clue":"Number after two"},{"answer":"FOUR","clue":"Number after three"},{"answer":"FIVE","clue":"Number after four"},{"answer":"SIX","clue":"Number after five"},{"answer":"SEVEN","clue":"Number after six"},{"answer":"EIGHT","clue":"Number after seven"},{"answer":"NINE","clue":"Number before ten"},{"answer":"TEN","clue":"Number after nine"},{"answer":"SCORE","clue":"Twenty points or a game's tally"},{"answer":"POINT","clue":"Single unit of score"},{"answer":"GOAL","clue":"Target scored in football"},{"answer":"BALL","clue":"Round object used in many sports"},{"answer":"BAT","clue":"Stick used to hit a ball in cricket"},{"answer":"NET","clue":"Mesh used to catch balls in sport"},{"answer":"RACE","clue":"Competition to be first"},{"answer":"RUN","clue":"Move quickly on foot"},{"answer":"WALK","clue":"Move on foot at a steady pace"},{"answer":"SWIM","clue":"Move through water using limbs"},{"answer":"JUMP","clue":"Push off the ground into the air"},{"answer":"SKI","clue":"Long narrow equipment for moving over snow"},{"answer":"SKATE","clue":"Boot with a blade for gliding on ice"},{"answer":"DICE","clue":"Small numbered cubes rolled in games"},{"answer":"CARDS","clue":"Playing deck with four suits"},{"answer":"CHESS","clue":"Board game with kings and queens"},{"answer":"ROOK","clue":"Castle-shaped chess piece"},{"answer":"PAWN","clue":"Smallest chess piece"},{"answer":"CHECK","clue":"Threat to a king in chess"},{"answer":"MATE","clue":"Final word completing check___ in chess"},{"answer":"PUZZLE","clue":"Problem designed to test ingenuity"},{"answer":"MAZE","clue":"Network of paths with dead ends"},{"answer":"CLUE","clue":"Hint used to solve a mystery"},{"answer":"SECRET","clue":"Information kept hidden"},{"answer":"CODE","clue":"System of symbols hiding a message"},{"answer":"LOCK","clue":"Device opened with a key"},{"answer":"KEY","clue":"Small metal item used to unlock a door"},{"answer":"MAP","clue":"Diagram showing roads and places"},{"answer":"COMPASS","clue":"Instrument for finding directions"},{"answer":"LANTERN","clue":"Portable lamp with a protective case"},{"answer":"CANDLE","clue":"Wax light source with a wick"},{"answer":"FLAME","clue":"Visible burning gas"},{"answer":"SMOKE","clue":"Cloud given off by a fire"},{"answer":"ASH","clue":"Powder left after burning"},{"answer":"FIRE","clue":"Heat and light from combustion"},{"answer":"WATER","clue":"Liquid needed by all living things"},{"answer":"ICE","clue":"Solid form of water"},{"answer":"STEAM","clue":"Water vapour from a boiling kettle"},{"answer":"HOT","clue":"Having a high temperature"},{"answer":"COLD","clue":"Having a low temperature"},{"answer":"WARM","clue":"Neither cold nor hot"},{"answer":"COOL","clue":"Slightly cold"},{"answer":"BRAVE","clue":"Showing courage"},{"answer":"CALM","clue":"Free from excitement or worry"},{"answer":"HAPPY","clue":"Feeling pleased or joyful"},{"answer":"SAD","clue":"Feeling unhappy"},{"answer":"ANGRY","clue":"Feeling strong displeasure"},{"answer":"SHY","clue":"Timid around other people"},{"answer":"QUIET","clue":"Making little noise"},{"answer":"LOUD","clue":"Making plenty of noise"},{"answer":"FAST","clue":"Moving quickly"},{"answer":"SLOW","clue":"Moving without haste"},{"answer":"TALL","clue":"Of great height"},{"answer":"SHORT","clue":"Not long"},{"answer":"WIDE","clue":"Not narrow"},{"answer":"NARROW","clue":"Not wide"},{"answer":"SMALL","clue":"Not large"},{"answer":"LARGE","clue":"Of considerable size"},{"answer":"HEAVY","clue":"Weighing a lot"},{"answer":"LIGHT","clue":"Not heavy"},{"answer":"ROUND","clue":"Shaped like a circle"},{"answer":"FLAT","clue":"Having an even level surface"},{"answer":"SQUARE","clue":"Shape with four equal sides"},{"answer":"CIRCLE","clue":"Round plane figure with no corners"},{"answer":"OVAL","clue":"Elliptical shape like an egg"},{"answer":"ANGLE","clue":"Space between two intersecting lines"},{"answer":"PINK","clue":"Colour made by mixing red and white"},{"answer":"BLUE","clue":"Colour of a clear daytime sky"},{"answer":"GREEN","clue":"Colour of healthy grass"},{"answer":"RED","clue":"Colour of a ripe tomato"},{"answer":"BROWN","clue":"Colour of chocolate"},{"answer":"WHITE","clue":"Colour of snow"},{"answer":"BLACK","clue":"Colour of coal"},{"answer":"GREY","clue":"Colour between black and white"},{"answer":"PURPLE","clue":"Colour associated with amethyst"},{"answer":"ORANGE","clue":"Colour of a carrot"}];
const KINDS=['wordle','cipher','cross'];
function shuffle(list,rng=Math.random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function bankCheck(groups){
 if(!Array.isArray(groups)||groups.length<100)throw Error('FourFold needs a substantial connection bank');
 const ids=new Set(),names=new Set(),types=new Set();
 for(const g of groups){
  if(!g||typeof g.id!=='string'||ids.has(g.id)||typeof g.name!=='string'||names.has(g.name)||typeof g.type!=='string')throw Error('Duplicate or invalid FourFold group '+(g?.id||''));
  if(!Array.isArray(g.words)||g.words.length!==4||new Set(g.words).size!==4||g.words.some(w=>typeof w!=='string'||!/^[A-Z]+$/.test(w)))throw Error('Invalid group words: '+g.name);
  ids.add(g.id);names.add(g.name);types.add(g.type)
 }
 if(types.size<6)throw Error('Not enough different connection types');
 return {groups:groups.length,types:[...types]}
}
function cipherEncode(word,method,shift=0){
 const caesar=s=>[...s].map(ch=>String.fromCharCode(65+(ch.charCodeAt(0)-65+shift)%26)).join('');
 if(method==='caesar')return caesar(word);
 if(method==='atbash')return [...word].map(ch=>String.fromCharCode(90-(ch.charCodeAt(0)-65))).join('');
 if(method==='reversed-caesar')return [...caesar(word)].reverse().join('');
 throw Error('Unknown cipher style '+method)
}
function buildCipher(word,rng=Math.random,history=[]){
 const recent=history.slice(-12).flatMap(h=>h.sealSignatures||[]);
 const methods=shuffle(['caesar','atbash','reversed-caesar'],rng);
 for(const method of methods){
  for(let t=0;t<26;t++){
   const shift=method==='atbash'?0:1+Math.floor(rng()*25);
   const signature='cipher:'+word+':'+method+':'+shift;
   const last=history.at(-1)?.seals||[];
   if(recent.includes(signature)||last.some(s=>s.kind==='cipher'&&s.method===method&&s.shift===shift))continue;
   return {kind:'cipher',method,shift,answer:word,code:cipherEncode(word,method,shift),signature,
    intro:method==='atbash'?'Mirror cipher: A becomes Z, B becomes Y, and so on. Work backwards to reveal the hidden word.':
    method==='reversed-caesar'?'The sender shifted every letter and then reversed the letter order. Undo both steps to decode.':
    'A rotating alphabet wheel has shifted every letter. Use the mapping to recover the original word.'}
  }
 }
 throw Error('Unable to make new cipher')
}
function constructCrossword(rng=Math.random,avoid=[]){
 const SIZE=11, recent=new Set(avoid);
 for(let attempt=0;attempt<65;attempt++){
  const grid=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>null));
  const entries=[], choices=shuffle(CROSSWORDS.filter(w=>w.answer.length>=4&&w.answer.length<=6),rng);
  const first=choices[Math.floor(rng()*Math.min(50,choices.length))], sr=5, sc=Math.floor((SIZE-first.answer.length)/2);
  function fits(entry,r,c,dir,initial=false){
   const dr=dir==='down'?1:0,dc=dir==='across'?1:0;
   if(r<0||c<0||r+dr*(entry.answer.length-1)>=SIZE||c+dc*(entry.answer.length-1)>=SIZE)return -1;
   const br=r-dr,bc=c-dc,ar=r+dr*entry.answer.length,ac=c+dc*entry.answer.length;
   if((br>=0&&bc>=0&&grid[br][bc])||(ar<SIZE&&ac<SIZE&&grid[ar][ac]))return -1;
   let crosses=0;
   for(let i=0;i<entry.answer.length;i++){
    const rr=r+dr*i,cc=c+dc*i,current=grid[rr][cc];
    if(current){
     if(current.ch!==entry.answer[i]||current[dir])return -1;
     crosses++
    }else if((dir==='across'&&((rr>0&&grid[rr-1][cc])||(rr<SIZE-1&&grid[rr+1][cc])))||
      (dir==='down'&&((cc>0&&grid[rr][cc-1])||(cc<SIZE-1&&grid[rr][cc+1]))))return -1
   }
   return initial||crosses>0?crosses:-1
  }
  function add(e,r,c,dir){
   entries.push({answer:e.answer,clue:e.clue,r,c,dir});
   for(let i=0;i<e.answer.length;i++){
    const rr=r+(dir==='down'?i:0),cc=c+(dir==='across'?i:0);
    const current=grid[rr][cc]||{ch:e.answer[i],across:false,down:false};
    current[dir]=true;grid[rr][cc]=current
   }
  }
  add(first,sr,sc,'across');
  const remaining=shuffle(CROSSWORDS.filter(x=>x.answer!==first.answer),rng);
  for(let pass=0;pass<6;pass++){
   const candidates=[],counts={across:entries.filter(e=>e.dir==='across').length,down:entries.filter(e=>e.dir==='down').length};
   for(const candidate of remaining){
    if(entries.some(e=>e.answer===candidate.answer))continue;
    for(let i=0;i<candidate.answer.length;i++){
     for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const cell=grid[r][c];if(!cell||cell.ch!==candidate.answer[i])continue;
      const orientations=cell.across&&!cell.down?['down']:cell.down&&!cell.across?['across']:[];
      for(const dir of orientations){
       const nr=r-(dir==='down'?i:0),nc=c-(dir==='across'?i:0);
       const crosses=fits(candidate,nr,nc,dir);
       if(crosses<1)continue;
       const imbalance=counts[dir]>counts[dir==='across'?'down':'across']?8:0;
       const midpoint=Math.abs(nr-5)+Math.abs(nc-5);
       candidates.push({candidate,r:nr,c:nc,dir,score:crosses*5-imbalance-midpoint*.13+rng()*4})
      }
     }
    }
   }
   if(!candidates.length)break;
   candidates.sort((a,b)=>b.score-a.score);
   const pick=candidates[Math.floor(rng()*Math.min(16,candidates.length))];
   add(pick.candidate,pick.r,pick.c,pick.dir)
  }
  if(entries.length<5||entries.filter(e=>e.dir==='across').length<2||entries.filter(e=>e.dir==='down').length<2)continue;
  const rows=[],coords=[];
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(grid[r][c])coords.push([r,c]);
  const minR=Math.min(...coords.map(x=>x[0])),maxR=Math.max(...coords.map(x=>x[0]));
  const minC=Math.min(...coords.map(x=>x[1])),maxC=Math.max(...coords.map(x=>x[1]));
  for(let r=minR;r<=maxR;r++){let row='';for(let c=minC;c<=maxC;c++)row+=grid[r][c]?.ch||'#';rows.push(row)}
  const shifted=entries.map(e=>({...e,r:e.r-minR,c:e.c-minC}));
  const starts=shifted.slice().sort((a,b)=>a.r-b.r||a.c-b.c);
  const numbers={};let next=1;for(const e of starts){const key=e.r+','+e.c;if(!numbers[key])numbers[key]=next++;e.number=numbers[key]}
  const signature='cross:'+shifted.map(e=>e.answer).sort().join(',');
  if(recent.has(signature))continue;
  const result={width:maxC-minC+1,height:maxR-minR+1,rows,entries:shifted,signature};
  if(crosswordCheck(result))return result
 }
 throw Error('No valid crossword layout available')
}
function crosswordCheck(layout){
 if(!layout||!Array.isArray(layout.rows)||layout.rows.length<4||!Array.isArray(layout.entries)||layout.entries.length<5)return false;
 const {height,width,rows,entries}=layout;
 if(!Number.isInteger(width)||!Number.isInteger(height)||height>11||width>11||rows.length!==height||rows.some(row=>typeof row!=='string'||row.length!==width||!/^[A-Z#]+$/.test(row)))return false;
 if(entries.filter(e=>e.dir==='across').length<2||entries.filter(e=>e.dir==='down').length<2)return false;
 const counts=new Map();
 for(const e of entries){
  if(!/^[A-Z]+$/.test(e.answer)||typeof e.clue!=='string'||!Number.isInteger(e.number)||!['across','down'].includes(e.dir))return false;
  for(let k=0;k<e.answer.length;k++){
   const r=e.r+(e.dir==='down'?k:0),c=e.c+(e.dir==='across'?k:0);
   if(r>=height||c>=width||rows[r][c]!==e.answer[k])return false;
   const key=r+','+c;const dirs=counts.get(key)||new Set();
   if(dirs.has(e.dir))return false;dirs.add(e.dir);counts.set(key,dirs)
  }
 }
 let intersections=0;
 for(let r=0;r<height;r++)for(let c=0;c<width;c++){
  const filled=rows[r][c]!=='#',cell=counts.get(r+','+c);
  if(filled!==Boolean(cell))return false;
  if(cell?.size===2)intersections++
 }
 return intersections>=3
}
function buildCrossword(history=[],rng=Math.random){
 const avoid=history.slice(-100).flatMap(h=>h.sealSignatures||[]).filter(x=>x.startsWith('cross:'));
 const layout=constructCrossword(rng,avoid);
 return {kind:'cross',layout,signature:layout.signature,intro:'Fill the numbered Across and Down clues. Each crossing shares a letter. Finish the crossword to reveal the hidden tile.'}
}
function validBoard(board){
 if(!board||!Array.isArray(board.groups)||board.groups.length!==4||!board.seals||typeof board.seals!=='object')return false;
 const words=board.groups.flatMap(g=>Array.isArray(g.words)?g.words:[]);
 if(words.length!==16||new Set(words).size!==16||words.some(w=>typeof w!=='string'||!/^[A-Z]+$/.test(w)))return false;
 for(const [word,p] of Object.entries(board.seals)){
  if(!words.includes(word)||!KINDS.includes(p?.kind))return false;
  if(p.kind==='wordle'&&word.length!==5)return false;
  if(p.kind==='cipher'&&(!p.code||p.answer!==word||p.code.length!==word.length))return false;
  if(p.kind==='cross'&&!((p.layout&&crosswordCheck(p.layout))||(Array.isArray(p.items)&&p.items.map(x=>x?.[1]?.[2]).join('')===word)))return false
 }
 return true
}
function sealSignature(word,p){return p.signature||(p.kind+':'+word)}
function buildSeals(words,dict,rng=Math.random,history=[]){
 const seals={},latest=history.at(-1),firstChoices=shuffle(KINDS.filter(kind=>kind!==latest?.primaryKind),rng);
 const kinds=firstChoices.concat(KINDS.filter(k=>!firstChoices.includes(k)));
 const count=rng()<.42?2:1;
 const pastWords=new Set(history.slice(-12).flatMap(h=>h.seals?.map(s=>s.word)||[]));
 const usedSignatures=new Set(history.slice(-100).flatMap(h=>h.sealSignatures||[]));
 for(const kind of kinds){
  if(Object.keys(seals).length===count)break;
  const candidates=shuffle(words.filter(word=>!seals[word]&&(
   kind==='wordle'?word.length===5&&(!dict||dict.has(word)):
   kind==='cipher'?word.length>=3&&word.length<=10:
   word.length>=3
  )),rng);
  candidates.sort((a,b)=>Number(pastWords.has(a))-Number(pastWords.has(b)));
  for(const word of candidates){
   let p;
   if(kind==='wordle')p={kind,intro:'Find the five-letter word in six guesses. Green means correct position; gold means the letter appears elsewhere.',signature:'wordle:'+word};
   else if(kind==='cipher')p=buildCipher(word,rng,history);
   else p=buildCrossword(history,rng);
   if(usedSignatures.has(sealSignature(word,p)))continue;
   seals[word]=p;break
  }
 }
 if(!Object.keys(seals).length)throw Error('Could not construct a mini-game tile');
 return seals
}
function generate(groups,history=[],dict=null,rng=Math.random){
 bankCheck(groups);
 const types=[...new Set(groups.map(g=>g.type))];
 const recent=Array.isArray(history)?history.slice(-100).filter(h=>Array.isArray(h.ids)):[];
 const counts={};for(const h of recent)for(const id of h.ids)counts[id]=(counts[id]||0)+1;
 for(let attempt=0;attempt<300;attempt++){
  const selected=[],usedWords=new Set(),families=shuffle(types,rng).slice(0,4);
  for(const type of families){
   const candidates=groups.filter(g=>g.type===type&&g.words.every(w=>!usedWords.has(w)));
   if(!candidates.length)break;
   const ranked=shuffle(candidates,rng).map(g=>({g,score:(counts[g.id]||0)*30+(recent.slice(-2).some(h=>h.ids.includes(g.id))?200:0)+(recent.slice(-8).some(h=>h.ids.includes(g.id))?60:0)+rng()*14})).sort((a,b)=>a.score-b.score);
   const g=ranked[0].g;selected.push({...g,words:g.words.slice(),colour:selected.length});g.words.forEach(w=>usedWords.add(w))
  }
  if(selected.length!==4||usedWords.size!==16)continue;
  const key=selected.map(g=>g.id).sort().join(',');
  if(recent.some(h=>h.key===key))continue;
  const output={name:'MIXED CONNECTIONS',groups:shuffle(selected,rng).map((g,i)=>({...g,colour:i})),seals:buildSeals([...usedWords],dict,rng,recent),key};
  if(!validBoard(output))throw Error('Generated an invalid board');
  return output
 }
 throw Error('Could not generate a new FourFold board')
}
function record(history,board){
 const recent=Array.isArray(history)?history.filter(h=>h&&Array.isArray(h.ids)&&typeof h.key==='string').slice(-99):[];
 if(!recent.some(h=>h.key===board.key)){
  const seals=Object.entries(board.seals).map(([word,p])=>({word,kind:p.kind,method:p.method||'',shift:p.shift||0}));
  recent.push({key:board.key,ids:board.groups.map(g=>g.id),seals,primaryKind:seals[0]?.kind||'',sealSignatures:Object.entries(board.seals).map(([w,p])=>sealSignature(w,p))})
 }
 return recent.slice(-100)
}
const engine={shuffle,bankCheck,cipherEncode,buildCipher,constructCrossword,crosswordCheck,buildCrossword,validBoard,buildSeals,generate,record};
root.FOURFOLD_ENGINE=engine;
if(typeof module==='object'&&module.exports)module.exports=engine;
})(typeof window==='object'?window:globalThis);
