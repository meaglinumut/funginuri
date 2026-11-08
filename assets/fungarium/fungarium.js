(()=>{'use strict';
const $=id=>document.getElementById(id), escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankNames={phylum:'Bölüm',class:'Sınıf',order:'Takım',family:'Familya',genus:'Cins',species:'Takson'};
let records=[],tree=[],filtered=[],layout='cards',current=null,map=null,lastFocus=null;
const dialog=$('fgDetail'),params=new URLSearchParams(location.search);
try{layout=params.get('gorunum')||localStorage.getItem('fungarium-layout')||'cards'}catch(e){}
if(!['cards','classic'].includes(layout))layout='cards';
const date=value=>{const parts=value.split('-');return parts.length===3?`${parts[2]}.${parts[1]}.${parts[0]}`:value};
const obs=r=>`https://www.inaturalist.org/observations/${encodeURIComponent(r.observation)}`;
const name=r=>escape(r.name), taxLabel=x=>x==='Unknown'?'Belirlenmemiş':escape(x);
function setLayout(value){layout=value;document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));$('fgCards').hidden=layout!=='cards';$('fgClassic').hidden=layout!=='classic';try{localStorage.setItem('fungarium-layout',layout)}catch(e){} }
function reset(){ $('fgFilters').reset();render() }
function recordLink(r,label){return `<a class="fg-tree-record" href="#ornek-${r.id}"><i>${escape(label||r.name)}</i><span>${r.id} ↗</span></a>`}
function renderTree(){
 const ids=new Set(filtered.map(r=>r.id)),seen=new Set();
 function branch(nodes,depth=0){return nodes.map(n=>{if(n.id){const r=records.find(r=>r.id===n.id);if(!r||!ids.has(n.id))return '';seen.add(n.id);return `<li>${recordLink(r,n.name)}</li>`}const children=branch(n.children||[],depth+1);if(!children)return '';const open=depth<2||$('fgSearch').value.trim()?' open':'';return `<li><details class="${escape(n.rank)}"${open}><summary>${escape(n.name)}</summary><ul class="fg-tree-list">${children}</ul></details></li>`}).join('')}
 const body=branch(tree);const missing=filtered.filter(r=>!seen.has(r.id));
 $('fgTree').innerHTML=`<ul class="fg-tree-list">${body}</ul>`+(missing.length?`<section class="fg-tree-extra"><h3>Arşiv dizininde yer almayan örnekler</h3><ul class="fg-tree-list">${missing.map(r=>`<li>${recordLink(r)}</li>`).join('')}</ul></section>`:'');
}
function render(){
 const query=$('fgSearch').value.trim().toLocaleLowerCase('tr'),phylum=$('fgPhylum').value,family=$('fgFamily').value;
 filtered=records.filter(r=>(phylum==='all'||r.taxonomy.phylum===phylum)&&(family==='all'||r.taxonomy.family===family)&&[r.id,r.name,r.commonName,r.date,r.observation,...Object.values(r.taxonomy)].join(' ').toLocaleLowerCase('tr').includes(query));
 const sort=$('fgSort').value;filtered.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'tr')||a.id.localeCompare(b.id):sort==='date'?b.date.localeCompare(a.date)||a.id.localeCompare(b.id):a.id.localeCompare(b.id));
 $('fgCount').textContent=`${filtered.length} / ${records.length} örnek · ${new Set(filtered.map(r=>r.name)).size} farklı takson`;
 $('fgEmpty').hidden=filtered.length>0;
 $('fgCards').innerHTML=filtered.map(r=>`<article class="fg-card"><div class="fg-card-head"><span>FUNG. ${r.id}</span><span>${date(r.date)}</span></div><a class="fg-card-image" href="#ornek-${r.id}" aria-label="${name(r)} · ${r.id}"><img loading="lazy" src="${escape(r.photo)}" alt="${name(r)} örneğinin saha fotoğrafı"><span class="fg-photo-fallback">Fotoğraf yüklenemedi<br>Örnek kaydını açın ↗</span></a><div class="fg-card-copy"><h2><a href="#ornek-${r.id}"><i>${name(r)}</i></a></h2><p class="fg-family">${taxLabel(r.taxonomy.family)} · ${taxLabel(r.taxonomy.phylum)}</p><div class="fg-card-foot"><span>Örnek no. ${r.id}</span><a href="#ornek-${r.id}">Kaydı aç →</a></div></div></article>`).join('');
 renderTree();setLayout(layout);
}
function closeDetail(){if(dialog.open)dialog.close();if(location.hash.startsWith('#ornek-'))history.replaceState(null,'',location.pathname+location.search);current=null;if(map){map.remove();map=null}if(lastFocus&&document.contains(lastFocus))lastFocus.focus()}
function openDetail(id){
 const r=records.find(x=>x.id===id);if(!r)return;
 if(!dialog.open)lastFocus=document.activeElement;
 if(map){map.remove();map=null}current=r;
 $('fgDetailId').textContent=`FUNGARIUM / ${r.id}`;
 const coords=r.coordinates.join(', '),coordUrl=`https://www.openstreetmap.org/?mlat=${r.coordinates[0]}&mlon=${r.coordinates[1]}#map=16/${r.coordinates[0]}/${r.coordinates[1]}`;
 const details=[['Örnek numarası',escape(r.id)],['Gözlem tarihi',date(r.date)],['Familya',taxLabel(r.taxonomy.family)],['Kaynak gözlem',`<a href="${obs(r)}" target="_blank" rel="noopener">iNaturalist #${escape(r.observation)} ↗</a>`],['Kayıt konumu',`<a class="fg-coordinates" href="${coordUrl}" target="_blank" rel="noopener">${escape(coords)} ↗</a>`]];
 $('fgDetailBody').innerHTML=`<div class="fg-detail-grid"><figure class="fg-detail-photo"><a href="${obs(r)}" target="_blank" rel="noopener"><img src="${escape(r.photo)}" alt="${name(r)} · ${r.id}"></a><figcaption><a href="${obs(r)}" target="_blank" rel="noopener">Fotoğrafın kaynak gözlemi · iNaturalist ↗</a></figcaption><div id="fgMap" class="fg-detail-map" aria-label="Örneğin kayıt konumu"></div></figure><section class="fg-detail-info"><h2 id="fgDetailTitle"><i>${name(r)}</i></h2><dl>${details.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section></div><section class="fg-taxonomy"><h3>Sınıflandırma</h3><ol>${Object.entries(r.taxonomy).map(([k,v])=>`<li><small>${rankNames[k]||escape(k)}</small><span>${taxLabel(v)}</span></li>`).join('')}</ol></section><section class="fg-notes"><h3>Örnek notları</h3><p>${r.description?escape(r.description):'Bu kayıtta açıklama, makroskobik veya mikroskobik inceleme notu bulunmuyor.'}</p></section>`;
 const group=filtered.some(x=>x.id===id)?filtered:records,index=group.findIndex(x=>x.id===id);
 $('fgPrev').disabled=index<=0;$('fgNext').disabled=index>=group.length-1;$('fgDetailPosition').textContent=`${index+1} / ${group.length}`;
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
 if(window.L){map=L.map('fgMap',{scrollWheelZoom:false}).setView(r.coordinates,13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);L.circleMarker(r.coordinates,{radius:7,color:'#552274',fillColor:'#b988ff',fillOpacity:1,weight:2}).addTo(map);requestAnimationFrame(()=>{if(map)map.invalidateSize()})}
}
function syncHash(){const match=location.hash.match(/^#ornek-(\d{7})$/);if(match)openDetail(match[1]);else if(dialog.open)closeDetail()}
function move(delta){if(!current)return;const group=filtered.some(x=>x.id===current.id)?filtered:records,index=group.findIndex(x=>x.id===current.id),next=group[index+delta];if(next){history.replaceState(null,'',`#ornek-${next.id}`);openDetail(next.id)}}
$('fgClose').addEventListener('click',closeDetail);dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail()}});
$('fgPrev').addEventListener('click',()=>move(-1));$('fgNext').addEventListener('click',()=>move(1));
$('fgFilters').addEventListener('submit',e=>e.preventDefault());$('fgFilters').addEventListener('input',render);$('fgFilters').addEventListener('change',render);$('fgFilters').addEventListener('reset',()=>queueMicrotask(render));$('fgClear').addEventListener('click',reset);
document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>setLayout(b.dataset.layout)));
window.addEventListener('hashchange',syncHash);
$('fgCards').addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.parentElement.classList.add('failed')},true);
Promise.all([fetch('./assets/fungarium/specimens.json').then(r=>{if(!r.ok)throw Error('data');return r.json()}),fetch('./assets/fungarium/taxonomy.json').then(r=>{if(!r.ok)throw Error('tree');return r.json()})]).then(([data,hierarchy])=>{records=data;tree=hierarchy;
 $('fgTotals').innerHTML=`<div><strong>${records.length}</strong><span>örnek kaydı</span></div><div><strong>${new Set(records.map(r=>r.name)).size}</strong><span>farklı takson</span></div><div><strong>${new Set(records.map(r=>r.taxonomy.family)).size}</strong><span>familya</span></div>`;
 for(const [id,key]of [['fgPhylum','phylum'],['fgFamily','family']]){const select=$(id);[...new Set(records.map(r=>r.taxonomy[key]))].sort((a,b)=>a.localeCompare(b)).forEach(v=>{const opt=document.createElement('option');opt.value=v;opt.textContent=v;select.append(opt)})}
 render();syncHash();
}).catch(()=>{$('fgCount').textContent='Koleksiyon yüklenemedi. Sayfayı yenileyin veya örnek listesini açın.'});
})();
