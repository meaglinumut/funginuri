(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(Math.floor(m % 60)).padStart(2, '0')}`;
  try {
    const [DATA, CFG] = await Promise.all(['data/observations.json', 'data/config.json'].map(u => fetch(u).then(r => { if (!r.ok) throw Error(r.status); return r.json(); })));
    const gps = d => d.status === 'gps_explicit' || d.status === 'gps_likely';
    const located = DATA.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
    for (const user of [...new Set(DATA.map(d => d.user))].sort()) $('observer').add(new Option(user, user));
    for (const [key, [label]] of Object.entries(CFG.groups)) if (DATA.some(d => d.group === key)) $('taxa').add(new Option(label, key));
    const initialUser = new URLSearchParams(location.search).get('observer');
    if ([...$('observer').options].some(o => o.value === initialUser)) $('observer').value = initialUser;
    const map = L.map('map', {minZoom: 13, maxZoom: 21, zoomSnap: .25, preferCanvas: true});
    map.attributionControl.setPrefix('');
    const embedded = L.imageOverlay(CFG.satellite, CFG.bounds, {attribution: 'Esri, Vantor, Earthstar Geographics, GIS User Community'});
    const layers = {
      embedded,
      osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'})
    };
    let basemap = embedded; basemap.addTo(map);
    L.control.scale({imperial: false}).addTo(map);
    let view = 'heat', visible = [], filtered = [], scale = null, playing = false, timer = null;
    const originalBounds = L.latLngBounds(located.filter(d => gps(d) || d.status === 'estimated').map(d => [d.lat, d.lon]));
    map.fitBounds(originalBounds.pad(.08));
    const colors = [[45,107,255], [20,223,242], [254,242,83], [255,145,16], [255,43,87]];
    function color(v) {const z = Math.min(.9999, Math.max(0,v))*4, i = Math.floor(z), f=z-i; return colors[i].map((x,k)=>Math.round(x+(colors[i+1][k]-x)*f));}
    function selectRows(time = true) {
      const source = $('source').value, user = $('observer').value, group = $('taxa').value, quality = $('quality').value, mode = $('timeMode').value, end = +$('timeRange').value;
      return located.filter(d => (source === 'reliable' ? gps(d) || d.status === 'estimated' : source === 'gps' ? gps(d) : d.status === 'estimated') && (user === 'all' || d.user === user) && (group === 'all' || d.group === group) && (quality === 'all' || d.quality === quality) && (!time || mode === 'all' || (d.t !== null && d.t <= end && (mode === 'cumulative' || d.t >= end - 30))));
    }
    const active = () => view === 'paths' ? visible.filter(gps) : visible;
    function density(rows, w, h) {
      const step = 4, gw=Math.ceil(w/step), gh=Math.ceil(h/step), arr=new Float32Array(gw*gh), center=map.getCenter();
      const mpp=map.distance(center,map.containerPointToLatLng(map.latLngToContainerPoint(center).add([100,0])))/100, sigma=+$('smooth').value;
      for (const d of rows) {
        const p=map.latLngToContainerPoint([d.lat,d.lon]);
        const uncertainty=d.status==='estimated' ? d.radius || 100 : d.status==='uncertain' ? Math.max(80,d.radius || 150) : d.radius || 15;
        const sm=Math.sqrt(sigma*sigma+(uncertainty/2)**2), sp=Math.max(1.2,sm/mpp/step), radius=Math.ceil(sp*2.8), cx=p.x/step, cy=p.y/step, weight=sigma*sigma/(sm*sm);
        if(cx+radius<0 || cy+radius<0 || cx-radius>gw || cy-radius>gh) continue;
        for(let y=Math.max(0,Math.floor(cy-radius));y<Math.min(gh,Math.ceil(cy+radius));y++) for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(gw,Math.ceil(cx+radius));x++) arr[y*gw+x]+=weight*Math.exp(-((x-cx)**2+(y-cy)**2)/(2*sp*sp));
      }
      return {arr,gw,gh};
    }
    const Overlay = L.Layer.extend({
      onAdd(m) { this.canvas=L.DomUtil.create('canvas','observation-canvas');this.canvas.style.pointerEvents='none';this.canvas.style.position='absolute';m.getPanes().overlayPane.appendChild(this.canvas);m.on('moveend resize zoomend',this.reset,this);this.reset(); },
      onRemove(m) {m.off('moveend resize zoomend',this.reset,this);this.canvas.remove();},
      reset() {scale=null;this.draw();},
      draw() {
        const size=map.getSize(), c=this.canvas, dpr=window.devicePixelRatio || 1;
        c.width=Math.round(size.x*dpr);c.height=Math.round(size.y*dpr);c.style.width=size.x+'px';c.style.height=size.y+'px';L.DomUtil.setPosition(c,map.containerPointToLayerPoint([0,0]));const ctx=c.getContext('2d');ctx.scale(dpr,dpr);
        if (view==='heat') {
          if(scale===null) scale=density(filtered,size.x,size.y).arr.reduce((a,b)=>Math.max(a,b),.1);
          const {arr,gw,gh}=density(visible,size.x,size.y), off=document.createElement('canvas');off.width=gw;off.height=gh;const oc=off.getContext('2d'), im=oc.createImageData(gw,gh);
          for(let i=0;i<arr.length;i++){const v=Math.min(1,arr[i]/scale*+$('visibility').value);if(v<.0018)continue;const co=color(Math.pow(v,.45));im.data[i*4]=co[0];im.data[i*4+1]=co[1];im.data[i*4+2]=co[2];im.data[i*4+3]=Math.min(235,40+215*Math.pow(v,.23))*Math.min(1,v/.02);}
          oc.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,size.x,size.y);
        } else if(view==='coverage' || view==='richness') {
          const mx=111195*Math.cos(41.084*Math.PI/180), my=111195, cells=new Map();
          for(const d of visible){if(view==='richness'&&!d.species)continue;const x=Math.floor((d.lon-29.045)*mx/50), y=Math.floor((d.lat-41.08)*my/50), key=x+','+y;if(!cells.has(key))cells.set(key,{x,y,values:new Set()});cells.get(key).values.add(view==='richness'?d.species:d.user);}
          const max=Math.max(1,...[...cells.values()].map(z=>z.values.size));
          for(const z of cells.values()){const a=map.latLngToContainerPoint([41.08+(z.y+1)*50/my,29.045+z.x*50/mx]), b=map.latLngToContainerPoint([41.08+z.y*50/my,29.045+(z.x+1)*50/mx]), co=color(z.values.size/max);ctx.fillStyle=`rgba(${co.join(',')},.78)`;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);if(b.x-a.x>28){ctx.fillStyle='#17251c';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(z.values.size,(a.x+b.x)/2,(a.y+b.y)/2+4);}}
        } else {
          if(view==='paths'){
            const byUser=new Map();for(const d of active().filter(d=>d.t!==null)){if(!byUser.has(d.user))byUser.set(d.user,[]);byUser.get(d.user).push(d);}
            ctx.lineWidth=$('observer').value==='all'?1.1:2.4;ctx.strokeStyle=$('observer').value==='all'?'rgba(225,250,232,.55)':'#8dffd2';
            for(const rows of byUser.values()){rows.sort((a,b)=>a.t-b.t);for(let i=1;i<rows.length;i++){const d=rows[i], p=rows[i-1], gap=(d.t-p.t)*60, dist=map.distance([d.lat,d.lon],[p.lat,p.lon]);if(gap<=0||gap>1200||dist/gap>2)continue;const a=map.latLngToContainerPoint([p.lat,p.lon]),b=map.latLngToContainerPoint([d.lat,d.lon]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
          }
          for(const d of active()){const p=map.latLngToContainerPoint([d.lat,d.lon]), r=view==='paths'?2.1:3.5;ctx.fillStyle=d.status==='estimated'?'#ffc376':d.status==='uncertain'?'#ddaff1':'#8ff4cc';ctx.strokeStyle=d.status==='estimated'?'#795621':'#245441';ctx.lineWidth=.7;ctx.beginPath();if(d.status==='estimated'){ctx.moveTo(p.x,p.y-r-1);ctx.lineTo(p.x+r,p.y+r);ctx.lineTo(p.x-r,p.y+r);ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
        }
      }
    });
    const overlay=new Overlay().addTo(map);
    function update(invalidate=false) {
      if(invalidate)scale=null;filtered=selectRows(false);visible=selectRows(true);const shown=active();
      $('shownCount').textContent=shown.length.toLocaleString('tr-TR');$('clock').textContent=$('timeMode').value==='all'?'Tüm gün':fmt(+$('timeRange').value);$('smoothValue').textContent=$('smooth').value+' m';$('visibilityValue').textContent=Number($('visibility').value).toLocaleString('tr-TR')+'×';
      $('selectionSummary').textContent=`Gösterilen: ${shown.length.toLocaleString('tr-TR')} / ${DATA.length.toLocaleString('tr-TR')} kayıt`;
      $('legend').innerHTML=['heat','coverage','richness'].includes(view)?`<span>${view==='heat'?'Göreli gözlem yoğunluğu':view==='coverage'?'50 m hücrede gözlemci sayısı':'50 m hücrede tür sayısı'}</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>`:view==='paths'?'<span>GPS adayı gözlemler arasındaki bağlantılar</span>':'<div class="legend-dots"><span><i class="legend-dot" aria-hidden="true"></i>GPS adayı</span><span><i class="legend-triangle" aria-hidden="true">▲</i>Tahmini</span></div>';
      overlay.draw();
    }
    map.on('click',e=>{
      const near=active().map(d=>({d,dist:map.latLngToContainerPoint([d.lat,d.lon]).distanceTo(e.containerPoint)})).filter(x=>x.dist<16).sort((a,b)=>a.dist-b.dist).slice(0,10);if(!near.length)return;
      const content=near.map(({d})=>`<article class="popup-row"><b>${esc(d.name)}</b>${d.common?'<br>'+esc(d.common):''}<br>@${esc(d.user)} · ${d.t===null?'Saat yok':fmt(d.t)}<br><strong>${esc(CFG.statuses[d.status][0])}</strong>${d.status==='estimated'?'<br>Yaklaşık çevre: '+esc(d.radius)+' m':''}<p>${esc(d.reason)}</p><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">iNaturalist gözlemini aç ↗</a></article>`).join('');
      L.popup({maxWidth:340,maxHeight:320}).setLatLng(e.latlng).setContent(content).openOn(map);
    });
    document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});update();});
    ['source','observer','taxa','quality'].forEach(id=>$(id).onchange=()=>update(true));
    $('smooth').oninput=()=>update(true);$('visibility').oninput=()=>update();
    $('filterToggle').onclick=()=>{const isHidden=$('filterPanel').hidden;$('filterPanel').hidden=!isHidden;$('filterToggle').setAttribute('aria-expanded',String(isHidden));};
    $('resetFilters').onclick=()=>{$('source').value='reliable';['observer','taxa','quality'].forEach(id=>$(id).value='all');update(true);};
    $('basemap').onchange=()=>{map.removeLayer(basemap);basemap=layers[$('basemap').value];basemap.addTo(map);};
    for(const key of ['osm']){let errors=0;layers[key].on('tileerror',()=>{if(++errors>=4&&basemap===layers[key]){$('basemap').value='embedded';$('basemap').dispatchEvent(new Event('change'));console.warn('OpenStreetMap yüklenemedi; uydu zemini gösteriliyor.');}});}
    function stop(){playing=false;clearTimeout(timer);$('play').querySelector('span').textContent='Oynat';$('play').setAttribute('aria-label','Zaman animasyonunu başlat');$('play').querySelector('path').setAttribute('d','m5 3 8 5-8 5z');}
    function tick(){if(!playing)return;const t=+$('timeRange').value;if(t>=CFG.end){stop();return;}$('timeRange').value=Math.min(CFG.end,t+Number($('speed').value));update();timer=setTimeout(tick,180);}
    $('play').onclick=()=>{if(playing){stop();return;}if($('timeMode').value==='all')$('timeMode').value='cumulative';if(+$('timeRange').value>=CFG.end)$('timeRange').value=CFG.start;playing=true;$('play').querySelector('span').textContent='Duraklat';$('play').setAttribute('aria-label','Zaman animasyonunu duraklat');$('play').querySelector('path').setAttribute('d','M4 3h3v10H4zm5 0h3v10H9z');tick();};
    $('timeRange').oninput=()=>{if($('timeMode').value==='all')$('timeMode').value='cumulative';update();};$('timeMode').onchange=()=>{stop();update();};
    $('fit').onclick=()=>{const rows=active();map.fitBounds(rows.length?L.latLngBounds(rows.map(d=>[d.lat,d.lon])).pad(.08):originalBounds.pad(.08));};
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    update(true);
  } catch(error) {console.error(error);$('map').textContent='Harita yüklenemedi. Sayfayı GitHub Pages üzerinden açın ve veri dosyalarının yüklendiğini kontrol edin.';}
})();
