/* Fotoğraflar ve kredi bilgileri data/bolu-2026/gallery.json dosyasındadır. */
(async function(){
 const host=document.getElementById('tripPhotos');if(!host)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{
  const response=await fetch('../data/bolu-2026/gallery.json');if(!response.ok)throw Error(response.status);const config=await response.json();
  const url=p=>'../assets/photos/bolu-2026/'+encodeURIComponent(p.file);
  const defaultCredit=`Fotoğraf: <a href="${esc(config.credit.url)}" target="_blank" rel="noopener noreferrer">${esc(config.credit.name)}</a>`;
  const creditFor=p=>p.credit===null?'':defaultCredit;const credit=creditFor(config.cover);
  const cover=document.createElement('figure');cover.className='trip-cover';cover.innerHTML=`<img src="${url(config.cover)}" alt="${esc(config.cover.caption)}" fetchpriority="high"><figcaption>${esc(config.cover.caption)} · ${credit}</figcaption>`;
  document.getElementById('tripCover')?.append(cover);
  host.innerHTML=`<h2>Geziden kareler</h2><p class="trip-credit">Doğa fotoğrafları: <a href="${esc(config.credit.url)}" target="_blank" rel="noopener noreferrer">${esc(config.credit.name)}</a></p><div class="trip-grid">${config.photos.map((p,i)=>`<figure class="trip-card"><button type="button" data-photo="${i}" aria-label="${esc(p.caption)} fotoğrafını büyüt"><img src="${url(p)}" alt="${esc(p.caption)}" loading="lazy" decoding="async"></button><figcaption>${esc(p.caption)}</figcaption></figure>`).join('')}</div>`;
  const all=[config.cover,...config.photos];const dialog=document.createElement('dialog');dialog.className='photo-dialog';dialog.setAttribute('aria-labelledby','photoTitle');dialog.innerHTML=`<header><h3 id="photoTitle"></h3><button type="button" class="photo-close" aria-label="Fotoğrafı kapat">Kapat ✕</button></header><figure><img alt=""><figcaption></figcaption></figure><nav aria-label="Fotoğraf gezinme"><button type="button" class="photo-prev">◀ Önceki</button><span class="photo-count" aria-live="polite"></span><button type="button" class="photo-next">Sonraki ▶</button></nav>`;document.body.append(dialog);
  let current=0;function show(i){current=(i+all.length)%all.length;const p=all[current];dialog.querySelector('img').src=url(p);dialog.querySelector('img').alt=p.caption;dialog.querySelector('h3').textContent=p.caption;dialog.querySelector('figcaption').innerHTML=(creditFor(p)?creditFor(p)+' · ':'')+'<a href="'+url(p)+'" target="_blank" rel="noopener">Tam boy aç</a>';dialog.querySelector('.photo-count').textContent=(current+1)+' / '+all.length;}
  function open(i){show(i);dialog.showModal()}
  host.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>open(Number(button.dataset.photo)+1)));
  const coverImage=cover.querySelector('img');coverImage.tabIndex=0;coverImage.style.cursor='zoom-in';coverImage.setAttribute('role','button');coverImage.setAttribute('aria-label','Kapak fotoğrafını büyüt');coverImage.addEventListener('click',()=>open(0));coverImage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(0)}});
  dialog.querySelector('.photo-close').onclick=()=>dialog.close();dialog.querySelector('.photo-prev').onclick=()=>show(current-1);dialog.querySelector('.photo-next').onclick=()=>show(current+1);
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 }catch(error){console.error('Fotoğraf galerisi yüklenemedi',error);host.textContent='Fotoğraf galerisi şu anda yüklenemiyor.'}
})();
