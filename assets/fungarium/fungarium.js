(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankNames={phylum:'Bölüm',class:'Sınıf',order:'Takım',family:'Familya',genus:'Cins',species:'Takson'};
const hierarchy=['phylum','class','order','family','genus'];
let records=[],filtered=[],lastFocus=null;
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
function badges(r){return `<span class="fg-badges">${r.collected?'<span class="fg-badge fg-collected-badge">collected</span>':''}<span class="fg-badge ${r.quality==='research'?'fg-research':'fg-ordinary'}">${r.quality==='research'?'araştırma sınıfı':'sıradan'}</span>${r.microscopy?'<span class="fg-badge fg-microscopy">mikroskopi yapıldı</span>':''}</span>`}
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
const compactWheel=window.matchMedia('(max-width: 650px)');
let radialPath=[],radialPage=0,radialChildren=[],taxonPhotos={};
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

function radialImage(src,lazy=false){
 return `<span class="fg-radial-photo">${src?`<img src="${escape(src)}" alt="" decoding="async"${lazy?' loading="lazy"':''}>`:''}</span>`;
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

function renderDiagram(root){
 const lineage=getRadialLineage(root);
 const center=lineage.at(-1);
 radialChildren=diagramChildren(center);
 const pageSize=compactWheel.matches?6:8;
 const pages=Math.max(1,Math.ceil(radialChildren.length/pageSize));
 radialPage=Math.min(radialPage,pages-1);
 const start=radialPage*pageSize;
 const children=radialChildren.slice(start,start+pageSize);
 const credits=[];
 const rootPhoto=radialPhoto(center,credits,center.rank==='species');
 const positions=children.map((node,index)=>{
  const angle=2*Math.PI*index/children.length-Math.PI/2;
  const radiusX=compactWheel.matches?33:36;
  return [50+radiusX*Math.cos(angle),50+37*Math.sin(angle)];
 });
 const breadcrumb=lineage.map((node,index)=>index===lineage.length-1
  ?`<li aria-current="location">${radialLabel(node)}</li>`
  :`<li><button type="button" data-radial-depth="${index}">${radialLabel(node)}</button></li>`).join('');
 const centerLabel=`<div class="fg-radial-center">
  ${radialImage(rootPhoto)}
  <small>${radialRankNames[center.rank]}</small>
  <h3 id="fgRadialFocus" tabindex="-1">${radialLabel(center)}</h3>
  <span>${countText(center.count)}</span>
 </div>`;
 const wheel=children.length?`<div class="fg-radial-wheel">
  <svg class="fg-radial-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
   ${positions.map(([x,y])=>`<path d="M50 50 L${x} ${y}"/>`).join('')}
  </svg>
  ${centerLabel}
  ${children.map((node,index)=>{
   const [x,y]=positions[index];
   return `<button type="button" class="fg-radial-node" data-radial-child="${start+index}" style="--node-x:${x}%;--node-y:${y}%">
    ${radialImage(radialPhoto(node,credits))}
    <small>${radialRankNames[node.rank]}</small><strong>${radialLabel(node)}</strong><span>${countText(node.count)}</span>
   </button>`;
  }).join('')}
 </div>`:`<div class="fg-radial-leaf">${centerLabel}</div>`;
 const pagination=pages>1?`<div class="fg-radial-pagination">
  <button type="button" data-radial-page="-1"${radialPage===0?' disabled':''}>← Önceki</button>
  <span>${radialPage+1} / ${pages} · ${radialChildren.length} dal</span>
  <button type="button" data-radial-page="1"${radialPage===pages-1?' disabled':''}>Sonraki →</button>
 </div>`:'';
 const ownRecords=center.rank==='species'?center.records:center.records.filter(record=>record.rank!=='species');
 $('fgRadialRoot').disabled=lineage.length===1;
 radialContainer.innerHTML=`<nav class="fg-radial-breadcrumbs" aria-label="Takson yolu"><ol>${breadcrumb}</ol></nav>
  ${wheel}${pagination}
  ${credits.length?`<details class="fg-radial-credits"><summary>Fotoğraf kaynakları</summary><ul>${credits.join('')}</ul></details>`:''}
  ${radialGallery(ownRecords,center.rank==='species'?'Gözlem ve örnek fotoğrafları':radialRankNames[center.rank]+' düzeyinde kayıtlar')}`;
}

function selectRadialPath(path){
 radialPath=path;
 radialPage=0;
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
 const query=$('fgSearch').value.trim().toLocaleLowerCase('tr'),phylum=$('fgPhylum').value,family=$('fgFamily').value;
 const researchOnly=$('fgResearchOnly').checked;
 const collectedOnly=$('fgCollectedOnly').checked;
 filtered=records.filter(r=>{
  if(researchOnly&&r.quality!=='research')return false;
  if(collectedOnly&&!r.collected)return false;
  if(phylum!=='all'&&r.taxonomy.phylum!==phylum)return false;
  if(family!=='all'&&r.taxonomy.family!==family)return false;
  return [r.id,r.name,displayName(r),r.commonName||'',r.date,r.observation,...Object.values(r.taxonomy),r.collected?'collected':'',r.quality==='research'?'araştırma sınıfı':'sıradan',r.microscopy?'mikroskopi yapıldı':''].join(' ').toLocaleLowerCase('tr').includes(query);
 });
 const sort=$('fgSort').value;filtered.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'tr')||Number(a.observation)-Number(b.observation):sort==='date'?b.date.localeCompare(a.date)||Number(a.observation)-Number(b.observation):Number(b.collected)-Number(a.collected)||Number(a.id)-Number(b.id));
 $('fgCount').textContent=`${filtered.length.toLocaleString('tr-TR')} / ${records.length.toLocaleString('tr-TR')} kayıt · ${filtered.filter(r=>r.collected).length} collected · ${new Set(filtered.map(r=>r.name)).size} farklı takson`;
 $('fgEmpty').hidden=filtered.length>0;
 taxonomy=buildTaxonomy();
 if(query!==previousQuery){
  radialPath=findSearchPath(taxonomy,query);
  previousQuery=query;
 }
 radialPage=0;
 showView();
}
function reset(){$('fgFilters').reset()}
function closeDetail(){if(dialog.open)dialog.close();if(location.hash.startsWith('#ornek-'))history.replaceState(null,'',location.pathname+location.search);if(lastFocus&&document.contains(lastFocus))lastFocus.focus()}
function openDetail(id){
 const r=records.find(x=>x.collected&&x.id===id);if(!r)return;
 if(!dialog.open)lastFocus=document.activeElement;
 $('fgDetailId').textContent=`FUNGARIUM / ${r.id} · collected`;
 const details=[['Örnek numarası',escape(r.id)],['Gözlem tarihi',date(r.date)],['Familya',taxLabel(r.taxonomy.family||'Belirlenmemiş')],['Tanımlama durumu',r.quality==='research'?'Araştırma sınıfı':'Sıradan'],['Kaynak gözlem',`<a href="${obs(r)}" target="_blank" rel="noopener">iNaturalist #${escape(r.observation)} ↗</a>`]];
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
 }else if(button.dataset.radialPage!==undefined){
  radialPage+=Number(button.dataset.radialPage);
  renderDiagram(taxonomy);
  (radialContainer.querySelector('[data-radial-page="'+button.dataset.radialPage+'"]:not(:disabled)')||$('fgRadialFocus')).focus({preventScroll:true});
 }
});
compactWheel.addEventListener('change',()=>{
 radialPage=0;
 showView();
});
$('fungarium').addEventListener('error',event=>{
 if(event.target.matches('.fg-thumbnail,.fg-radial-photo > img'))event.target.hidden=true;
},true);
fetch('./assets/fungarium/taxon-photos.json?v=1')
 .then(response=>response.ok?response.json():{})
 .then(photos=>{
  taxonPhotos=photos;
  showView();
 })
 .catch(()=>{});
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
Promise.all(files.map(file=>fetch('./assets/fungarium/'+file+'?v=4').then(r=>{if(!r.ok)throw Error(file);return r.json()}))).then(([photos,specimens,obs1,obs2,obs3,...parts])=>{
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
 render();syncHash();
}).catch(()=>{$('fgCount').textContent='Koleksiyon yüklenemedi. Sayfayı yenileyin veya örnek listesini açın.'});
})();
