(async function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{
  const data=await fetch('data/observations.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
  const all=data.filter(o=>o.quality==='research');
  const labels={Plantae:'Bitkiler',Fungi:'Mantarlar',Insecta:'Böcekler',Arachnida:'Örümceğimsiler',Aves:'Kuşlar',Mammalia:'Memeliler',Reptilia:'Sürüngenler',Mollusca:'Yumuşakçalar',Animalia:'Diğer hayvanlar',Unidentified:'Tanımlanmamış',Bacteria:'Bakteriler'};
  [...new Set(all.map(x=>x.group))].sort((a,b)=>a.localeCompare(b,'tr')).forEach(g=>$('groupFilter').add(new Option(labels[g]||g,g)));
  let page=0;const pageSize=48;
  function update(reset=false){
   if(reset)page=0;
   const q=$('taxonSearch').value.trim().toLocaleLowerCase('tr-TR'),group=$('groupFilter').value;
   const matches=all.filter(o=>(group==='all'||o.group===group)&&(!q||[o.name,o.common,o.user].some(s=>String(s||'').toLocaleLowerCase('tr-TR').includes(q))));
   const byTaxon=new Map();
   for(const o of matches){const key=o.taxon||o.name;if(!byTaxon.has(key))byTaxon.set(key,{key,name:o.name,common:o.common,group:o.group,rows:[]});byTaxon.get(key).rows.push(o)}
   const taxa=[...byTaxon.values()].sort($('sortFilter').value==='name'?(a,b)=>a.name.localeCompare(b.name,'tr'):(a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name,'tr'));
   const pages=Math.max(1,Math.ceil(taxa.length/pageSize));page=Math.max(0,Math.min(page,pages-1));
   $('taxonCount').textContent=`${taxa.length.toLocaleString('tr-TR')} takson başlığı · ${matches.length.toLocaleString('tr-TR')} araştırma sınıfı gözlem`;
   $('taxonCards').innerHTML=taxa.slice(page*pageSize,(page+1)*pageSize).map(t=>{
    const o=t.rows.find(x=>x.image)||t.rows[0];const idMatch=String(o.image||'').match(/\/photos\/(\d+)\//);
    const img=o.image?`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${esc(o.image)}" alt="${esc(t.name)} fotoğrafı"></a><p class="photo-credit" data-observation-id="${esc(o.id)}" data-photo-id="${idMatch?esc(idMatch[1]):''}">Fotoğraf künyesi</p>`:'<div class="beykoz-missing-photo">Görsel yok</div>';
    return `<article class="beykoz-taxon">${img}<div class="info"><h3><i>${esc(t.name)}</i></h3>${t.common?`<p class="common-name">${esc(t.common)}</p>`:''}<p class="meta">${t.rows.length} gözlem · ${esc(labels[t.group]||t.group)}</p><a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">Gözlemi aç</a></div></article>`;
   }).join('')||'<p>Bu filtrelerle canlı bulunamadı.</p>';
   window.BaharPhotoCredits?.sync();
   $('pageCount').textContent=`${page+1} / ${pages}`;$('prevPage').disabled=page===0;$('nextPage').disabled=page>=pages-1;
  }
  for(const id of ['taxonSearch','groupFilter','sortFilter'])$(id).addEventListener(id==='taxonSearch'?'input':'change',()=>update(true));
  $('prevPage').onclick=()=>{page--;update()};$('nextPage').onclick=()=>{page++;update()};update();
 }catch(e){console.error(e);$('taxonCount').textContent='Canlı kayıtları yüklenemedi.'}
})();