(async function(){
try {
const [DATA,MAP_IMAGES]=await Promise.all(["../data/bolu-2026/observations.json","../data/bolu-2026/map-config.json"].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})));


const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Yeni gözlemciler ve gruplar veri dosyasından filtrelere eklenir.
for(const [id,key] of [['observer','user'],['taxa','group']]){const select=$(id),known=new Set([...select.options].map(x=>x.value));for(const value of [...new Set(DATA.map(x=>x[key]).filter(Boolean))].sort()){if(!known.has(value))select.add(new Option(value,value))}}
const fmt=m=>`${String(Math.floor(m/60)).padStart(2,'0')}.${String(Math.floor(m%60)).padStart(2,'0')}`;
const mx=111195*Math.cos(40.765*Math.PI/180),my=111195;
const map=L.map('map',{minZoom:14,maxZoom:20,zoomSnap:.25,preferCanvas:true});
map.attributionControl.setPrefix('');
L.imageOverlay(MAP_IMAGES.satellite,MAP_IMAGES.bounds,{attribution:'Esri, Vantor, Earthstar Geographics, GIS User Community'}).addTo(map);
map.setMaxBounds(L.latLngBounds(MAP_IMAGES.bounds).pad(.45));
const dataBounds=L.latLngBounds(DATA.map(d=>[d.lat,d.lon]));map.fitBounds(dataBounds.pad(.08));
L.control.scale({imperial:false,maxWidth:105}).addTo(map);
let view='heat',visible=[],allFiltered=[],densityScale=null,playing=false,timer=null,currentTab='map';
const colors=[[45,107,255],[20,223,242],[254,242,83],[255,145,16],[255,43,87]];
function color(v){const z=Math.min(.9999,Math.max(0,v))*4,i=Math.floor(z),f=z-i;return colors[i].map((x,k)=>Math.round(x+(colors[i+1][k]-x)*f));}
function selectRows(time=true){
 const source=$('source').value,user=$('observer').value,taxa=$('taxa').value,mode=$('timeMode').value,end=+$('timeRange').value;
 return DATA.filter(d=>(source==='both'||(source==='gps'?!d.est:source==='spatial'?d.spatial:d.est))&&(user==='all'||d.user===user)&&(taxa==='all'||d.group===taxa)&&(!time||mode==='all'||(d.t!==null&&d.t>=420&&d.t<=end&&(mode==='cumulative'||d.t>=end-30))));
}
function activeRows(){return view==='paths'?visible.filter(d=>!d.est):visible;}
function density(rows,w,h){
 const step=4,gw=Math.ceil(w/step),gh=Math.ceil(h/step),arr=new Float32Array(gw*gh),center=map.getCenter();
 const mpp=map.distance(center,map.containerPointToLatLng(map.latLngToContainerPoint(center).add([100,0])))/100,sigma=60;
 for(const d of rows){
  const p=map.latLngToContainerPoint([d.lat,d.lon]),sm=Math.sqrt(sigma*sigma+(d.est?Math.pow((d.radius||110)/2,2):0));
  const sp=Math.max(1.2,sm/mpp/step),r=Math.ceil(sp*2.8),cx=p.x/step,cy=p.y/step,weight=sigma*sigma/(sm*sm);
  if(cx+r<0||cy+r<0||cx-r>gw||cy-r>gh)continue;
  for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(gh,Math.ceil(cy+r));y++){
   const dy=y-cy,off=y*gw;
   for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(gw,Math.ceil(cx+r));x++)arr[off+x]+=weight*Math.exp(-((x-cx)**2+dy*dy)/(2*sp*sp));
  }
 }
 return {arr,gw,gh};
}
const Overlay=L.Layer.extend({
 onAdd(m){this.canvas=L.DomUtil.create('canvas','observation-canvas');this.canvas.style.pointerEvents='none';this.canvas.style.position='absolute';m.getPanes().overlayPane.appendChild(this.canvas);m.on('moveend resize zoomend',this.reset,this);this.reset();},
 onRemove(m){m.off('moveend resize zoomend',this.reset,this);this.canvas.remove();},
 reset(){densityScale=null;this.draw();},
 draw(){
  if(!$('map').offsetWidth||!$('map').offsetHeight)return;
  const c=this.canvas,size=map.getSize(),dpr=window.devicePixelRatio||1;c.width=Math.round(size.x*dpr);c.height=Math.round(size.y*dpr);c.style.width=size.x+'px';c.style.height=size.y+'px';
  L.DomUtil.setPosition(c,map.containerPointToLayerPoint([0,0]));const ctx=c.getContext('2d');ctx.scale(dpr,dpr);
  if(view==='heat'){
   if(densityScale===null)densityScale=density(allFiltered,size.x,size.y).arr.reduce((a,b)=>Math.max(a,b),.1);
   const {arr,gw,gh}=density(visible,size.x,size.y),off=document.createElement('canvas');off.width=gw;off.height=gh;
   const oc=off.getContext('2d'),im=oc.createImageData(gw,gh);
   for(let i=0;i<arr.length;i++){const v=Math.min(1,arr[i]/densityScale*2);if(v<.0018)continue;const co=color(Math.pow(v,.45));im.data[i*4]=co[0];im.data[i*4+1]=co[1];im.data[i*4+2]=co[2];im.data[i*4+3]=Math.min(235,40+215*Math.pow(v,.23))*Math.min(1,v/.02);}
   oc.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,size.x,size.y);
  }else if(view==='coverage'){
   const cells=new Map();for(const d of visible){const x=Math.floor((d.lon-31.5)*mx/100),y=Math.floor((d.lat-40.765)*my/100),key=x+','+y;if(!cells.has(key))cells.set(key,{x,y,users:new Set()});cells.get(key).users.add(d.user);}
   const max=Math.max(1,...[...cells.values()].map(z=>z.users.size));
   for(const z of cells.values()){const a=map.latLngToContainerPoint([40.765+(z.y+1)*100/my,31.5+z.x*100/mx]),b=map.latLngToContainerPoint([40.765+z.y*100/my,31.5+(z.x+1)*100/mx]),co=color(z.users.size/max);ctx.fillStyle=`rgba(${co.join(',')},.78)`;ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);if(b.x-a.x>32){ctx.fillStyle='#1f392d';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillText(z.users.size,(a.x+b.x)/2,(a.y+b.y)/2+4);}}
  }else{
   if(view==='paths'){
    const groups=new Map();for(const d of activeRows().filter(d=>d.t!==null)){if(!groups.has(d.user))groups.set(d.user,[]);groups.get(d.user).push(d);}
    ctx.lineWidth=$('observer').value==='all'?1.1:2.4;ctx.strokeStyle=$('observer').value==='all'?'rgba(225,250,232,.55)':'#8dffd2';
    for(const a of groups.values()){a.sort((x,y)=>x.t-y.t);for(let i=1;i<a.length;i++){const d=a[i],p=a[i-1],gap=(d.t-p.t)*60,dd=map.distance([d.lat,d.lon],[p.lat,p.lon]);if(gap<=0||gap>1200||dd/gap>2)continue;const x=map.latLngToContainerPoint([p.lat,p.lon]),y=map.latLngToContainerPoint([d.lat,d.lon]);ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke();}}
   }
   for(const d of activeRows()){const p=map.latLngToContainerPoint([d.lat,d.lon]),r=view==='paths'?2.1:3.5;ctx.fillStyle=d.spatial?'#ddaff1':d.est?'#ffc376':'#8ff4cc';ctx.strokeStyle=d.est?'#795621':'#245441';ctx.lineWidth=.7;ctx.beginPath();if(d.est){ctx.moveTo(p.x,p.y-r-1);ctx.lineTo(p.x+r,p.y+r);ctx.lineTo(p.x-r,p.y+r);ctx.closePath();}else ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  }
 }
});
const overlay=new Overlay().addTo(map);
function update(invalidate=false){
 if(invalidate)densityScale=null;allFiltered=selectRows(false);visible=selectRows(true);
 $('shownCount').textContent=activeRows().length.toLocaleString('tr-TR');
 $('clock').textContent=$('timeMode').value==='all'?'Tüm gözlemler':fmt(+$('timeRange').value);
 const n=['source','observer','taxa'].filter(id=>$(id).value!==(id==='source'?'both':'all')).length;
 $('filterBadge').hidden=!n;$('filterBadge').textContent=n;
 $('legend').innerHTML=view==='heat'?'<span>Gözlem yoğunluğu</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>':view==='coverage'?'<span>100 m hücrede farklı gözlemciler</span><div class="legend-gradient"></div><div class="legend-ends"><span>Az</span><span>Çok</span></div>':view==='paths'?'<span>GPS adayı gözlemler arasındaki bağlantılar</span>':'<div class="legend-dots"><span><i class="legend-dot"></i>Özgün konum</span><span><i class="legend-triangle">▲</i>Tahmini</span></div>';
 overlay.draw();
}
map.on('click',e=>{
 const near=activeRows().map(d=>({d,dd:map.latLngToContainerPoint([d.lat,d.lon]).distanceTo(e.containerPoint)})).filter(x=>x.dd<15).sort((a,b)=>a.dd-b.dd).slice(0,12);if(!near.length)return;
 const html=near.map(({d})=>`<div class="popup-row"><b>${esc(d.name||'Tanımlanmamış gözlem')}</b><br><span class="popup-time">@${esc(d.user)} · ${d.t===null?'Saat bilgisi yok':fmt(d.t)}</span><span class="popup-kind">${d.spatial?'Yaklaşık bölge':d.est?'Tahmini konum':'Özgün konum'}</span><a href="https://www.inaturalist.org/observations/${encodeURIComponent(d.id)}" target="_blank" rel="noopener noreferrer">Gözlemi aç ↗</a></div>`).join('');
 L.popup({maxWidth:310,maxHeight:300}).setLatLng(e.latlng).setContent(html).openOn(map);
});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});update();});
for(const id of ['source','observer','taxa'])$(id).onchange=()=>update(true);
$('filterToggle').onclick=()=>{const open=$('filterPanel').hidden;$('filterPanel').hidden=!open;$('filterToggle').setAttribute('aria-expanded',String(open));};
$('resetFilters').onclick=()=>{$('source').value='both';$('observer').value='all';$('taxa').value='all';update(true);};
function stop(){playing=false;clearTimeout(timer);$('play').querySelector('span').textContent='Oynat';$('play').setAttribute('aria-label','Zaman animasyonunu başlat');$('play').querySelector('path').setAttribute('d','m5 3 8 5-8 5z');}
function tick(){if(!playing)return;const t=+$('timeRange').value;if(t>=930){stop();return;}$('timeRange').value=Math.min(930,t+3);update();timer=setTimeout(tick,180);}
$('play').onclick=()=>{if(playing){stop();return;}if($('timeMode').value==='all')$('timeMode').value='cumulative';if(+$('timeRange').value>=930)$('timeRange').value=420;playing=true;$('play').querySelector('span').textContent='Duraklat';$('play').setAttribute('aria-label','Zaman animasyonunu duraklat');$('play').querySelector('path').setAttribute('d','M4 3h3v10H4zm5 0h3v10H9z');tick();};
$('timeRange').oninput=()=>{if($('timeMode').value==='all')$('timeMode').value='cumulative';update();};
$('timeMode').onchange=()=>{stop();update();};
$('fit').onclick=()=>{const a=activeRows();map.fitBounds((a.length?L.latLngBounds(a.map(d=>[d.lat,d.lon])):dataBounds).pad(.08));};
update(true);

} catch(error){ console.error(error);const message=document.createElement("p");message.className="runtime-error";message.textContent="Veriler yüklenemedi. Lütfen sayfayı yenileyin.";document.querySelector("main").prepend(message);}
})();
