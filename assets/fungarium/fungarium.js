(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankNames={phylum:'Bölüm',class:'Sınıf',order:'Takım',family:'Familya',genus:'Cins',species:'Takson'};
const hierarchy=['phylum','class','order','family','genus'];
let records=[],filtered=[],lastFocus=null;
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
function renderTree(){
 const root={children:new Map(),records:[]};
 for(const record of filtered){
  let parent=root;
  for(const rank of hierarchy){
   const value=record.taxonomy[rank];
   if(!value||value.toLowerCase()==='unknown')continue;
   const key=rank+':'+value;
   if(!parent.children.has(key))parent.children.set(key,{rank,name:value,children:new Map(),records:[]});
   parent=parent.children.get(key);
  }
  parent.records.push(record);
 }
 let railIndex=0;
 function branch(node){
  const children=[...node.children.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  const nested=children.map(child=>{
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
 $('fgEmpty').hidden=filtered.length>0;renderTree();
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
$('fgCollapseAll').addEventListener('click',()=>expandTo(-1));
document.querySelectorAll('[data-fg-open-depth]').forEach(button=>{
 button.addEventListener('click',()=>expandTo(Number(button.dataset.fgOpenDepth)));
});
$('fgTree').addEventListener('error',event=>{
 if(event.target.matches('.fg-thumbnail'))event.target.hidden=true;
},true);
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
