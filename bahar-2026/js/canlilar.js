(async function(){
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 const manifest=await fetch('data/observations-manifest.json').then(r=>r.json());
 const all=(await Promise.all(manifest.chunks.map(f=>fetch('data/'+f).then(r=>r.json())))).flat().filter(o=>o.quality==='research');
 const groups=[...new Set(all.map(x=>x.group))].sort();const labels={Plantae:'Bitkiler',Fungi:'Mantarlar',Insecta:'Böcekler',Arachnida:'Örümceğimsiler',Aves:'Kuşlar',Mammalia:'Memeliler',Reptilia:'Sürüngenler',Mollusca:'Yumuşakçalar',Animalia:'Diğer hayvanlar'};
 groups.forEach(g=>$('groupFilter').add(new Option(labels[g]||g,g)));
 let page=0;const pageSize=48;
 function update(reset=false){if(reset)page=0;const q=$('taxonSearch').value.toLocaleLowerCase('tr-TR').trim(),campus=$('campusFilter').value,grp=$('groupFilter').value;
 const matches=all.filter(o=>(campus==='all'||o.campus===campus)&&(grp==='all'||o.group===grp)&&(!q||[o.name,o.common,o.user].some(v=>(v||'').toLocaleLowerCase('tr-TR').includes(q))));
 const byTaxon=new Map();for(const o of matches){const key=o.taxon||o.name;if(!byTaxon.has(key))byTaxon.set(key,{key,name:o.name,common:o.common,group:o.group,rows:[]});byTaxon.get(key).rows.push(o);}
 const taxa=[...byTaxon.values()].sort($('sortFilter').value==='name'?(a,b)=>a.name.localeCompare(b.name,'tr'):(a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name,'tr'));
 const totalPages=Math.max(1,Math.ceil(taxa.length/pageSize));page=Math.min(page,totalPages-1);$('taxonCount').textContent=`${taxa.length.toLocaleString('tr-TR')} takson başlığı · ${matches.length.toLocaleString('tr-TR')} araştırma sınıfı gözlem`;
 $('taxonCards').innerHTML=taxa.slice(page*pageSize,(page+1)*pageSize).map(t=>{const o=t.rows.find(x=>x.image)||t.rows[0],photo=o.image?`<a href="${esc(o.url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(o.image)}" alt="${esc(t.name)} fotoğrafı"></a><p class="photo-credit" data-observation-id="${esc(o.id)}" data-photo-id="${esc(((o.image.split("/photos/")[1]||"").split("/")[0]))}">Fotoğraf künyesi</p>`:`<div class="bahar-missing-photo">Görsel yok</div>`;return `<article class="bahar-taxon">${photo}<div class="info"><h3><i>${esc(t.name)}</i></h3>${t.common?`<p class="common-name">${esc(t.common)}</p>`:''}<p>${t.rows.length} gözlem · ${esc(labels[t.group]||t.group)}</p><a href="${esc(o.url)}" target="_blank" rel="noopener">Gözlemi aç</a></div></article>`;}).join('')||'<p>Bu filtrelerle canlı bulunamadı.</p>';
 window.BaharPhotoCredits?.sync();
 $('pageCount').textContent=`${page+1} / ${totalPages}`;$('prevPage').disabled=page===0;$('nextPage').disabled=page>=totalPages-1;
 }
 for(const key of ['taxonSearch','campusFilter','groupFilter','sortFilter'])$(key).addEventListener(key==='taxonSearch'?'input':'change',()=>update(true));
 $('prevPage').onclick=()=>{page--;update();};$('nextPage').onclick=()=>{page++;update();};update();
}catch(e){console.error(e);$('taxonCount').textContent='Canlı kayıtları yüklenemedi.';}
})();