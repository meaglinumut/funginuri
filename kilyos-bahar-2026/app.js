/* Kilyos Bahar 2026. Perspektif değiştirilmeden EPSG:3857 homografi ile piksel üzerinde gözlem haritası. */
(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2,'0')}.${String(Math.floor(n % 60)).padStart(2,'0')}`;
  const getJSON = async (url) => {const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json();};
  let timer = null, playing = false, view = 'heat', activeRows = [], allRows = [], photoRows = [], map, layer, cal, groups;
  const modes = document.querySelectorAll('[data-view]');
  function webMercator(lat,lon){const rad = Math.PI/180, clamped = Math.max(-85.0511287, Math.min(85.0511287, lat));return [6378137*lon*rad, 6378137*Math.log(Math.tan(Math.PI/4+clamped*rad/2))];}
  function inverseMercator(x,y){return [180/Math.PI*(2*Math.atan(Math.exp(y/6378137))-Math.PI/2), x/6378137*180/Math.PI];}
  function apply(H,x,y){let w=H[2][0]*x+H[2][1]*y+H[2][2];if(Math.abs(w)<1e-12)return null;return {x:(H[0][0]*x+H[0][1]*y+H[0][2])/w,y:(H[1][0]*x+H[1][1]*y+H[1][2])/w};}
  const which=()=>$('calibration').value;
  function geoPixel(lat,lon){const xy=webMercator(lat,lon);return groundPixel(xy[0],xy[1]);}
  function groundPixel(e,n){return apply(cal.modes[which()].ground_to_pixel,e-cal.origin[0],n-cal.origin[1]);}
  function pixelGeo(x,y){const p=apply(cal.modes[which()].pixel_to_ground,x,y);return p?inverseMercator(p.x+cal.origin[0],p.y+cal.origin[1]):null;}
  const inFrame=(p)=>p && p.x>=0 && p.x<=cal.width && p.y>=0 && p.y<=cal.height;
  const LPoint=(p)=>L.latLng(-p.y,p.x);
  const mPoint=(p)=>map.latLngToContainerPoint(LPoint(p));
  const isGps = (d)=>d.status==='gps_explicit'||d.status==='gps_likely';
  const groupColors={Plantae:'#a8cc09',Fungi:'#ff1493',Insecta:'#ff6300',Arachnida:'#ff8d00',Mollusca:'#ff4500',Animalia:'#1e90ff',Mammalia:'#2bceff',Reptilia:'#1978d5',Aves:'#1565b3',Amphibia:'#35b7a7',Actinopterygii:'#2496cf',Chromista:'#826fc7',Protozoa:'#9875c6',Unidentified:'#999999'};
  function projectData(){photoRows=allRows.map(d=>({...d,p:d.map_visible!==false&&Number.isFinite(d.lat)&&Number.isFinite(d.lon)?geoPixel(d.lat,d.lon):null})).filter(d=>inFrame(d.p));$('photoCount').textContent=photoRows.length.toLocaleString('tr-TR');$('observerCount').textContent=new Set(photoRows.map(d=>d.user)).size.toLocaleString('tr-TR');update(true);}
  function chooseRows(useTime=true){const user=$('observer').value,taxon=$('taxa').value,quality=$('quality').value,source=$('source').value,tMode=$('timeMode').value,t=+$('timeRange').value;
    return photoRows.filter(d=>(user==='all'||d.user===user)&&(taxon==='all'||d.group===taxon)&&(quality==='all'||d.quality===quality)&&(source==='all'||(source==='gps'?isGps(d):d.status==='estimated'))&&(!useTime||tMode==='all'||(Number.isFinite(d.t)&&d.t<=t&&(tMode==='cumulative'||d.t>=t-30))));
  }
  function observerOptions(){for(const user of [...new Set(allRows.map(d=>d.user))].sort((a,b)=>a.localeCompare(b,'tr')))$('observer').add(new Option(user,user));
    const present=new Set(allRows.map(d=>d.group));for(const [group,label] of Object.entries(groups)){if(present.has(group))$('taxa').add(new Option(label[0],group));}
    for(const group of [...present].filter(x=>!groups[x]).sort())$('taxa').add(new Option(group,group));
  }
  // Her zaman görünür olan fotoğraf düzlemine bağlı, Canvas üst katmanı.
  const CanvasLayer=L.Layer.extend({
    onAdd(m){this.canvas=L.DomUtil.create('canvas','kilyos-data-canvas');this.canvas.style.cssText='position:absolute;pointer-events:none;';m.getPanes().overlayPane.appendChild(this.canvas);m.on('moveend zoomend resize',this.render,this);this.render();},
    onRemove(m){m.off('moveend zoomend resize',this.render,this);this.canvas.remove();},
    render(){if(!this.canvas)return;const sz=map.getSize(),scale=Math.min(window.devicePixelRatio||1,2);if(sz.x<1||sz.y<1)return;let c=this.canvas;c.width=Math.ceil(sz.x*scale);c.height=Math.ceil(sz.y*scale);c.style.width=sz.x+'px';c.style.height=sz.y+'px';L.DomUtil.setPosition(c,map.containerPointToLayerPoint(L.point(0,0)));
      const ctx=c.getContext('2d',{alpha:true});ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,sz.x,sz.y);
      if(view==='heat')drawHeat(ctx,sz);else {if(view==='paths')drawPaths(ctx);drawPoints(ctx);}
    }
  });
  function drawPoints(ctx){for(const d of activeRows){const p=mPoint(d.p);const r=view==='paths'?2.4:3.8;if(p.x<-15||p.y<-15||p.x>map.getSize().x+15||p.y>map.getSize().y+15)continue;
      ctx.beginPath();if(d.status==='estimated'){ctx.moveTo(p.x,p.y-r-1);ctx.lineTo(p.x+r,p.y+r);ctx.lineTo(p.x-r,p.y+r);ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.fillStyle=groupColors[d.group]||'#aaaaaa';ctx.strokeStyle=d.status==='estimated'?'#624524':'#163b31';ctx.lineWidth=.85;ctx.fill();ctx.stroke();}}
  function drawPaths(ctx){const groups=new Map();for(const d of activeRows.filter(d=>isGps(d)&&Number.isFinite(d.t))){const key=d.user+'|'+d.date;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
    ctx.lineWidth=$('observer').value==='all'?1.3:2.5;ctx.strokeStyle=$('observer').value==='all'?'rgba(255,250,230,.65)':'#f2ff99';
    for(let points of groups.values()){points.sort((a,b)=>a.t-b.t);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dt=(b.t-a.t)*60;if(dt<=0||dt>1200)continue;
      const xa=webMercator(a.lat,a.lon),xb=webMercator(b.lat,b.lon),meters=Math.hypot(xb[0]-xa[0],xb[1]-xa[1])*.75;if(meters/dt>2)continue;
      const pa=mPoint(a.p),pb=mPoint(b.p);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}}
  }
  // Isı yarıçapı metre cinsinden: perspektifin nokta bazında iki yönlü türeviyle elipse dönüştürülür.
  function drawHeat(ctx,sz){const divisor=3,w=Math.ceil(sz.x/divisor),h=Math.ceil(sz.y/divisor);
    const off=document.createElement('canvas');off.width=w;off.height=h;const dc=off.getContext('2d');
    dc.globalCompositeOperation='lighter';const smooth=+$('smooth').value;const grad=dc.createRadialGradient(0,0,0,0,0,2.5);grad.addColorStop(0,'rgba(22,22,22,.32)');grad.addColorStop(.37,'rgba(20,20,20,.12)');grad.addColorStop(1,'rgba(0,0,0,0)');
    for(const d of activeRows){const center=mPoint(d.p);if(center.x< -250||center.y< -250||center.x>sz.x+250||center.y>sz.y+250)continue;
      const xy=webMercator(d.lat,d.lon), meter=smooth/(Math.cos(d.lat*Math.PI/180)),pe=groundPixel(xy[0]+meter,xy[1]),pn=groundPixel(xy[0],xy[1]+meter);
      if(!pe||!pn)continue;const e=mPoint(pe),n=mPoint(pn);const xx=(e.x-center.x)/divisor,yx=(e.y-center.y)/divisor,xy2=(n.x-center.x)/divisor,yy=(n.y-center.y)/divisor;
      const det=xx*yy-yx*xy2;if(Math.abs(det)<.000001)continue;dc.save();dc.translate(center.x/divisor,center.y/divisor);dc.transform(xx,yx,xy2,yy,0,0);dc.fillStyle=grad;dc.beginPath();dc.arc(0,0,2.5,0,Math.PI*2);dc.fill();dc.restore();}
    const raw=dc.getImageData(0,0,w,h),pixels=raw.data,visibility=+$('visibility').value;
    for(let i=0;i<pixels.length;i+=4){const v=Math.min(1,pixels[i]/255*visibility);if(v<.015){pixels[i+3]=0;continue;}
      const t=Math.pow(v,.67);let col;if(t<.33){let z=t/.33;col=[Math.round(36+4*z),Math.round(101+111*z),Math.round(235-60*z)];}
      else if(t<.68){let z=(t-.33)/.35;col=[Math.round(40+215*z),Math.round(212+20*z),Math.round(175-88*z)];}
      else {let z=(t-.68)/.32;col=[255,Math.round(232-155*z),Math.round(87-58*z)];}
      pixels[i]=col[0];pixels[i+1]=col[1];pixels[i+2]=col[2];pixels[i+3]=Math.round(Math.min(229,245*Math.pow(v,.58)));}
    dc.putImageData(raw,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,sz.x,sz.y);
  }
  function update(){const selected=chooseRows();activeRows=selected;$('shownCount').textContent=selected.length.toLocaleString('tr-TR');$('selectionSummary').textContent=`Fotoğraf kapsamındaki ${photoRows.length.toLocaleString('tr-TR')} kayıttan ${selected.length.toLocaleString('tr-TR')} tanesi gösteriliyor. Kilyos toplamı: ${allRows.length.toLocaleString('tr-TR')} gözlem.`;
    $('clock').textContent=$('timeMode').value==='all'?'Tüm gün':fmt(+$('timeRange').value);$('smoothValue').textContent=$('smooth').value+' m';$('visibilityValue').textContent=Number($('visibility').value).toLocaleString('tr-TR')+'×';
    $('heatSettings').style.display=view==='heat'?'':'none';$('legend').innerHTML=view==='heat'?'<span>Göreli gözlem yoğunluğu</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>':view==='paths'?'<span>GPS adaylarının zamansal bağlantıları · aynı kullanıcı, ≤20 dakika</span>':'<div class="legend-dots"><span>● Canlı grubuna göre renk</span><span>▲ Tahmini konum</span></div>';
    layer?.render();
  }
  function setTimeLimits(){const values=photoRows.filter(d=>Number.isFinite(d.t)).map(d=>d.t);let a=values.length?Math.floor(Math.min(...values)/15)*15:480,b=values.length?Math.ceil(Math.max(...values)/15)*15:1200;a=Math.max(0,a);b=Math.min(1439,Math.max(a+30,b));$('timeRange').min=a;$('timeRange').max=b;$('timeRange').value=b;$('startClock').textContent=fmt(a);$('endClock').textContent=fmt(b);}
  function stop(){playing=false;clearTimeout(timer);$('play').querySelector('span').textContent='▶ Oynat';}
  function tick(){if(!playing)return;let t=+$('timeRange').value,max=+$('timeRange').max;if(t>=max){stop();return;}$('timeRange').value=Math.min(max,t+Number($('speed').value));update();timer=setTimeout(tick,155);}
  function onMapClick(e){const cp=e.containerPoint,close=activeRows.map(d=>({d,dist:mPoint(d.p).distanceTo(cp)})).filter(z=>z.dist<16).sort((a,b)=>a.dist-b.dist).slice(0,5);
    if(!close.length){const p={x:e.latlng.lng,y:-e.latlng.lat};if(!inFrame(p))return;const pos=pixelGeo(p.x,p.y);if(!pos)return;L.popup().setLatLng(e.latlng).setContent(`<div class="photo-point-popup"><b>Yaklaşık koordinat</b><p>${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}</p><small>Piksel: ${p.x.toFixed(0)}, ${p.y.toFixed(0)} · Projektif dönüşüm, yükseklik etkileri dikkate alınmadı</small></div>`).openOn(map);return;}
    const html=close.map(({d})=>`<div class="photo-point-popup"><h3>${esc(d.name)}</h3>${d.common?`<small>${esc(d.common)}</small>`:''}${/^https:\/\//.test(d.image||'')?`<img loading="lazy" src="${esc(d.image)}" alt="${esc(d.name)}">`:''}<p><strong>@${esc(d.user)}</strong> · ${esc(d.date)}${Number.isFinite(d.t)?' · '+fmt(d.t):''}</p><p>${d.status==='estimated'?'Tahmini konum':'GPS adayı / kaynak GPS'}${Number.isFinite(d.radius)?` · Bildirilen belirsizlik ~${Math.round(d.radius)} m`:''}</p><a href="${esc(d.url)}" target="_blank" rel="noopener">iNaturalist gözlemini aç</a></div>`).join('<hr>');L.popup({maxWidth:325,maxHeight:355}).setLatLng(e.latlng).setContent(html).openOn(map);
  }
  try{
    const [meta,cfg]=await Promise.all([getJSON('calibration.json'),getJSON('../bahar-2026/data/config.json')]);cal=meta;groups=cfg.groups;
    const manifest=await getJSON('../bahar-2026/'+cfg.observations_manifest);
    const dataset=(await Promise.all(manifest.chunks.map(x=>getJSON('../bahar-2026/data/'+x)))).flat();
    if(dataset.length!==manifest.count)throw Error('Veri parçaları tamamlanamadı');
    allRows=dataset.filter(d=>d.campus==='kilyos');$('totalCount').textContent=allRows.length.toLocaleString('tr-TR');$('mappedCount').textContent=allRows.filter(d=>d.map_visible!==false&&Number.isFinite(d.lat)&&Number.isFinite(d.lon)).length.toLocaleString('tr-TR');
    observerOptions();
    map=L.map('map',{crs:L.CRS.Simple,minZoom:-4,maxZoom:5,zoomSnap:.25,preferCanvas:true,attributionControl:false,zoomControl:true});
    const bounds=[[-cal.height,0],[0,cal.width]];L.imageOverlay('perspective.webp',bounds,{interactive:false,alt:'Kilyos Sarıtepe sahilinin eğik perspektifli fotoğrafı'}).addTo(map);map.fitBounds(bounds,{padding:[5,5]});map.setMaxBounds([[-cal.height-300,-300],[300,cal.width+300]]);
    layer=new CanvasLayer().addTo(map);map.on('click',onMapClick);
    const params=new URLSearchParams(location.search);projectData();setTimeLimits();
    if([...$('observer').options].some(x=>x.value===params.get('observer')))$('observer').value=params.get('observer');
    if([...$('taxa').options].some(x=>x.value===params.get('taxa')))$('taxa').value=params.get('taxa');
    for(const b of modes)b.addEventListener('click',()=>{view=b.dataset.view;modes.forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});update();});
    for(const id of ['observer','taxa','quality','source','visibility','smooth'])$(id).addEventListener(id==='smooth'||id==='visibility'?'input':'change',update);
    $('calibration').addEventListener('change',()=>{stop();projectData();setTimeLimits();update();});
    $('filterToggle').addEventListener('click',()=>{let open=$('filterPanel').hidden;$('filterPanel').hidden=!open;$('filterToggle').setAttribute('aria-expanded',String(open));});
    $('resetFilters').addEventListener('click',()=>{$('observer').value='all';$('taxa').value='all';$('quality').value='all';$('source').value='all';update();});
    $('timeRange').addEventListener('input',()=>{if($('timeMode').value==='all')$('timeMode').value='cumulative';update();});
    $('timeMode').addEventListener('change',()=>{stop();update();});
    $('play').addEventListener('click',()=>{if(playing){stop();return;}if($('timeMode').value==='all')$('timeMode').value='cumulative';if(+$('timeRange').value>=+$('timeRange').max)$('timeRange').value=$('timeRange').min;playing=true;$('play').querySelector('span').textContent='Ⅱ Duraklat';tick();});
    $('fit').addEventListener('click',()=>map.fitBounds(bounds,{padding:[5,5]}));
    $('fullscreen').addEventListener('click',async()=>{const element=$('mapWrap');if(document.fullscreenElement)await document.exitFullscreen();else if(element.requestFullscreen)await element.requestFullscreen();map.invalidateSize();map.fitBounds(bounds,{padding:[5,5]});});
    document.addEventListener('fullscreenchange',()=>{setTimeout(()=>{map.invalidateSize();layer.render();},50);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    update();
  }catch(error){console.error('Kilyos perspektif haritası:',error);$('map').innerHTML='<p style="padding:20px">Harita verileri yüklenemedi. Lütfen sayfayı GitHub Pages üzerinden açıp yeniden deneyin.</p>';$('selectionSummary').textContent='Hata: '+String(error.message||error);}
})();
