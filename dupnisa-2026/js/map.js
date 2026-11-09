/* Bahar 2026: Güz'ün harita modları ve filtreleriyle uyumlu, iki kampüslü Leaflet haritası. */
(async function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=t=>{const day=t>=1440?'18 Eki':'17 Eki',m=((Math.round(t)%1440)+1440)%1440;return day+' '+String(Math.floor(m/60)).padStart(2,'0')+'.'+String(m%60).padStart(2,'0');};
 let map;
 try{
  const get=async path=>{const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error(path+': '+r.status);return r.json();};
  const CFG=await get(document.body.dataset.mapConfig);
  const manifest=await get(CFG.observations_manifest);
  const DATA=(await Promise.all(manifest.chunks.map(f=>get('data/'+f)))).flat();
  if(DATA.length!==manifest.count)throw Error('Gözlem parçaları eksik');
  const boundsGeo=await get(CFG.boundary_url);
  const valid=DATA.filter(d=>d.map_visible!==false&&Number.isFinite(d.lat)&&Number.isFinite(d.lon));
  const params=new URLSearchParams(location.search);
  for(const u of [...new Set(DATA.map(d=>d.user))].sort((a,b)=>a.localeCompare(b,'tr')))$('observer').add(new Option(u,u));
  for(const [key,[label]] of Object.entries(CFG.groups))if(DATA.some(d=>d.group===key))$('taxa').add(new Option(label,key));
  if(['guney','kilyos','all'].includes(params.get('campus')))$('campus').value=params.get('campus');
  if([...$('observer').options].some(x=>x.value===params.get('observer')))$('observer').value=params.get('observer');
  if(['research','needs_id'].includes(params.get('quality')))$('quality').value=params.get('quality');
  const taxon=String(params.get('taxon')||'');
  if(taxon&&DATA.some(x=>String(x.taxon)===taxon)){const p=document.createElement('p');p.className='selection-summary';p.textContent='Canlı filtresi: '+(DATA.find(x=>String(x.taxon)===taxon).name||taxon)+' · ';let a=document.createElement('a');a.href='./';a.textContent='Filtreyi kaldır';p.append(a);document.querySelector('.map-card').before(p);}
  map=L.map('map',{minZoom:CFG.min_zoom||10,maxZoom:CFG.max_zoom||21,preferCanvas:true,zoomSnap:.25});
  map.attributionControl.setPrefix('');
  if(CFG.max_bounds)map.setMaxBounds(L.latLngBounds(CFG.max_bounds).pad(.2));
  const layers={
   embedded:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'}),
   osm:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'})
  };
  let basemap=layers.embedded.addTo(map);L.control.scale({imperial:false}).addTo(map);
  map.createPane('campusBoundary');map.getPane('campusBoundary').style.zIndex=420;map.getPane('campusBoundary').style.pointerEvents='none';
  L.geoJSON(boundsGeo,{pane:'campusBoundary',interactive:false,style:{color:'#f3ddac',weight:2,fill:false}}).addTo(map); if(CFG.entrance)L.circleMarker(CFG.entrance,{radius:9,weight:2,color:'#fff7c2',fillColor:'#2c6643',fillOpacity:.83,interactive:false}).addTo(map);
  const gps=d=>d.status==='entrance'||d.status==='gps_explicit'||d.status==='gps_likely';
  let view='heat',playing=false,timer=null,visible=[],filtered=[],intensityScale=null;
  const hues=[[45,107,255],[20,223,242],[254,242,83],[255,145,16],[255,43,87]];
  const heatColor=v=>{let z=Math.min(.9999,Math.max(0,v))*4,i=Math.floor(z),f=z-i;return hues[i].map((c,j)=>Math.round(c+(hues[i+1][j]-c)*f));};
  function campusFit(){let c=$('campus').value;map.fitBounds(CFG.campus_bounds[c]||CFG.campus_bounds.all,{padding:[15,15],maxZoom:17});}
  function updateTimeLabels(){const rows=valid.filter(x=>$('campus').value==='all'||x.campus===$('campus').value).filter(x=>Number.isFinite(x.t));const a=rows.map(x=>x.t);let start=a.length?Math.floor(Math.min(...a)/20)*20:540,end=a.length?Math.ceil(Math.max(...a)/20)*20:1380;
   start=Math.max(0,start);end=Math.min(2880,Math.max(start+60,end));$('timeRange').min=start;$('timeRange').max=end;$('timeRange').value=end;document.querySelector('.time-labels>span:first-child').textContent=fmt(start);document.querySelector('.time-labels>span:last-child').textContent=fmt(end);$('timeMode').value='all';}
  function selected(withTime=true){let c=$('campus').value,u=$('observer').value,g=$('taxa').value,s=$('source').value,q=$('quality').value,mode=$('timeMode').value,t=+$('timeRange').value;
   return valid.filter(d=>(c==='all'||d.campus===c)&&(u==='all'||d.user===u)&&(g==='all'||d.group===g)&&(s==='reliable'||(s==='gps'?gps(d):d.status==='estimated'))&&(q==='all'||d.quality===q)&&(!taxon||String(d.taxon)===taxon)&&(!withTime||mode==='all'||(Number.isFinite(d.t)&&d.t<=t&&(mode==='cumulative'||d.t>=t-30))));}
  function active(){return view==='paths'?visible.filter(gps):visible;}
  function density(rows,w,h){const step=4,gw=Math.ceil(w/step),gh=Math.ceil(h/step),arr=new Float32Array(gw*gh),cen=map.getCenter(),mpp=map.distance(cen,map.containerPointToLatLng(map.latLngToContainerPoint(cen).add([100,0])))/100,smooth=+$('smooth').value;
   for(const d of rows){const p=map.latLngToContainerPoint([d.lat,d.lon]),uncertainty=d.status==='estimated'?(d.radius||100):(d.radius||15),effective=Math.sqrt(smooth*smooth+(uncertainty/2)**2),sig=Math.max(1.2,effective/mpp/step),r=Math.ceil(sig*2.8),cx=p.x/step,cy=p.y/step,weight=smooth*smooth/(effective*effective);if(cx+r<0||cy+r<0||cx-r>gw||cy-r>gh)continue;
    for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(gh,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(gw,Math.ceil(cx+r));x++)arr[y*gw+x]+=weight*Math.exp(-((x-cx)**2+(y-cy)**2)/(2*sig*sig));}
   return{arr,gw,gh};}
  const Overlay=L.Layer.extend({
   onAdd(m){this.canvas=L.DomUtil.create('canvas','observation-canvas');this.canvas.style.pointerEvents='none';this.canvas.style.position='absolute';m.getPanes().overlayPane.appendChild(this.canvas);m.on('moveend resize zoomend',this.draw,this);this.draw();},
   onRemove(m){m.off('moveend resize zoomend',this.draw,this);this.canvas.remove();},
   draw(){if(!this.canvas)return;const size=map.getSize(),el=this.canvas,dpr=window.devicePixelRatio||1;el.width=Math.round(size.x*dpr);el.height=Math.round(size.y*dpr);el.style.width=size.x+'px';el.style.height=size.y+'px';L.DomUtil.setPosition(el,map.containerPointToLayerPoint([0,0]));const ctx=el.getContext('2d');ctx.scale(dpr,dpr);
    if(view==='heat'){if(intensityScale===null)intensityScale=density(filtered,size.x,size.y).arr.reduce((a,b)=>Math.max(a,b),.1);const{arr,gw,gh}=density(visible,size.x,size.y),off=document.createElement('canvas');off.width=gw;off.height=gh;const oc=off.getContext('2d'),im=oc.createImageData(gw,gh);
     for(let i=0;i<arr.length;i++){let v=Math.min(1,arr[i]/intensityScale*+$('visibility').value);if(v<.0018)continue;let co=heatColor(Math.pow(v,.45));im.data[i*4]=co[0];im.data[i*4+1]=co[1];im.data[i*4+2]=co[2];im.data[i*4+3]=Math.min(235,40+215*Math.pow(v,.23))*Math.min(1,v/.02);}
     oc.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,size.x,size.y);
    }else if(view==='coverage'||view==='richness'){
     const cells=new Map(),cellSize=50;
     for(const d of visible){if(view==='richness'&&!d.species)continue;const my=111195,mx=111195*Math.cos(d.lat*Math.PI/180),x=Math.floor((d.lon-29)*mx/cellSize),y=Math.floor((d.lat-41)*my/cellSize),key=x+','+y+','+d.campus;if(!cells.has(key))cells.set(key,{x,y,campus:d.campus,values:new Set(),mx,my});cells.get(key).values.add(view==='richness'?d.species:d.user);}
     const max=Math.max(1,...[...cells.values()].map(z=>z.values.size));
     for(const z of cells.values()){const a=map.latLngToContainerPoint([41+(z.y+1)*cellSize/z.my,29+z.x*cellSize/z.mx]),b=map.latLngToContainerPoint([41+z.y*cellSize/z.my,29+(z.x+1)*cellSize/z.mx]),co=heatColor(z.values.size/max);ctx.fillStyle=`rgba(${co.join(',')},.78)`;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);if(b.x-a.x>28){ctx.fillStyle='#17251c';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(z.values.size,(a.x+b.x)/2,(a.y+b.y)/2+4);}}
    }else{
     if(view==='paths'){let perUser=new Map();for(const d of active().filter(x=>x.t!==null)){const key=d.user+'|'+d.campus+'|'+d.date;if(!perUser.has(key))perUser.set(key,[]);perUser.get(key).push(d);}
      ctx.lineWidth=$('observer').value==='all'?1.1:2.4;ctx.strokeStyle=$('observer').value==='all'?'rgba(225,250,232,.6)':'#8dffd2';
      for(let row of perUser.values()){row.sort((a,b)=>a.t-b.t);for(let i=1;i<row.length;i++){let x=row[i-1],y=row[i],seconds=(y.t-x.t)*60,dist=map.distance([x.lat,x.lon],[y.lat,y.lon]);if(seconds<=0||seconds>1200||dist/seconds>2)continue;let p=map.latLngToContainerPoint([x.lat,x.lon]),q=map.latLngToContainerPoint([y.lat,y.lon]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}}
     for(const d of active()){let p=map.latLngToContainerPoint([d.lat,d.lon]),r=view==='paths'?2.1:3.5;ctx.fillStyle=d.status==='estimated'?'#ffc376':'#8ff4cc';ctx.strokeStyle=d.status==='estimated'?'#795621':'#245441';ctx.lineWidth=.7;ctx.beginPath();if(d.status==='estimated'){ctx.moveTo(p.x,p.y-r-1);ctx.lineTo(p.x+r,p.y+r);ctx.lineTo(p.x-r,p.y+r);ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
    }
   }
  });
  const overlay=new Overlay().addTo(map);
  function update(rescale=false){if(rescale)intensityScale=null;filtered=selected(false);visible=selected(true);const rows=active();$('shownCount').textContent=rows.length.toLocaleString('tr-TR');$('clock').textContent=$('timeMode').value==='all'?'Tüm gün':fmt(+$('timeRange').value);$('smoothValue').textContent=$('smooth').value+' m';$('visibilityValue').textContent=Number($('visibility').value).toLocaleString('tr-TR')+'×';$('selectionSummary').textContent=`Gösterilen: ${rows.length.toLocaleString('tr-TR')} / ${DATA.length.toLocaleString('tr-TR')} kayıt`;
   $('legend').innerHTML=['heat','coverage','richness'].includes(view)?`<span>${view==='heat'?'Göreli gözlem yoğunluğu':view==='coverage'?'50 m hücrede gözlemci sayısı':'50 m hücrede tür sayısı'}</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>`:view==='paths'?'<span>Gözlem noktaları</span>':'<div class="legend-dots"><span><i class="legend-dot"></i>Gözlem noktaları</span></div>';
   overlay.draw();}
  map.on('click',e=>{let chosen=active().map(d=>({d,dist:map.latLngToContainerPoint([d.lat,d.lon]).distanceTo(e.containerPoint)})).filter(z=>z.dist<16).sort((a,b)=>a.dist-b.dist);if(!chosen.length)return;const html=chosen.map(({d})=>{let references=(d.anchors||[]).slice(0,4).map(id=>`<a href="https://www.inaturalist.org/observations/${encodeURIComponent(id)}" target="_blank" rel="noopener">${esc(id)}</a>`).join(' · ');return `<article class="popup-row"><b><i>${esc(d.name)}</i></b>${d.common?'<br>'+esc(d.common):''}<br>@${esc(d.user)} · ${esc(d.date)} · ${Number.isFinite(d.t)?fmt(d.t):'Saat yok'}${d.reason?'<p>'+esc(d.reason)+'</p>':''}${references?'<small>Konum referansları: '+references+'</small><br>':''}<a href="${esc(d.url)}" target="_blank" rel="noopener">iNaturalist gözlemini aç</a></article>`;}).join('');L.popup({maxWidth:340,maxHeight:330}).setLatLng(e.latlng).setContent(html).openOn(map);});
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});update(true);};
  function stop(){playing=false;clearTimeout(timer);$('play').querySelector('span').textContent='Oynat';$('play').querySelector('path').setAttribute('d','m5 3 8 5-8 5z');}
  function tick(){if(!playing)return;let t=+$('timeRange').value;if(t>=+$('timeRange').max){stop();return;}$('timeRange').value=Math.min(+$('timeRange').max,t+Number($('speed').value));update();timer=setTimeout(tick,180);}
  $('play').onclick=()=>{if(playing){stop();return;}if($('timeMode').value==='all')$('timeMode').value='cumulative';if(+$('timeRange').value>=+$('timeRange').max)$('timeRange').value=$('timeRange').min;playing=true;$('play').querySelector('span').textContent='Duraklat';$('play').querySelector('path').setAttribute('d','M4 3h3v10H4zm5 0h3v10H9z');tick();};
  $('campus').onchange=()=>{stop();updateTimeLabels();campusFit();update(true);};
  for(const id of ['observer','taxa','source','quality'])$(id).onchange=()=>update(true);
  $('timeRange').oninput=()=>{if($('timeMode').value==='all')$('timeMode').value='cumulative';update();};$('timeMode').onchange=()=>{stop();update();};
  $('smooth').oninput=()=>update(true);$('visibility').oninput=()=>update();
  $('filterToggle').onclick=()=>{const open=$('filterPanel').hidden;$('filterPanel').hidden=!open;$('filterToggle').setAttribute('aria-expanded',String(open));};
  $('resetFilters').onclick=()=>{$('source').value='reliable';$('observer').value='all';$('taxa').value='all';$('quality').value='all';update(true);};
  $('basemap').onchange=()=>{map.removeLayer(basemap);basemap=layers[$('basemap').value];basemap.addTo(map);};
  $('fit').onclick=()=>{const rows=active();rows.length?map.fitBounds(CFG.fit_bounds,{padding:[15,15],maxZoom:17}):campusFit();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  updateTimeLabels();campusFit();
  $('smooth').value=CFG.default_smoothing||30;$('visibility').value=CFG.default_visibility||2.5;
  update(true);
  if(taxon&&visible.length)map.fitBounds(CFG.fit_bounds,{padding:[15,15],maxZoom:17});
 }catch(e){console.error('Dupnisa haritası:',e);$('map').textContent='Harita veya konum verileri yüklenemedi. GitHub Pages üzerinden açın ve veri dosyalarını kontrol edin.';}
})();