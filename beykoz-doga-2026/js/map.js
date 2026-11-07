/* Beykoz Doğa Koleji: Güz/Bahar haritalarıyla aynı denetimler, tek kampüs verisi. */
(async function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>String(Math.floor(t/60)).padStart(2,'0')+'.'+String(Math.floor(t%60)).padStart(2,'0');
let map;
try{
 const get=async path=>{const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error(path+': '+r.status);return r.json()};
 const CFG=await get(document.body.dataset.mapConfig),DATA=await get(CFG.observations_url);
 const valid=DATA.filter(d=>d.map_visible!==false&&Number.isFinite(d.lat)&&Number.isFinite(d.lon));
 if(DATA.length!==CFG.total_observations)throw Error('Gözlem toplamı uyuşmuyor');
 const params=new URLSearchParams(location.search);
 for(const u of [...new Set(DATA.map(d=>d.user))].sort((a,b)=>a.localeCompare(b,'tr')))$('observer').add(new Option(u,u));
 for(const [key,[label]] of Object.entries(CFG.groups))if(DATA.some(d=>d.group===key))$('taxa').add(new Option(label,key));
 if([...$('observer').options].some(x=>x.value===params.get('observer')))$('observer').value=params.get('observer');
 if(['research','needs_id'].includes(params.get('quality')))$('quality').value=params.get('quality');
 const focusTaxon=String(params.get('taxon')||'');
 if(focusTaxon&&DATA.some(x=>String(x.taxon)===focusTaxon)){
  const p=document.createElement('p');p.className='selection-summary';p.textContent='Canlı filtresi: '+DATA.find(x=>String(x.taxon)===focusTaxon).name+' · ';
  const a=document.createElement('a');a.href='./';a.textContent='Filtreyi kaldır';p.append(a);document.querySelector('.map-card').before(p);
 }
 map=L.map('map',{minZoom:CFG.min_zoom||14,maxZoom:CFG.max_zoom||21,zoomSnap:.25,preferCanvas:true});
 map.attributionControl.setPrefix('');map.setMaxBounds(L.latLngBounds(CFG.max_bounds));
 const layers={embedded:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'}),osm:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'})};
 let basemap=layers.embedded.addTo(map);L.control.scale({imperial:false}).addTo(map);
 const boundary=await get(CFG.boundary_url);
 map.createPane('campusBoundary');map.getPane('campusBoundary').style.zIndex=420;map.getPane('campusBoundary').style.pointerEvents='none';
 L.geoJSON(boundary,{pane:'campusBoundary',interactive:false,style:{color:'#fff5b0',weight:2,opacity:.9,dashArray:'7 5',fill:false}}).addTo(map);
 const gps=d=>d.status==='gps_explicit'||d.status==='gps_likely';
 let view='heat',visible=[],filtered=[],intensityScale=null,playing=false,timer=null;
 const hues=[[45,107,255],[20,223,242],[254,242,83],[255,145,16],[255,43,87]];
 const heatColor=v=>{const z=Math.min(.9999,Math.max(0,v))*4,i=Math.floor(z),f=z-i;return hues[i].map((x,k)=>Math.round(x+(hues[i+1][k]-x)*f))};
 function selected(withTime=true){const u=$('observer').value,g=$('taxa').value,s=$('source').value,q=$('quality').value,mode=$('timeMode').value,t=+$('timeRange').value;
  return valid.filter(d=>(u==='all'||d.user===u)&&(g==='all'||d.group===g)&&(s==='reliable'||(s==='gps'?gps(d):d.status==='estimated'))&&(q==='all'||d.quality===q)&&(!focusTaxon||String(d.taxon)===focusTaxon)&&(!withTime||mode==='all'||(Number.isFinite(d.t)&&d.t<=t&&(mode==='cumulative'||d.t>=t-30))));}
 const active=()=>view==='paths'?visible.filter(gps):visible;
 function density(rows,w,h){const step=4,gw=Math.ceil(w/step),gh=Math.ceil(h/step),arr=new Float32Array(gw*gh),cen=map.getCenter(),mpp=Math.max(.01,map.distance(cen,map.containerPointToLatLng(map.latLngToContainerPoint(cen).add([100,0])))/100),smooth=+$('smooth').value;
  for(const d of rows){const p=map.latLngToContainerPoint([d.lat,d.lon]),unc=d.status==='estimated'?(d.radius||80):(d.radius||15),effective=Math.sqrt(smooth*smooth+(unc/2)**2),sig=Math.max(1.2,effective/mpp/step),r=Math.ceil(sig*2.8),cx=p.x/step,cy=p.y/step,weight=smooth*smooth/(effective*effective);if(cx+r<0||cy+r<0||cx-r>gw||cy-r>gh)continue;
   for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(gh,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(gw,Math.ceil(cx+r));x++)arr[y*gw+x]+=weight*Math.exp(-((x-cx)**2+(y-cy)**2)/(2*sig*sig));}
  return {arr,gw,gh};}
 const Overlay=L.Layer.extend({
  onAdd(m){this.canvas=L.DomUtil.create('canvas','observation-canvas');this.canvas.style.pointerEvents='none';this.canvas.style.position='absolute';m.getPanes().overlayPane.appendChild(this.canvas);m.on('moveend resize zoomend',this.draw,this);this.draw()},
  onRemove(m){m.off('moveend resize zoomend',this.draw,this);this.canvas.remove()},
  draw(){if(!this.canvas)return;const size=map.getSize(),el=this.canvas,dpr=window.devicePixelRatio||1;el.width=Math.round(size.x*dpr);el.height=Math.round(size.y*dpr);el.style.width=size.x+'px';el.style.height=size.y+'px';L.DomUtil.setPosition(el,map.containerPointToLayerPoint([0,0]));const ctx=el.getContext('2d');ctx.scale(dpr,dpr);
   if(view==='heat'){
    if(intensityScale===null)intensityScale=density(filtered,size.x,size.y).arr.reduce((a,b)=>Math.max(a,b),.1);
    const {arr,gw,gh}=density(visible,size.x,size.y),off=document.createElement('canvas');off.width=gw;off.height=gh;const oc=off.getContext('2d'),im=oc.createImageData(gw,gh);
    for(let i=0;i<arr.length;i++){const v=Math.min(1,arr[i]/intensityScale*+$('visibility').value);if(v<.0018)continue;const co=heatColor(Math.pow(v,.45));im.data[i*4]=co[0];im.data[i*4+1]=co[1];im.data[i*4+2]=co[2];im.data[i*4+3]=Math.min(235,40+215*Math.pow(v,.23))*Math.min(1,v/.02)}
    oc.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,size.x,size.y);
   }else if(view==='coverage'||view==='richness'){
    const [originLat,originLon]=CFG.coverage_origin,my=111195,mx=my*Math.cos(originLat*Math.PI/180),cells=new Map(),cell=50;
    for(const d of visible){if(view==='richness'&&!d.species)continue;const x=Math.floor((d.lon-originLon)*mx/cell),y=Math.floor((d.lat-originLat)*my/cell),key=x+','+y;if(!cells.has(key))cells.set(key,{x,y,values:new Set()});cells.get(key).values.add(view==='richness'?d.species:d.user)}
    const max=Math.max(1,...[...cells.values()].map(z=>z.values.size));for(const z of cells.values()){const a=map.latLngToContainerPoint([originLat+(z.y+1)*cell/my,originLon+z.x*cell/mx]),b=map.latLngToContainerPoint([originLat+z.y*cell/my,originLon+(z.x+1)*cell/mx]),co=heatColor(z.values.size/max);ctx.fillStyle=`rgba(${co.join(',')},.78)`;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);if(b.x-a.x>28){ctx.fillStyle='#17251c';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(z.values.size,(a.x+b.x)/2,(a.y+b.y)/2+4)}}
   }else{
    if(view==='paths'){const byUser=new Map();for(const d of active().filter(x=>Number.isFinite(x.t))){if(!byUser.has(d.user))byUser.set(d.user,[]);byUser.get(d.user).push(d)}
     ctx.lineWidth=$('observer').value==='all'?1.1:2.4;ctx.strokeStyle=$('observer').value==='all'?'rgba(225,250,232,.6)':'#8dffd2';for(const rows of byUser.values()){rows.sort((a,b)=>a.t-b.t);for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],sec=(b.t-a.t)*60,dist=map.distance([a.lat,a.lon],[b.lat,b.lon]);if(sec<=0||sec>1200||dist/sec>2)continue;const p=map.latLngToContainerPoint([a.lat,a.lon]),q=map.latLngToContainerPoint([b.lat,b.lon]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}
    for(const d of active()){const p=map.latLngToContainerPoint([d.lat,d.lon]),r=view==='paths'?2.1:3.5;ctx.fillStyle=d.status==='estimated'?'#ffc376':'#8ff4cc';ctx.strokeStyle=d.status==='estimated'?'#795621':'#245441';ctx.lineWidth=.7;ctx.beginPath();if(d.status==='estimated'){ctx.moveTo(p.x,p.y-r-1);ctx.lineTo(p.x+r,p.y+r);ctx.lineTo(p.x-r,p.y+r);ctx.closePath()}else ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
   }
  }
 });
 const overlay=new Overlay().addTo(map);
 function update(rescale=false){if(rescale)intensityScale=null;filtered=selected(false);visible=selected(true);const rows=active();$('shownCount').textContent=rows.length.toLocaleString('tr-TR');$('clock').textContent=$('timeMode').value==='all'?'Tüm gün':fmt(+$('timeRange').value);$('smoothValue').textContent=$('smooth').value+' m';$('visibilityValue').textContent=Number($('visibility').value).toLocaleString('tr-TR')+'×';$('selectionSummary').textContent=`Gösterilen: ${rows.length.toLocaleString('tr-TR')} / ${DATA.length.toLocaleString('tr-TR')} kayıt`;
  $('legend').innerHTML=['heat','coverage','richness'].includes(view)?`<span>${view==='heat'?'Göreli gözlem yoğunluğu':view==='coverage'?'50 m hücrede gözlemci sayısı':'50 m hücrede tür düzeyinde teşhis sayısı'}</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>`:view==='paths'?'<span>GPS adayları arasında zaman sıralı bağlantılar</span>':'<div class="legend-dots"><span><i class="legend-dot"></i>GPS adayı</span><span><i class="legend-triangle">▲</i>Yaklaşık</span></div>';
  overlay.draw()}
 map.on('click',e=>{const near=active().map(d=>({d,dist:map.latLngToContainerPoint([d.lat,d.lon]).distanceTo(e.containerPoint)})).filter(x=>x.dist<16).sort((a,b)=>a.dist-b.dist).slice(0,8);if(!near.length)return;const content=near.map(({d})=>{const refs=(d.anchors||[]).slice(0,4).map(id=>`<a href="https://www.inaturalist.org/observations/${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer">${esc(id)}</a>`).join(' · ');return `<article class="popup-row"><b><i>${esc(d.name)}</i></b>${d.common?'<br>'+esc(d.common):''}<br>@${esc(d.user)} · ${fmt(d.t)}<br><strong>${esc(CFG.statuses[d.status]?.[0]||d.status)}</strong>${d.status==='estimated'?'<br>Yaklaşık çevre: '+esc(d.radius)+' m':''}<p>${esc(d.reason)}</p>${refs?'<small>Referans gözlemler: '+refs+'</small><br>':''}<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">iNaturalist gözlemini aç</a></article>`}).join('');L.popup({maxWidth:350,maxHeight:330}).setLatLng(e.latlng).setContent(content).openOn(map)});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});update(true)});
 function stop(){playing=false;clearTimeout(timer);$('play').querySelector('span').textContent='Oynat';$('play').querySelector('path').setAttribute('d','m5 3 8 5-8 5z')}
 function tick(){if(!playing)return;const t=+$('timeRange').value;if(t>=+$('timeRange').max){stop();return;}$('timeRange').value=Math.min(+$('timeRange').max,t+Number($('speed').value));update();timer=setTimeout(tick,180)}
 $('play').onclick=()=>{if(playing){stop();return}if($('timeMode').value==='all')$('timeMode').value='cumulative';if(+$('timeRange').value>=+$('timeRange').max)$('timeRange').value=$('timeRange').min;playing=true;$('play').querySelector('span').textContent='Duraklat';$('play').querySelector('path').setAttribute('d','M4 3h3v10H4zm5 0h3v10H9z');tick()};
 for(const id of ['observer','taxa','source','quality'])$(id).onchange=()=>update(true);
 $('timeRange').oninput=()=>{if($('timeMode').value==='all')$('timeMode').value='cumulative';update()};$('timeMode').onchange=()=>{stop();update()};
 $('smooth').oninput=()=>update(true);$('visibility').oninput=()=>update();
 $('filterToggle').onclick=()=>{const show=$('filterPanel').hidden;$('filterPanel').hidden=!show;$('filterToggle').setAttribute('aria-expanded',String(show))};
 $('resetFilters').onclick=()=>{$('source').value='reliable';$('observer').value='all';$('taxa').value='all';$('quality').value='all';update(true)};
 $('basemap').onchange=()=>{map.removeLayer(basemap);basemap=layers[$('basemap').value];basemap.addTo(map)};
 $('fit').onclick=()=>{const rows=active();map.fitBounds(rows.length?L.latLngBounds(rows.map(d=>[d.lat,d.lon])).pad(.08):CFG.fit_bounds,{maxZoom:19})};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 const times=valid.filter(d=>Number.isFinite(d.t)).map(d=>d.t);let begin=Math.floor(Math.min(...times)/10)*10,finish=Math.ceil(Math.max(...times)/10)*10;
 $('timeRange').min=begin;$('timeRange').max=finish;$('timeRange').value=finish;
 document.querySelector('.time-labels>span:first-child').textContent=fmt(begin);document.querySelector('.time-labels>span:last-child').textContent=fmt(finish);
 $('smooth').value=CFG.default_smoothing||30;$('visibility').value=CFG.default_visibility||2.5;
 map.fitBounds(CFG.fit_bounds);update(true);
 if(focusTaxon&&visible.length)map.fitBounds(L.latLngBounds(visible.map(d=>[d.lat,d.lon])).pad(.2),{maxZoom:18});
}catch(e){console.error('Beykoz Tür Say haritası:',e);$('map').textContent='Harita yüklenemedi. Sayfayı GitHub Pages üzerinden açın ve verileri kontrol edin.'}
})();