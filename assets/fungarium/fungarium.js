(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankNames={phylum:'Bölüm',class:'Sınıf',order:'Takım',family:'Familya',genus:'Cins',species:'Takson'};
const hierarchy=['phylum','class','order','family','genus'];
let records=[],filtered=[],lastFocus=null,collectionReady=false;
let view=new URLSearchParams(location.search).get('gorunum')==='agac'?'tree':'list';
let taxonomy=null,lastListTaxonomy=null;
const groupThreshold=2;
let openDepth=hierarchy.length-1;
const dialog=$('fgDetail');
const date=value=>{const parts=(value||'').split('-');return parts.length===3?`${parts[2]}.${parts[1]}.${parts[0]}`:value};
const obs=r=>`https://www.inaturalist.org/observations/${encodeURIComponent(r.observation)}`;
const taxLabel=x=>x==='Unknown'?'Belirlenmemiş':escape(x);
function displayName(r){if(r.rank==='genus')return `${r.name} sp.`;if(r.rank==='species'&&r.quality!=='research'){const parts=r.name.split(/\s+/);return [parts[0],'cf.',...parts.slice(1)].join(' ')}return r.name}
const name=r=>escape(displayName(r));
function badges(r){return `<span class="fg-badges">${r.collected?'<span class="fg-badge fg-collected-badge">collected</span>':''}<span class="fg-badge ${r.quality==='research'?'fg-research':'fg-ordinary'}">${r.quality==='research'?'araştırma sınıfı':'tanımlama gerekli'}</span>${r.microscopy?'<span class="fg-badge fg-microscopy">mikroskopi yapıldı</span>':''}</span>`}
function recordLink(r){const href=r.collected?`#ornek-${r.id}`:obs(r);const thumbnail=r.thumbnail?`<img class="fg-thumbnail" src="${escape(r.thumbnail)}" alt="" width="28" height="28" loading="lazy" decoding="async">`:'';return `<a class="fg-tree-record ${r.collected?'fg-collected':'fg-uncollected'}" href="${href}"${r.collected?'':' target="_blank" rel="noopener"'}><span class="fg-record-name"><i>${name(r)}</i>${badges(r)}${thumbnail}</span><span class="fg-record-meta">${date(r.date)}<br>${r.collected?r.id:'#'+r.observation} ${r.collected?'→':'↗'}</span></a>`}
function singleChild(node,rank){
 const children=[...node.children.values()];
 return children.length===1&&children[0].rank===rank?children[0]:null;
}
function hasSideLabel(node){
 if(node.rank==='genus')return node.records.length>=5;
 if(node.rank==='family')return [...node.children.values()].some(genus=>genus.rank==='genus'&&hasSideLabel(genus));
 if(node.rank==='order'){
  const family=singleChild(node,'family');
  return !(family&&singleChild(family,'genus'));
 }
 if(node.rank==='class'){
  const order=singleChild(node,'order');
  const family=order&&singleChild(order,'family');
  return !(family&&singleChild(family,'genus'));
 }
 return true;
}
function openAttribute(depth){
 return depth<=openDepth?' open':'';
}
function recordGroups(items){
 const groups=new Map();
 for(const record of items){
  const key=record.rank+':'+record.name;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(record);
 }
 return items.map(record=>{
  const group=groups.get(record.rank+':'+record.name);
  if(group.length<groupThreshold||!['species','genus'].includes(record.rank))return `<li>${recordLink(record)}</li>`;
  if(group[0]!==record)return '';
  const title=group.every(item=>displayName(item)===displayName(record))?displayName(record):record.name;
  return `<li><details class="fg-record-group" data-fg-depth="${hierarchy.length}"${openAttribute(hierarchy.length)}><summary><i>${escape(title)}</i> <span>${group.length} adet</span></summary><ul class="fg-tree-list">${group.map(item=>`<li>${recordLink(item)}</li>`).join('')}</ul></details></li>`;
 }).join('');
}
function buildTaxonomy(){
 const root={rank:'kingdom',name:'Fungi',children:new Map(),records:[],count:filtered.length,sample:null};
 for(const record of filtered){
  let parent=root;
  if(!root.sample&&record.thumbnail)root.sample=record;
  for(const rank of hierarchy){
   const value=record.taxonomy[rank];
   if(!value||value.toLowerCase()==='unknown')continue;
   const key=rank+':'+value;
   if(!parent.children.has(key))parent.children.set(key,{rank,name:value,children:new Map(),records:[],count:0});
   parent=parent.children.get(key);
   parent.count++;
   if(!parent.sample&&record.thumbnail)parent.sample=record;
  }
  parent.records.push(record);
 }
 return root;
}
const branchesOf=node=>[...node.children.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
function renderList(root){
 let railIndex=0;
 function branch(node){
  const nested=branchesOf(node).map(child=>{
   const depth=hierarchy.indexOf(child.rank);
   const label=escape(child.name);
   let rail='';
   if(hasSideLabel(child)){
    const patternId=`fg-rail-${railIndex++}`;
    const spacing=child.name.length*6+17;
    rail=`<svg class="fg-side-label" aria-hidden="true"><defs><pattern id="${patternId}" width="14" height="${spacing}" patternUnits="userSpaceOnUse"><text x="-8" y="10" text-anchor="end" transform="rotate(-90)">${label}</text></pattern></defs><rect width="100%" height="100%" fill="url(#${patternId})"/></svg>`;
   }
   return `<li><details class="${child.rank}" data-fg-depth="${depth}"${openAttribute(depth)}><summary>${label}</summary>${rail}<ul class="fg-tree-list">${branch(child)}</ul></details></li>`;
  }).join('');
  return nested+recordGroups(node.records);
 }
 $('fgTree').innerHTML=`<ul class="fg-tree-list">${branch(root)}</ul>`;
}
const radialRankNames={...rankNames,kingdom:'Âlem',species:'Tür'};
const radialContainer=$('fgDiagramTree');
let radialPath=[],radialChildren=[],taxonPhotos={},radialMap=null;
let previousQuery='';
const countText=count=>count.toLocaleString('tr-TR')+' kayıt';
const taxonKey=node=>node.rank+':'+node.name;

function diagramChildren(node){
 const species=new Map();
 for(const record of node.records){
  if(record.rank!=='species'||node.rank==='species')continue;
  if(!species.has(record.name))species.set(record.name,{
   rank:'species',name:record.name,children:new Map(),records:[],count:0,sample:null
  });
  const child=species.get(record.name);
  child.records.push(record);
  child.count++;
  if(record.thumbnail&&(!child.sample||record.quality==='research'))child.sample=record;
 }
 return [...branchesOf(node),...species.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
}

function getRadialLineage(root){
 const lineage=[root];
 for(const key of radialPath){
  const next=diagramChildren(lineage.at(-1)).find(node=>taxonKey(node)===key);
  if(!next)break;
  lineage.push(next);
 }
 radialPath=lineage.slice(1).map(taxonKey);
 return lineage;
}

function findSearchPath(root,query){
 if(!query)return [];
 const path=[];
 let node=root;
 while(node.rank!=='species'){
  const children=diagramChildren(node);
  const match=children.find(child=>child.name.toLocaleLowerCase('tr')===query);
  const next=match||(children.length===1?children[0]:null);
  if(!next||node.name.toLocaleLowerCase('tr')===query)break;
  path.push(taxonKey(next));
  node=next;
 }
 return path;
}

function radialLabel(node){
 const uncertain=node.rank==='species'&&node.records.every(record=>record.quality!=='research');
 return escape(uncertain?displayName(node.records[0]):node.name);
}

function radialPhoto(node,credits,useCollection=false){
 const official=useCollection?null:taxonPhotos[taxonKey(node)];
 const sample=node.sample;
 if(official){
  const [url,id,author,license]=official;
  const page='https://www.inaturalist.org/photos/'+encodeURIComponent(id);
  const licenseUrl=license==='cc0'?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/licenses/'+license.slice(3)+'/4.0/';
  credits.push(`<li><i>${escape(node.name)}</i> · <a href="${page}" target="_blank" rel="noopener">${escape(author)} ↗</a> · <a href="${licenseUrl}" target="_blank" rel="noopener">${escape(license.toUpperCase())}</a></li>`);
  return url;
 }
 if(sample?.thumbnail){
  credits.push(`<li><i>${escape(node.name)}</i> · <a href="${obs(sample)}" target="_blank" rel="noopener">Koleksiyondan temsilî gözlem ↗</a></li>`);
  return sample.thumbnail;
 }
 return '';
}

function radialImage(src='',lazy=false){
 const larger=src.replace(/\/square(?=\.[a-z]+$)/i,'/small');
 const fallback=larger!==src?` data-square-src="${escape(src)}"`:'';
 return `<span class="fg-radial-photo">${src?`<img src="${escape(larger)}"${fallback} alt="" decoding="async"${lazy?' loading="lazy"':''}>`:''}</span>`;
}

function radialGallery(records,heading){
 if(!records.length)return '';
 return `<section class="fg-radial-gallery"><h3>${heading}</h3><ul>${records.map(record=>{
  const href=record.collected?'#ornek-'+encodeURIComponent(record.id):obs(record);
  const kind=record.collected?'Örnek':'Gözlem';
  const id=record.collected?record.id:record.observation;
  return `<li><a href="${href}"${record.collected?'':' target="_blank" rel="noopener"'}>${radialImage(record.photo||record.thumbnail,true)}<span class="fg-radial-record-info"><i>${name(record)}</i><small>${kind} · #${escape(id)} · ${escape(date(record.date))}</small>${badges(record)}</span></a></li>`;
 }).join('')}</ul></section>`;
}

function radialLayout(count){
 const spacing=196;
 const radius=count>1?spacing/(2*Math.sin(Math.PI/count)):0;
 const radiusX=Math.max(216,radius*1.12);
 const radiusY=Math.max(165,radius);
 const width=Math.ceil(2*(radiusX+84));
 const height=Math.ceil(2*(radiusY+94));
 const positions=Array.from({length:count},(_,index)=>{
  const angle=2*Math.PI*index/count-Math.PI/2;
  return [width/2+radiusX*Math.cos(angle),height/2+radiusY*Math.sin(angle)];
 });
 return {width,height,positions};
}

function setRadialZoom(map,scale,reset=false,anchor=null){
 const {viewport,content,wheel}=map;
 const old=map.scale;
 const anchorX=anchor?.x??viewport.clientWidth/2;
 const anchorY=anchor?.y??viewport.clientHeight/2;
 const x=reset?0:(viewport.scrollLeft+anchorX-content.clientWidth/2)/old;
 const y=reset?0:(viewport.scrollTop+anchorY-content.clientHeight/2)/old;
 map.scale=Math.max(map.fit,Math.min(2,scale));
 const width=Number(wheel.dataset.width);
 const height=Number(wheel.dataset.height);
 content.style.width=Math.round(width*map.scale)+'px';
 content.style.height=Math.round(height*map.scale)+'px';
 wheel.style.setProperty('--radial-scale',map.scale);
 viewport.scrollLeft=content.clientWidth/2+x*map.scale-anchorX;
 viewport.scrollTop=content.clientHeight/2+y*map.scale-anchorY;
 map.zoomOut.disabled=map.scale<=map.fit+0.001;
 map.zoomIn.disabled=map.scale>=2;
 map.level.textContent=Math.round(map.scale*100)+'%';
}

const radialResize=new ResizeObserver(()=>{
 if(!radialMap)return;
 const {viewport,wheel}=radialMap;
 if(!viewport.clientWidth||!viewport.clientHeight)return;
 const wasFit=radialMap.scale<=radialMap.fit+0.001;
 radialMap.fit=Math.min(1,viewport.clientWidth/Number(wheel.dataset.width),viewport.clientHeight/Number(wheel.dataset.height));
 setRadialZoom(radialMap,wasFit?radialMap.fit:radialMap.scale,wasFit);
});

function connectRadialMap(){
 const viewport=radialContainer.querySelector('.fg-radial-viewport');
 if(!viewport)return;
 const content=viewport.firstElementChild;
 const wheel=content.firstElementChild;
 const fit=Math.min(1,viewport.clientWidth/Number(wheel.dataset.width),viewport.clientHeight/Number(wheel.dataset.height));
 const map={
  viewport,content,wheel,fit,scale:1,
  zoomOut:radialContainer.querySelector('[data-radial-zoom="out"]'),
  zoomIn:radialContainer.querySelector('[data-radial-zoom="in"]'),
  level:radialContainer.querySelector('.fg-radial-zoom-level')
 };
 radialMap=map;
 setRadialZoom(map,fit,true);
 radialResize.observe(viewport);
 let drag=null;
 viewport.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('button'))return;
  if(viewport.scrollWidth<=viewport.clientWidth&&viewport.scrollHeight<=viewport.clientHeight)return;
  drag={id:event.pointerId,x:event.clientX+viewport.scrollLeft,y:event.clientY+viewport.scrollTop};
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('is-panning');
 });
 viewport.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  viewport.scrollLeft=drag.x-event.clientX;
  viewport.scrollTop=drag.y-event.clientY;
 });
 viewport.addEventListener('lostpointercapture',()=>{
  drag=null;
  viewport.classList.remove('is-panning');
 });
 viewport.addEventListener('dblclick',event=>{
  if(event.target.closest('button'))return;
  const bounds=viewport.getBoundingClientRect();
  setRadialZoom(map,map.scale*1.4,false,{
   x:event.clientX-bounds.left-viewport.clientLeft,
   y:event.clientY-bounds.top-viewport.clientTop
  });
 });
}

function renderDiagram(root){
 radialResize.disconnect();
 radialMap=null;
 const lineage=getRadialLineage(root);
 const center=lineage.at(-1);
 const children=diagramChildren(center);
 radialChildren=children;
 const {width,height,positions}=radialLayout(children.length);
 const credits=[];
 const rootPhoto=radialPhoto(center,credits,center.rank==='species');
 const breadcrumb=lineage.map((node,index)=>{
  const label=radialLabel(node);
  const item=index===lineage.length-1
   ?`<strong class="fg-radial-crumb" aria-current="location">${label}</strong>`
   :`<button type="button" class="fg-radial-crumb" data-radial-depth="${index}">${label}</button>`;
  return `<li data-rank="${node.rank}">${item}</li>`;
 }).join('');
 const centerLabel=`<div class="fg-radial-center" data-rank="${center.rank}">
  ${radialImage(rootPhoto)}
  <div class="fg-radial-label">
   <h3 id="fgRadialFocus" tabindex="-1">${radialLabel(center)}</h3>
   <small>${radialRankNames[center.rank]} · ${countText(center.count)}</small>
  </div>
 </div>`;
 const wheel=children.length?`<div class="fg-radial-controls">
  <span>${children.length.toLocaleString('tr-TR')} alt dal</span>
  <div class="fg-radial-jump">
   <label for="fgRadialJump">Dal seç</label>
   <select id="fgRadialJump" data-radial-jump>
    <option value="">Takson seç…</option>
    ${children.map((node,index)=>`<option value="${index}">${radialLabel(node)} · ${radialRankNames[node.rank]}</option>`).join('')}
   </select>
  </div>
  <div class="fg-radial-zoom" role="group" aria-label="Harita yakınlaştırma">
   <button type="button" data-radial-zoom="out" aria-label="Uzaklaştır">−</button>
   <output class="fg-radial-zoom-level"></output>
   <button type="button" data-radial-zoom="in" aria-label="Yakınlaştır">+</button>
   <button type="button" data-radial-zoom="fit">Tümünü göster</button>
  </div>
 </div>
 <p id="fgRadialHelp" class="fg-radial-help">Boş alana çift tıklayarak o noktaya yakınlaş. Yakınlaştırınca haritayı sürükleyebilir veya kaydırabilirsin.</p>
 <div class="fg-radial-viewport" tabindex="0" role="region" aria-label="Takson haritası" aria-describedby="fgRadialHelp">
  <div class="fg-radial-map-content">
   <div class="fg-radial-wheel" data-width="${width}" data-height="${height}" style="width:${width}px;height:${height}px">
    <svg class="fg-radial-links" viewBox="0 0 ${width} ${height}" aria-hidden="true">
     ${positions.map(([x,y])=>`<path d="M${width/2} ${height/2} L${x} ${y}"/>`).join('')}
    </svg>
    ${centerLabel}
    ${children.map((node,index)=>{
     const [x,y]=positions[index];
     return `<button type="button" class="fg-radial-node" data-rank="${node.rank}" data-radial-child="${index}" style="--node-x:${x}px;--node-y:${y}px">
      ${radialImage(radialPhoto(node,credits),true)}
      <span class="fg-radial-label">
       <strong>${radialLabel(node)}</strong>
       <small>${radialRankNames[node.rank]} · ${countText(node.count)}</small>
      </span>
     </button>`;
    }).join('')}
   </div>
  </div>
 </div>`:`<div class="fg-radial-leaf">${centerLabel}</div>`;
 const ownRecords=center.rank==='species'?center.records:center.records.filter(record=>record.rank!=='species');
 $('fgRadialRoot').disabled=lineage.length===1;
 radialContainer.innerHTML=`<nav class="fg-radial-breadcrumbs" aria-label="Takson yolu"><ol>${breadcrumb}</ol></nav>
  ${wheel}
  ${credits.length?`<details class="fg-radial-credits"><summary>Fotoğraf kaynakları</summary><ul>${credits.join('')}</ul></details>`:''}
  ${radialGallery(ownRecords,center.rank==='species'?'Gözlem ve örnek fotoğrafları':radialRankNames[center.rank]+' düzeyinde kayıtlar')}`;
 connectRadialMap();
}

function selectRadialPath(path){
 radialPath=path;
 renderDiagram(taxonomy);
 $('fgRadialFocus').focus({preventScroll:true});
}

function showView(){
 $('fgClassic').hidden=view!=='list';
 $('fgDiagram').hidden=view!=='tree'||!filtered.length;
 if(!taxonomy)return;
 if(view==='tree'){
  if(filtered.length)renderDiagram(taxonomy);
 }else if(lastListTaxonomy!==taxonomy){
  renderList(taxonomy);
  lastListTaxonomy=taxonomy;
 }
}
function render(){
 if(!collectionReady)return;
 const query=$('fgSearch').value.trim().toLocaleLowerCase('tr'),phylum=$('fgPhylum').value,family=$('fgFamily').value;
 const researchOnly=$('fgResearchOnly').checked;
 const collectedOnly=$('fgCollectedOnly').checked;
 filtered=records.filter(r=>{
  if(researchOnly&&r.quality!=='research')return false;
  if(collectedOnly&&!r.collected)return false;
  if(phylum!=='all'&&r.taxonomy.phylum!==phylum)return false;
  if(family!=='all'&&r.taxonomy.family!==family)return false;
  return [r.id,r.name,displayName(r),r.commonName||'',r.date,r.observation,...Object.values(r.taxonomy),r.collected?'collected':'',r.quality==='research'?'araştırma sınıfı':'tanımlama gerekli',r.microscopy?'mikroskopi yapıldı':''].join(' ').toLocaleLowerCase('tr').includes(query);
 });
 const sort=$('fgSort').value;filtered.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'tr')||Number(a.observation)-Number(b.observation):sort==='date'?b.date.localeCompare(a.date)||Number(a.observation)-Number(b.observation):Number(b.collected)-Number(a.collected)||Number(a.id)-Number(b.id));
 $('fgCount').textContent=`${filtered.length.toLocaleString('tr-TR')} / ${records.length.toLocaleString('tr-TR')} kayıt · ${filtered.filter(r=>r.collected).length} collected · ${new Set(filtered.map(r=>r.name)).size} farklı takson`;
 $('fgEmpty').hidden=filtered.length>0;
 taxonomy=buildTaxonomy();
 if(query!==previousQuery){
  radialPath=findSearchPath(taxonomy,query);
  previousQuery=query;
 }
 showView();
}
function reset(){$('fgFilters').reset()}
function closeDetail(){if(dialog.open)dialog.close();if(location.hash.startsWith('#ornek-'))history.replaceState(null,'',location.pathname+location.search);if(lastFocus&&document.contains(lastFocus))lastFocus.focus()}
function openDetail(id){
 const r=records.find(x=>x.collected&&x.id===id);if(!r)return;
 if(!dialog.open)lastFocus=document.activeElement;
 $('fgDetailId').textContent=`FUNGARIUM / ${r.id} · collected`;
 const details=[['Örnek numarası',escape(r.id)],['Gözlem tarihi',date(r.date)],['Familya',taxLabel(r.taxonomy.family||'Belirlenmemiş')],['Tanımlama durumu',r.quality==='research'?'Araştırma sınıfı':'Tanımlama gerekli'],['Kaynak gözlem',`<a href="${obs(r)}" target="_blank" rel="noopener">iNaturalist #${escape(r.observation)} ↗</a>`]];
 if(r.microscopy)details.push(['Mikroskopi','Mikroskopi yapıldı']);
 $('fgDetailBody').innerHTML=`<div class="fg-detail-grid"><figure class="fg-detail-photo"><a href="${obs(r)}" target="_blank" rel="noopener"><img src="${escape(r.photo)}" alt="${name(r)} · ${r.id}"></a></figure><section class="fg-detail-info"><h2 id="fgDetailTitle"><i>${name(r)}</i></h2><dl>${details.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section></div><section class="fg-taxonomy"><h3>Sınıflandırma</h3><ol>${Object.entries(r.taxonomy).filter(([k,v])=>v&&v.toLowerCase()!=='unknown').map(([k,v])=>`<li class="fg-rank-${escape(k)}"><small>${rankNames[k]||escape(k)}</small><span>${escape(v)}</span></li>`).join('')}</ol></section>`;
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
function syncHash(){const match=location.hash.match(/^#ornek-(\d{7})$/);if(match)openDetail(match[1]);else if(dialog.open)closeDetail()}
$('fgClose').addEventListener('click',closeDetail);dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail()}});
function expandTo(depth){
 openDepth=depth;
 $('fgTree').querySelectorAll('details[data-fg-depth]').forEach(detail=>{
  detail.open=Number(detail.dataset.fgDepth)<=depth;
 });
}
$('fgExpandAll').addEventListener('click',()=>expandTo(hierarchy.length));
document.querySelectorAll('[data-fg-open-depth]').forEach(button=>{
 button.addEventListener('click',()=>expandTo(Number(button.dataset.fgOpenDepth)));
});
const viewButtons=document.querySelectorAll('[data-fg-view]');
function updateView(){
 viewButtons.forEach(button=>button.setAttribute('aria-pressed',button.dataset.fgView===view));
 showView();
}
viewButtons.forEach(button=>button.addEventListener('click',()=>{
 view=button.dataset.fgView;
 updateView();
}));
updateView();
$('fgRadialRoot').addEventListener('click',()=>selectRadialPath([]));
radialContainer.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 if(button.dataset.radialChild!==undefined){
  selectRadialPath([...radialPath,taxonKey(radialChildren[Number(button.dataset.radialChild)])]);
 }else if(button.dataset.radialDepth!==undefined){
  selectRadialPath(radialPath.slice(0,Number(button.dataset.radialDepth)));
 }else if(button.dataset.radialZoom&&radialMap){
  const action=button.dataset.radialZoom;
  if(action==='fit')setRadialZoom(radialMap,radialMap.fit,true);
  else setRadialZoom(radialMap,radialMap.scale*(action==='in'?1.4:1/1.4));
 }
});
radialContainer.addEventListener('change',event=>{
 const select=event.target;
 if(select.matches('[data-radial-jump]')&&select.value!==''){
  selectRadialPath([...radialPath,taxonKey(radialChildren[Number(select.value)])]);
 }
});
$('fungarium').addEventListener('error',event=>{
 const img=event.target;
 if(!img.matches('.fg-thumbnail,.fg-radial-photo > img'))return;
 if(img.dataset.squareSrc){
  img.src=img.dataset.squareSrc;
  delete img.dataset.squareSrc;
 }else{
  img.hidden=true;
 }
},true);
const taxonPhotosReady=fetch('./assets/fungarium/taxon-photos.json?v=1')
 .then(response=>response.ok?response.json():{})
 .catch(()=>({}));
$('fgFilters').addEventListener('submit',event=>event.preventDefault());
$('fgFilters').addEventListener('input',render);
$('fgFilters').addEventListener('reset',event=>{
 event.preventDefault();
 $('fgSearch').value='';
 $('fgPhylum').value='all';
 $('fgFamily').value='all';
 $('fgSort').value='id';
 $('fgResearchOnly').checked=false;
 $('fgCollectedOnly').checked=false;
 render();
});
$('fgClear').addEventListener('click',reset);
window.addEventListener('hashchange',syncHash);
const files=['photos.json','specimens.json','observations-1.json','observations-2.json','observations-3.json','taxa-1.json','taxa-2.json','taxa-3.json'];
Promise.all([taxonPhotosReady,...files.map(file=>fetch('./assets/fungarium/'+file+'?v=4').then(r=>{if(!r.ok)throw Error(file);return r.json()}))]).then(([imageIndex,photos,specimens,obs1,obs2,obs3,...parts])=>{
 taxonPhotos=imageIndex;
 const observations=[...obs1,...obs2,...obs3];
 const taxa=Object.assign({},...parts);
 records=specimens.concat(observations.map(([id,taxonId,date,research,microscopy])=>({id,observation:id,date,quality:research?'research':'needs_id',microscopy:!!microscopy,collected:false,...taxa[taxonId]})))
  .map(record=>{
   const photoPath=photos[record.observation];
   const thumbnail=photoPath?`https://inaturalist-open-data.s3.amazonaws.com${photoPath}`:record.photo;
   return {...record,thumbnail};
  });
 $('fgTotals').innerHTML=`<div><strong>${records.length.toLocaleString('tr-TR')}</strong><span>kayıt</span></div><div><strong>${specimens.length}</strong><span>collected</span></div><div><strong>${new Set(records.map(r=>r.name)).size}</strong><span>farklı takson</span></div>`;
 for(const [id,key]of [['fgPhylum','phylum'],['fgFamily','family']]){const select=$(id);[...new Set(records.map(r=>r.taxonomy[key]).filter(v=>v&&v.toLowerCase()!=='unknown'))].sort((a,b)=>a.localeCompare(b)).forEach(v=>{const opt=document.createElement('option');opt.value=v;opt.textContent=v;select.append(opt)})}
 collectionReady=true;
 render();syncHash();
}).catch(()=>{$('fgCount').textContent='Koleksiyon yüklenemedi. Sayfayı yenileyin veya örnek listesini açın.'});
})();
