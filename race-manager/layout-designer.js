(() => {
  'use strict';

  const STORAGE_KEY='gridline.layoutDesigner.v1';
  const $=id=>document.getElementById(id);
  const surface=$('designSurface');
  const phone=$('phoneFrame');

  let manifest=[];
  let items=[];
  let selectedId=null;
  let activeFilter='all';
  let screen={width:390,height:844};
  let zoom=.80;
  let interaction=null;

  const uid=()=>globalThis.crypto?.randomUUID?.()||`item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const snap=n=>$('snapGrid').checked?Math.round(n/4)*4:Math.round(n);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getItem=id=>items.find(x=>x.id===id)||null;
  const maxZ=()=>items.length?Math.max(...items.map(x=>Number(x.z)||0)):0;
  const minZ=()=>items.length?Math.min(...items.map(x=>Number(x.z)||0)):0;

  async function init(){
    try{
      const response=await fetch('assets/manifest.json?v=1',{cache:'no-store'});
      const data=await response.json();
      manifest=Array.isArray(data.assets)?data.assets:[];
    }catch(error){
      console.error(error);
      manifest=[];
    }

    renderLibrary();
    bindUI();
    applyScreen();
    loadFromStorage(false);
    if(!items.length)loadStarterLayout();
  }

  function bindUI(){
    $('assetSearch').addEventListener('input',renderLibrary);
    document.querySelectorAll('[data-filter]').forEach(button=>{
      button.addEventListener('click',()=>{
        activeFilter=button.dataset.filter||'all';
        document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));
        renderLibrary();
      });
    });

    $('addText').addEventListener('click',()=>addTextItem());
    $('starterLayout').addEventListener('click',()=>{
      if(items.length&&!confirm('Replace the current layout with the race starter layout?'))return;
      loadStarterLayout();
    });
    $('clearLayout').addEventListener('click',()=>{
      if(items.length&&!confirm('Remove every item from the designer?'))return;
      items=[];
      selectedId=null;
      render();
    });

    $('screenPreset').addEventListener('change',()=>{
      const [w,h]=$('screenPreset').value.split('x').map(Number);
      const old={...screen};
      screen={width:w,height:h};
      const sx=w/old.width,sy=h/old.height;
      items.forEach(item=>{
        item.x=Math.round(item.x*sx);
        item.y=Math.round(item.y*sy);
        item.w=Math.max(4,Math.round(item.w*sx));
        item.h=Math.max(4,Math.round(item.h*sy));
        item.ratio=item.w/item.h;
      });
      applyScreen();
      render();
    });

    $('zoomRange').addEventListener('input',()=>{
      zoom=Number($('zoomRange').value)/100;
      applyScreen();
    });
    $('showGuides').addEventListener('change',()=>{
      surface.classList.toggle('hideGuides',!$('showGuides').checked);
    });

    $('saveLocal').addEventListener('click',saveToStorage);
    $('loadLocal').addEventListener('click',()=>loadFromStorage(true));
    $('downloadJson').addEventListener('click',downloadJSON);
    $('copyJson').addEventListener('click',copyJSON);
    $('importJson').addEventListener('change',importJSON);

    $('deleteSelected').addEventListener('click',deleteSelected);
    $('duplicateSelected').addEventListener('click',duplicateSelected);
    $('bringFront').addEventListener('click',()=>{
      const item=getItem(selectedId); if(!item)return;
      item.z=maxZ()+1; render();
    });
    $('sendBack').addEventListener('click',()=>{
      const item=getItem(selectedId); if(!item)return;
      item.z=minZ()-1; render();
    });

    bindInspector();
    bindSurfaceEvents();

    document.addEventListener('keydown',event=>{
      const tag=event.target?.tagName?.toLowerCase();
      if(['input','textarea','select'].includes(tag))return;
      const item=getItem(selectedId);
      if((event.key==='Delete'||event.key==='Backspace')&&item){
        event.preventDefault();
        deleteSelected();
        return;
      }
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='d'&&item){
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if(!item)return;
      const delta=event.shiftKey?10:1;
      if(event.key==='ArrowLeft'){item.x=clamp(item.x-delta,0,screen.width-item.w)}
      else if(event.key==='ArrowRight'){item.x=clamp(item.x+delta,0,screen.width-item.w)}
      else if(event.key==='ArrowUp'){item.y=clamp(item.y-delta,0,screen.height-item.h)}
      else if(event.key==='ArrowDown'){item.y=clamp(item.y+delta,0,screen.height-item.h)}
      else return;
      event.preventDefault();
      render();
    });
  }

  function bindInspector(){
    const direct={
      propName:'name',
      propX:'x',
      propY:'y',
      propZ:'z',
      propOpacity:'opacity',
      propFit:'fit',
      propObjectX:'objectX',
      propObjectY:'objectY',
      propText:'text',
      propRole:'role',
      propFontSize:'fontSize',
      propFontWeight:'fontWeight',
      propAlign:'align',
      propColor:'color'
    };

    for(const [id,key] of Object.entries(direct)){
      $(id).addEventListener('input',()=>{
        const item=getItem(selectedId); if(!item)return;
        let value=$(id).value;
        if(['x','y','z','fontSize','objectX','objectY'].includes(key))value=Number(value);
        if(key==='opacity')value=clamp(Number(value),0,1);
        item[key]=value;
        if(key==='x')item.x=clamp(snap(item.x),0,screen.width-item.w);
        if(key==='y')item.y=clamp(snap(item.y),0,screen.height-item.h);
        render(false);
      });
    }

    $('propW').addEventListener('input',()=>{
      const item=getItem(selectedId); if(!item)return;
      let w=Math.max(4,Number($('propW').value)||4);
      w=Math.min(w,screen.width-item.x);
      item.w=w;
      if(item.lockAspect){
        item.h=Math.min(screen.height-item.y,Math.max(4,w/item.ratio));
      }else{
        item.ratio=item.w/item.h;
      }
      render(false);
    });

    $('propH').addEventListener('input',()=>{
      const item=getItem(selectedId); if(!item)return;
      let h=Math.max(4,Number($('propH').value)||4);
      h=Math.min(h,screen.height-item.y);
      item.h=h;
      if(item.lockAspect){
        item.w=Math.min(screen.width-item.x,Math.max(4,h*item.ratio));
      }else{
        item.ratio=item.w/item.h;
      }
      render(false);
    });

    $('propLockAspect').addEventListener('change',()=>{
      const item=getItem(selectedId); if(!item)return;
      item.lockAspect=$('propLockAspect').checked;
      item.ratio=item.w/item.h;
      render(false);
    });
  }

  function bindSurfaceEvents(){
    surface.addEventListener('pointerdown',event=>{
      const node=event.target.closest('.designItem');
      if(!node){
        selectItem(null);
        return;
      }

      const item=getItem(node.dataset.id);
      if(!item)return;
      selectItem(item.id);
      const point=surfacePoint(event);
      const isResize=event.target.classList.contains('resizeHandle');
      interaction={
        mode:isResize?'resize':'drag',
        id:item.id,
        startX:point.x,
        startY:point.y,
        x:item.x,y:item.y,w:item.w,h:item.h,
        ratio:item.ratio
      };
      node.classList.add('dragging');
      node.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    window.addEventListener('pointermove',event=>{
      if(!interaction)return;
      const item=getItem(interaction.id);
      if(!item)return;
      const point=surfacePoint(event);
      const dx=point.x-interaction.startX;
      const dy=point.y-interaction.startY;

      if(interaction.mode==='drag'){
        item.x=clamp(snap(interaction.x+dx),0,screen.width-item.w);
        item.y=clamp(snap(interaction.y+dy),0,screen.height-item.h);
      }else{
        let w=Math.max(8,interaction.w+dx);
        let h=Math.max(8,interaction.h+dy);
        if(item.lockAspect){
          const fromW=Math.abs(dx)>=Math.abs(dy*interaction.ratio);
          if(fromW)h=w/interaction.ratio;
          else w=h*interaction.ratio;
        }
        w=Math.min(w,screen.width-item.x);
        h=Math.min(h,screen.height-item.y);
        item.w=Math.max(8,snap(w));
        item.h=Math.max(8,snap(h));
        if(!item.lockAspect)item.ratio=item.w/item.h;
      }
      render(false);
    });

    window.addEventListener('pointerup',()=>{
      if(!interaction)return;
      document.querySelectorAll('.designItem.dragging').forEach(n=>n.classList.remove('dragging'));
      interaction=null;
      syncInspector();
      renderLayers();
    });
  }

  function surfacePoint(event){
    const rect=surface.getBoundingClientRect();
    return{
      x:(event.clientX-rect.left)*(screen.width/rect.width),
      y:(event.clientY-rect.top)*(screen.height/rect.height)
    };
  }

  function renderLibrary(){
    const query=$('assetSearch')?.value?.trim().toLowerCase()||'';
    const list=manifest.filter(asset=>{
      const matchesSearch=!query||`${asset.name} ${asset.category} ${asset.path}`.toLowerCase().includes(query);
      const matchesFilter=activeFilter==='all'||asset.category===activeFilter||
        (activeFilter==='hud'&&['hud','logo','status','countdown'].includes(asset.category));
      return matchesSearch&&matchesFilter;
    });

    $('assetCount').textContent=`${list.length} shown`;
    $('assetLibrary').innerHTML=list.map(asset=>`
      <button class="assetCard" type="button" data-asset-path="${esc(asset.path)}">
        <span class="assetThumb"><img src="assets/${esc(asset.path)}" alt=""></span>
        <strong>${esc(asset.name)}</strong>
        <small>${esc(asset.category)}</small>
      </button>
    `).join('');

    $('assetLibrary').querySelectorAll('[data-asset-path]').forEach(button=>{
      button.addEventListener('click',()=>{
        const asset=manifest.find(a=>a.path===button.dataset.assetPath);
        if(asset)addImageAsset(asset);
      });
    });
  }

  function defaultImageBox(asset,ratio){
    const category=asset.category;
    if(category==='track')return{x:0,y:Math.round(screen.height*.20),w:screen.width,h:Math.round(screen.height*.40),fit:'cover',lockAspect:false};
    if(category==='car')return{x:Math.round(screen.width*.46),y:Math.round(screen.height*.39),w:32,h:Math.max(24,Math.round(32/ratio)),fit:'contain',lockAspect:true};
    if(category==='popup')return{x:Math.round(screen.width*.10),y:Math.round(screen.height*.30),w:Math.round(screen.width*.80),h:Math.round(screen.width*.80/ratio),fit:'contain',lockAspect:true};
    if(category.startsWith('upgrade')){
      const w=asset.path.includes('sponsors')||asset.path.includes('fan_base')?Math.round(screen.width*.47):Math.round(screen.width*.235);
      return{x:Math.round((screen.width-w)/2),y:Math.round(screen.height*.64),w,h:Math.round(w/ratio),fit:'contain',lockAspect:true};
    }
    if(category==='logo')return{x:Math.round(screen.width*.32),y:12,w:Math.round(screen.width*.36),h:Math.round(screen.width*.36/ratio),fit:'contain',lockAspect:true};
    if(category==='hud')return{x:20,y:70,w:Math.round(screen.width*.45),h:Math.round(screen.width*.45/ratio),fit:'contain',lockAspect:true};
    return{x:Math.round(screen.width*.25),y:Math.round(screen.height*.25),w:Math.round(screen.width*.5),h:Math.round(screen.width*.5/ratio),fit:'contain',lockAspect:true};
  }

  function addImageAsset(asset,boxOverride=null){
    const probe=new Image();
    probe.onload=()=>{
      const naturalRatio=(probe.naturalWidth||1)/(probe.naturalHeight||1);
      const box=boxOverride||defaultImageBox(asset,naturalRatio);
      const item={
        id:uid(),type:'image',name:asset.name,path:asset.path,
        x:box.x??20,y:box.y??20,w:box.w??120,h:box.h??80,
        z:box.z??maxZ()+1,opacity:box.opacity??1,
        lockAspect:box.lockAspect??true,
        ratio:(box.w??120)/(box.h??80),
        fit:box.fit||'contain',
        objectX:box.objectX??50,objectY:box.objectY??50
      };
      items.push(item);
      selectItem(item.id);
      render();
    };
    probe.onerror=()=>console.warn('Could not load asset',asset.path);
    probe.src=`assets/${asset.path}`;
  }

  function addImageByPath(path,box){
    const asset=manifest.find(a=>a.path===path);
    if(asset)addImageAsset(asset,box);
  }

  function addTextItem(options={}){
    const item={
      id:uid(),type:'text',
      name:options.name||'Text',
      text:options.text??'Text',
      role:options.role||'',
      x:options.x??40,y:options.y??80,
      w:options.w??140,h:options.h??28,
      z:options.z??maxZ()+1,
      opacity:options.opacity??1,
      lockAspect:false,
      ratio:(options.w??140)/(options.h??28),
      fontSize:options.fontSize??16,
      fontWeight:String(options.fontWeight??900),
      align:options.align||'center',
      color:options.color||'#ffffff'
    };
    items.push(item);
    selectItem(item.id);
    render();
    return item;
  }

  function loadStarterLayout(){
    items=[];
    selectedId=null;

    const W=screen.width,H=screen.height;
    const top=Math.round(H*.20);
    const trackH=Math.round(H*.40);
    const bottom=top+trackH;

    const specs=[
      ['ui/logo/gridline_racing_logo.png',{x:Math.round(W*.32),y:8,w:Math.round(W*.36),h:40,fit:'contain',lockAspect:false,z:20}],
      ['ui/hud/player_profile.png',{x:6,y:54,w:Math.round(W*.38),h:58,fit:'contain',lockAspect:false,z:20}],
      ['ui/hud/race_name_banner.png',{x:Math.round(W*.39),y:54,w:Math.round(W*.60),h:58,fit:'contain',lockAspect:false,z:20}],
      ['ui/hud/cash_pill.png',{x:5,y:116,w:Math.round((W-20)/3),h:45,fit:'contain',lockAspect:false,z:20}],
      ['ui/hud/position_pill.png',{x:10+Math.round((W-20)/3),y:116,w:Math.round((W-20)/3),h:45,fit:'contain',lockAspect:false,z:20}],
      ['ui/hud/income_per_second_pill.png',{x:15+Math.round((W-20)*2/3),y:116,w:Math.round((W-20)/3),h:45,fit:'contain',lockAspect:false,z:20}],
      ['tracks/snowy_alpine.png',{x:0,y:top,w:W,h:trackH,fit:'cover',lockAspect:false,z:1}],
      ['cars/player_gold.png',{x:Math.round(W*.49),y:Math.round(top+trackH*.72),w:24,h:38,fit:'contain',lockAspect:false,z:12}],
      ['ui/upgrades/enabled/engine.png',{x:4,y:bottom+7,w:Math.round((W-20)/4),h:132,fit:'contain',lockAspect:false,z:8}],
      ['ui/upgrades/enabled/tyres.png',{x:8+Math.round((W-20)/4),y:bottom+7,w:Math.round((W-20)/4),h:132,fit:'contain',lockAspect:false,z:8}],
      ['ui/upgrades/enabled/brakes.png',{x:12+Math.round((W-20)*2/4),y:bottom+7,w:Math.round((W-20)/4),h:132,fit:'contain',lockAspect:false,z:8}],
      ['ui/upgrades/enabled/fuel.png',{x:16+Math.round((W-20)*3/4),y:bottom+7,w:Math.round((W-20)/4),h:132,fit:'contain',lockAspect:false,z:8}],
      ['ui/upgrades/disabled/sponsors.png',{x:4,y:bottom+143,w:Math.round((W-13)/2),h:Math.max(110,H-(bottom+147)),fit:'contain',lockAspect:false,z:8}],
      ['ui/upgrades/enabled/fan_base.png',{x:9+Math.round((W-13)/2),y:bottom+143,w:Math.round((W-13)/2),h:Math.max(110,H-(bottom+147)),fit:'contain',lockAspect:false,z:8}]
    ];
    specs.forEach(([path,box])=>addImageByPath(path,box));

    // Live text placeholders. Each has a role so the final layout JSON can be wired straight to game data.
    [
      {name:'Player name',role:'profilePlayerName',text:'Chip',x:54,y:74,w:82,h:20,fontSize:13,align:'left',z:40},
      {name:'Track name',role:'trackName',text:'Snowy Alpine',x:185,y:69,w:155,h:18,fontSize:13,align:'center',z:40},
      {name:'Race meta',role:'raceMeta',text:'Race 1 · Lap 1 / 8',x:185,y:88,w:155,h:14,fontSize:8,fontWeight:700,color:'#d6e8ff',z:40},
      {name:'Cash value',role:'cash',text:'£84',x:72,y:134,w:48,h:16,fontSize:13,z:40},
      {name:'Position value',role:'position',text:'7 / 12',x:202,y:134,w:50,h:16,fontSize:13,z:40},
      {name:'Income value',role:'income',text:'£6/s',x:329,y:134,w:50,h:16,fontSize:13,z:40}
    ].forEach(t=>addTextItem(t));

    const smallW=Math.round((W-20)/4);
    const upgradeXs=[4,8+smallW,12+smallW*2,16+smallW*3];
    const keys=['engine','tyres','brakes','fuel'];
    keys.forEach((key,index)=>{
      const x=upgradeXs[index];
      addTextItem({name:`${key} level`,role:`upgrade.${key}.level`,text:'Lv 1',x:x+16,y:bottom+79,w:smallW-32,h:13,fontSize:8,z:40});
      addTextItem({name:`${key} cost`,role:`upgrade.${key}.cost`,text:'£40',x:x+16,y:bottom+101,w:smallW-32,h:16,fontSize:10,color:'#102246',z:40});
      addTextItem({name:`${key} maths`,role:`upgrade.${key}.math`,text:'+0% → +8%',x:x+10,y:bottom+116,w:smallW-20,h:10,fontSize:6,fontWeight:700,color:'#173051',z:40});
    });

    const wideW=Math.round((W-13)/2);
    [['sponsors',4],['fan_base',9+wideW]].forEach(([key,x])=>{
      addTextItem({name:`${key} level`,role:`upgrade.${key}.level`,text:'Lv 1',x:x+28,y:bottom+207,w:wideW-56,h:14,fontSize:9,z:40});
      addTextItem({name:`${key} cost`,role:`upgrade.${key}.cost`,text:'£80',x:x+28,y:bottom+244,w:wideW-56,h:18,fontSize:11,color:'#102246',z:40});
      addTextItem({name:`${key} maths`,role:`upgrade.${key}.math`,text:'×1.00 → ×1.25',x:x+18,y:bottom+264,w:wideW-36,h:12,fontSize:7,fontWeight:700,color:'#173051',z:40});
    });

    selectedId=null;
    render();
  }

  function render(sync=true){
    const selected=selectedId;
    surface.querySelectorAll('.designItem').forEach(node=>node.remove());

    const sorted=[...items].sort((a,b)=>(Number(a.z)||0)-(Number(b.z)||0));
    sorted.forEach(item=>{
      const node=document.createElement('div');
      node.className=`designItem ${item.type==='text'?'textItem':''} ${item.id===selected?'selected':''}`;
      node.dataset.id=item.id;
      node.style.left=`${item.x}px`;
      node.style.top=`${item.y}px`;
      node.style.width=`${item.w}px`;
      node.style.height=`${item.h}px`;
      node.style.zIndex=String(item.z);
      node.style.opacity=String(item.opacity);

      if(item.type==='image'){
        const img=document.createElement('img');
        img.className='itemContent';
        img.src=`assets/${item.path}`;
        img.alt='';
        img.draggable=false;
        img.style.objectFit=item.fit||'contain';
        img.style.objectPosition=`${item.objectX??50}% ${item.objectY??50}%`;
        node.appendChild(img);
      }else{
        const text=document.createElement('div');
        text.className='itemContent';
        text.textContent=item.text;
        text.style.fontSize=`${item.fontSize}px`;
        text.style.fontWeight=String(item.fontWeight);
        text.style.color=item.color;
        text.style.textAlign=item.align;
        text.style.justifyContent=item.align==='left'?'flex-start':item.align==='right'?'flex-end':'center';
        node.appendChild(text);
      }

      const label=document.createElement('span');
      label.className='selectionTag';
      label.textContent=item.name;
      node.appendChild(label);

      const handle=document.createElement('i');
      handle.className='resizeHandle';
      node.appendChild(handle);

      surface.appendChild(node);
    });

    if(sync)syncInspector();
    renderLayers();
  }

  function selectItem(id){
    selectedId=id;
    render();
  }

  function syncInspector(){
    const item=getItem(selectedId);
    $('noSelection').classList.toggle('hidden',!!item);
    $('inspectorFields').classList.toggle('hidden',!item);
    $('deleteSelected').disabled=!item;
    if(!item)return;

    $('propName').value=item.name||'';
    $('propX').value=Math.round(item.x);
    $('propY').value=Math.round(item.y);
    $('propW').value=Math.round(item.w);
    $('propH').value=Math.round(item.h);
    $('propZ').value=item.z;
    $('propOpacity').value=item.opacity;
    $('propLockAspect').checked=!!item.lockAspect;

    const isText=item.type==='text';
    $('imageFields').classList.toggle('hidden',isText);
    $('textFields').classList.toggle('hidden',!isText);

    if(isText){
      $('propText').value=item.text??'';
      $('propRole').value=item.role??'';
      $('propFontSize').value=item.fontSize??16;
      $('propFontWeight').value=String(item.fontWeight??900);
      $('propAlign').value=item.align||'center';
      $('propColor').value=item.color||'#ffffff';
    }else{
      $('propFit').value=item.fit||'contain';
      $('propObjectX').value=item.objectX??50;
      $('propObjectY').value=item.objectY??50;
    }
  }

  function renderLayers(){
    $('layerCount').textContent=`${items.length}`;
    const sorted=[...items].sort((a,b)=>(Number(b.z)||0)-(Number(a.z)||0));
    $('layerList').innerHTML=sorted.map(item=>`
      <button class="layerRow ${item.id===selectedId?'active':''}" data-layer-id="${item.id}" type="button">
        ${item.type==='image'
          ?`<img class="layerIcon" src="assets/${esc(item.path)}" alt="">`
          :'<span class="layerIcon">T</span>'}
        <span><strong>${esc(item.name)}</strong><small class="layerType">${item.type==='text'?(item.role||'text'):item.path}</small></span>
        <small>z${item.z}</small>
      </button>
    `).join('');
    $('layerList').querySelectorAll('[data-layer-id]').forEach(button=>{
      button.addEventListener('click',()=>selectItem(button.dataset.layerId));
    });
  }

  function deleteSelected(){
    if(!selectedId)return;
    items=items.filter(item=>item.id!==selectedId);
    selectedId=null;
    render();
  }

  function duplicateSelected(){
    const item=getItem(selectedId);
    if(!item)return;
    const copy=JSON.parse(JSON.stringify(item));
    copy.id=uid();
    copy.name=`${item.name} copy`;
    copy.x=clamp(item.x+8,0,screen.width-item.w);
    copy.y=clamp(item.y+8,0,screen.height-item.h);
    copy.z=maxZ()+1;
    items.push(copy);
    selectedId=copy.id;
    render();
  }

  function applyScreen(){
    phone.style.width=`${screen.width}px`;
    phone.style.height=`${screen.height}px`;
    phone.style.transform=`scale(${zoom})`;
    $('zoomValue').textContent=`${Math.round(zoom*100)}%`;
    surface.classList.toggle('hideGuides',!$('showGuides').checked);
  }

  function serialise(){
    return{
      version:1,
      game:'Gridline Racing',
      screen:{...screen},
      guideRatios:[0.2,0.6],
      items:items.map(item=>({...item}))
    };
  }

  function applyLayout(data){
    if(!data||!data.screen||!Array.isArray(data.items))throw new Error('Invalid layout JSON');
    screen={
      width:Math.max(240,Number(data.screen.width)||390),
      height:Math.max(480,Number(data.screen.height)||844)
    };
    items=data.items.map(item=>({
      ...item,
      id:item.id||uid(),
      x:Number(item.x)||0,y:Number(item.y)||0,
      w:Math.max(4,Number(item.w)||40),h:Math.max(4,Number(item.h)||40),
      z:Number(item.z)||1,opacity:item.opacity==null?1:Number(item.opacity),
      ratio:Number(item.ratio)||((Number(item.w)||40)/(Number(item.h)||40))
    }));
    selectedId=null;

    const preset=`${screen.width}x${screen.height}`;
    if([...$('screenPreset').options].some(o=>o.value===preset))$('screenPreset').value=preset;
    applyScreen();
    render();
  }

  function saveToStorage(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(serialise()));
    flashButton($('saveLocal'),'Saved');
  }

  function loadFromStorage(notify=true){
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw){
      if(notify)flashButton($('loadLocal'),'Nothing saved');
      return;
    }
    try{
      applyLayout(JSON.parse(raw));
      if(notify)flashButton($('loadLocal'),'Loaded');
    }catch(error){
      console.error(error);
      if(notify)alert('The saved layout could not be loaded.');
    }
  }

  function downloadJSON(){
    const blob=new Blob([JSON.stringify(serialise(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='gridline-race-layout.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  async function copyJSON(){
    try{
      await navigator.clipboard.writeText(JSON.stringify(serialise(),null,2));
      flashButton($('copyJson'),'Copied');
    }catch{
      alert('Clipboard access was blocked. Use Download layout JSON instead.');
    }
  }

  async function importJSON(event){
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      const text=await file.text();
      applyLayout(JSON.parse(text));
    }catch(error){
      console.error(error);
      alert('That file is not a valid Gridline layout JSON file.');
    }finally{
      event.target.value='';
    }
  }

  function flashButton(button,label){
    const original=button.textContent;
    button.textContent=label;
    setTimeout(()=>button.textContent=original,1000);
  }

  init();
})();
