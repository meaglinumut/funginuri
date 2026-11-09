/* Funginuri Mikroskopi: user-exported observations + live iNaturalist photo galleries. */
(async () => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const prettyDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}) : '';
  const safeUrl = url => /^https:\/\//.test(String(url || '')) ? String(url) : '';
  const variant = (url, size) => String(url || '').replace(/\/(?:square|thumb|small|medium|large|original)\.(jpg|jpeg|png|webp)(?:\?|$)/i, (_, ext) => '/' + size + '.' + ext);
  const imageForId = id => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/medium.jpeg`;
  const linkForId = id => `https://www.inaturalist.org/photos/${id}`;
  const rankText = {species:'Tür',genus:'Cins',class:'Sınıf',higher:'Üst takson'};
  const currentPhotos = new Map();
  const foundOverrides = new Map();
  let records=[], wantedPhotoIds=[], active={id:null,index:0}, lastFocused=null;
  let filtered=[];
  try {
    const resp=await fetch('./assets/microscopy/observations.json',{cache:'no-cache'});
    if (!resp.ok) throw new Error('Veri dosyası: '+resp.status);
    const payload=await resp.json();
    records=payload.observations||[];
    wantedPhotoIds=payload.requestedPhotoIds||[];
    $('microTotal').textContent=String(records.length);
    $('microFamilies').textContent=String(new Set(records.map(x=>x.family).filter(Boolean)).size);
    for (const division of [...new Set(records.map(x=>x.phylum).filter(Boolean))].sort()) {
      $('microDivision').add(new Option(division,division));
    }
    render();
    loadPublicPhotos();
  } catch (error) {
    console.error('Mikroskopi sayfası:',error);
    $('microCards').innerHTML='<p class="micro-empty">Gözlem kayıtları yüklenemedi.</p>';
  }

  function normalizePhoto(p) {
    if (!p || !p.id) return null;
    const url = variant(p.url || p.medium_url || p.large_url || '', 'medium');
    const large = variant(p.url || p.large_url || url, 'large');
    if (!safeUrl(url)) return null;
    return {id:Number(p.id),url,large:safeUrl(large)||url,attribution:String(p.attribution||''),license:String(p.license_code||''),external:linkForId(p.id)};
  }

  async function loadPublicPhotos() {
    // A single public read request. If it fails, the exported CSV photographs remain visible.
    try {
      const ids=records.map(x=>x.id).join(',');
      const url='https://api.inaturalist.org/v1/observations?per_page=100&id='+encodeURIComponent(ids);
      const controller=new AbortController();
      const response=await fetch(url,{signal:controller.signal});
      if(!response.ok) throw new Error('iNaturalist API: '+response.status);
      const json=await response.json();
      const results=json.results||[];
      if(!Array.isArray(results)||!results.length)throw new Error('Gözlem fotoğrafları bulunamadı.');
      for (const ob of results) {
        const photos=(ob.photos||[]).map(normalizePhoto).filter(Boolean);
        currentPhotos.set(Number(ob.id),photos);
        for (const p of photos) if(wantedPhotoIds.includes(p.id)) foundOverrides.set(Number(ob.id),p.id);
      }
      render();
    } catch(error) {
      console.warn('iNaturalist fotoğraf galerisi yüklenemedi; CSV ve kullanıcı bağlantıları kullanılıyor.',error);
    }
  }

  function picturesFor(record) {
    const fromAPI=currentPhotos.get(record.id);
    const csvPhoto=record.photoUrl?{id:record.csvPhotoId,url:record.photoUrl,large:variant(record.photoUrl,'large'),attribution:'',license:'',external:record.csvPhotoId?linkForId(record.csvPhotoId):record.observationUrl}:null;
    if (fromAPI && fromAPI.length) {
      const pin=foundOverrides.get(record.id);
      const chosen=fromAPI.find(x=>x.id===pin)||fromAPI.find(x=>x.id===record.csvPhotoId)||fromAPI[0];
      return [chosen,...fromAPI.filter(x=>x.id!==chosen.id)];
    }
    // Six supplied photo URLs: conservative fallback matching; corrected automatically
    // using the observation's actual photo array when live metadata is available.
    const pin=record.suggestedCoverId;
    const pinned=pin?{id:pin,url:imageForId(pin),large:imageForId(pin).replace('/medium.','/large.'),attribution:'',license:'',external:linkForId(pin),fallback:csvPhoto?.url}:null;
    return [pinned,csvPhoto].filter(Boolean);
  }

  function imageTag(pic,record,cls='') {
    const alt=esc(record.name+' fotoğrafı');
    const fallback=pic.fallback||record.photoUrl||'';
    return `<img class="${esc(cls)}" src="${esc(pic.url)}" alt="${alt}" loading="lazy" decoding="async" data-fallback="${esc(fallback)}" data-photo-id="${esc(pic.id||'')}">`;
  }

  function filteredRecords() {
    const q=$('microSearch').value.trim().toLocaleLowerCase('tr-TR');
    const div=$('microDivision').value;
    const rows=records.filter(r=>(div==='all'||r.phylum===div)&&(!q||[r.name,r.genus,r.family,r.commonName,r.phylum].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q))));
    const order=$('microSort').value;
    rows.sort(order==='name' ? (a,b)=>a.name.localeCompare(b.name,'tr') : order==='oldest' ? (a,b)=>a.observedOn.localeCompare(b.observedOn) : (a,b)=>b.observedOn.localeCompare(a.observedOn));
    return rows;
  }

  function render(){
    filtered=filteredRecords();
    $('microResult').innerHTML=`<strong>${filtered.length}</strong> / ${records.length} mikroskopi kaydı gösteriliyor`;
    $('microCards').innerHTML=filtered.map(r=>{
      const photos=picturesFor(r), first=photos[0], phy=esc(r.phylum||'Fungi'), name=esc(r.name);
      const leaf=r.species?`<i>${name}</i>`:name;
      const title=first?`<button type="button" class="micro-cover" data-image-open="${r.id}" data-image-index="0" aria-label="${name} görsellerini aç">${imageTag(first,r)}<span class="micro-open-label">Görsellere bak</span></button>`:'<div class="micro-cover">Görsel yok</div>';
      const thumbs=photos.slice(1,4).map((p,i)=>`<button type="button" class="micro-thumb" data-image-open="${r.id}" data-image-index="${i+1}" aria-label="${name} görsel ${i+2}">${imageTag(p,r)}</button>`).join('');
      const strip=photos.length>1?`<div class="micro-photo-strip">${thumbs}${photos.length>4?`<span class="micro-more-photos">+${photos.length-4} görsel</span>`:''}</div>`:'';
      const photoCredit=first?`<div class="micro-credit">Fotoğraf: <a href="${esc(first.external)}" target="_blank" rel="noopener">${first.attribution?esc(first.attribution):'iNaturalist kaynağı'}</a>${first.license?' · '+esc(first.license.toUpperCase()):''}</div>`:'';
      const speciesTag=r.species?'Tür düzeyinde':r.rank==='genus'?'Cins düzeyinde':'Tür düzeyinde değil';
      const notes=r.notes?`<div class="micro-record-note"><p>${esc(r.notes.length>225?r.notes.slice(0,222)+'…':r.notes).replace(/\n/g,' ')}</p></div>`:'';
      const heroLink=first ? `<button type="button" class="micro-action" data-image-open="${r.id}" data-image-index="0">${photos.length>1?photos.length+' fotoğrafı incele':'Fotoğrafı büyüt'}</button>` : '';
      const extras=r.suggestedCoverId?`<a class="micro-link" href="${linkForId(r.suggestedCoverId)}" target="_blank" rel="noopener">Seçilen fotoğraf ↗</a>`:'';
      return `<article class="micro-card" data-observation="${r.id}">
        <div class="micro-photo-wrap">${title}${strip}</div>
        ${photoCredit}
        <div class="micro-info"><div class="micro-taxonomy">${phy}${r.className?' / '+esc(r.className):''}</div>
        <h2>${leaf}</h2>${r.commonName?`<p class="micro-common">${esc(r.commonName)}</p>`:''}
        <div class="micro-tags"><span>${speciesTag}</span>${r.family?`<span>${esc(r.family)}</span>`:''}${r.genus?`<span>${esc(r.genus)}</span>`:''}</div>
        <div class="micro-record-note"><p>${prettyDate(r.observedOn)}${r.place?' · '+esc(r.place.split(',')[0]):''}</p></div>
        ${notes}
        <div class="micro-foot">${heroLink}<a class="micro-link" href="${esc(r.observationUrl)}" target="_blank" rel="noopener">iNaturalist gözlemi ↗</a>${extras}</div>
        </div></article>`;
    }).join('') || '<p class="micro-empty">Bu filtrelere uygun kayıt bulunamadı.</p>';
  }

  for (const id of ['microSearch','microDivision','microSort']) $(id).addEventListener(id==='microSearch'?'input':'change',render);

  function openViewer(observationId,index,trigger) {
    const r=records.find(x=>x.id===Number(observationId));
    if(!r)return;
    const photos=picturesFor(r);
    if(!photos.length)return;
    active={id:r.id,index:Math.max(0,Math.min(index,photos.length-1))};
    lastFocused=trigger;
    $('microViewer').hidden=false;
    document.body.classList.add('micro-viewer-open');
    showViewer();
    $('microClose').focus();
  }

  function showViewer(){
    const r=records.find(x=>x.id===active.id);if(!r)return;
    const photos=picturesFor(r),p=photos[active.index];if(!p)return;
    $('microViewerTitle').textContent=r.name;
    $('microViewerCounter').textContent=`${active.index+1} / ${photos.length}`;
    $('microViewerImage').src=p.large||p.url;
    $('microViewerImage').alt=r.name+' gözlem fotoğrafı '+(active.index+1);
    $('microViewerImage').dataset.fallback=p.url;
    $('microViewerSource').href=p.external||r.observationUrl;
    $('microViewerSource').textContent='Fotoğrafı iNaturalist’te aç';
    $('microViewerCredit').textContent=[p.attribution,p.license?.toUpperCase()].filter(Boolean).join(' · ');
  }

  function closeViewer(){
    $('microViewer').hidden=true;
    document.body.classList.remove('micro-viewer-open');
    if(lastFocused && document.contains(lastFocused))lastFocused.focus();
  }
  function nextViewer(delta){
    const r=records.find(x=>x.id===active.id);if(!r)return;
    const size=picturesFor(r).length;
    active.index=(active.index+delta+size)%size;showViewer();
  }
  $('microCards').addEventListener('click',e=>{
    const button=e.target.closest('[data-image-open]');
    if(button)openViewer(button.dataset.imageOpen,Number(button.dataset.imageIndex||0),button);
  });
  $('microClose').addEventListener('click',closeViewer);
  $('microPrevious').addEventListener('click',()=>nextViewer(-1));
  $('microNext').addEventListener('click',()=>nextViewer(1));
  $('microViewer').addEventListener('click',e=>{if(e.target===$('microViewer'))closeViewer()});
  document.addEventListener('keydown',e=>{
    if($('microViewer').hidden)return;
    if(e.key==='Escape')closeViewer();
    if(e.key==='ArrowRight')nextViewer(1);
    if(e.key==='ArrowLeft')nextViewer(-1);
  });
  document.addEventListener('error',e=>{
    if(e.target.tagName!=='IMG')return;
    const img=e.target;
    const original=img.getAttribute('src')||'';
    const stage=Number(img.dataset.failStage||0);
    if(stage===0 && original.includes('/medium.jpeg')){
      img.dataset.failStage='1';img.src=original.replace('/medium.jpeg','/medium.jpg');return;
    }
    if(stage<=1 && original.includes('inaturalist-open-data.s3.amazonaws.com')){
      img.dataset.failStage='2';img.src=original.replace('inaturalist-open-data.s3.amazonaws.com','static.inaturalist.org');return;
    }
    if(img.dataset.fallback && img.dataset.fallback!==original){
      img.dataset.failStage='3';const fallback=img.dataset.fallback;img.dataset.fallback='';img.src=fallback;return;
    }
    img.style.opacity='.3';
  },true);
})();