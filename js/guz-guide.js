(async()=>{
  'use strict';
  const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n).toLocaleString('tr-TR'),norm=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  const safeURL=u=>/^https?:\/\//.test(String(u))?String(u):'#';
  const link=(url,text,attrs='')=>`<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer" ${attrs}>${text}</a>`;
  const state={group:'',drawer:'',page:0},pageSize=16;
  try{
    const [data,photos]=await Promise.all(['data/research-guide.json','data/research-photos.json'].map(url=>fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();})));
    const entries=data.entries,groups=data.groups,byID=new Map(entries.map(e=>[String(e.id),e]));
    const drawers=[
      {id:'wood',title:'Odunun izinde',subtitle:'Bir dalın etrafındaki yaşam',photoName:'Daldinia concentrica',test:e=>e.habitats.includes('Ölü odun')},
      {id:'ground',title:'Taşın altına bak',subtitle:'Küçük bir dünyanın sakinleri',photoName:'Armadillidium peraccae',test:e=>['Animalia','Mollusca','Arachnida'].includes(e.group)&&e.habitats.some(h=>['Duvar ve taş','Toprak ve yaprak örtüsü'].includes(h))},
      {id:'flowers',title:'Çiçekten çiçeğe',subtitle:'Ziyaretçiler ve tozlaşma',photoName:'Iphiclides podalirius',test:e=>e.roles.includes('Tozlaştırıcı')}
    ];
    $('guideCounts').innerHTML=[[data.meta.observations,'araştırma sınıfı gözlem'],[data.meta.species,'tür'],[data.meta.genera,'cins düzeyinde başlık'],[data.meta.observers,'gözlemci']].map(([n,t])=>`<span><b>${fmt(n)}</b> ${esc(t)}</span>`).join('');
    $('guideDrawers').innerHTML=drawers.map(d=>{const e=entries.find(e=>e.name===d.photoName),p=e&&photos[e.id]?.own;return `<button type="button" class="guide-drawer" data-drawer="${d.id}" aria-pressed="false">${p?`<img src="${esc(safeURL(p.url))}" alt="" loading="lazy">`:''}<span><strong>${esc(d.title)}</strong><small>${esc(d.subtitle)} · ${fmt(entries.filter(d.test).length)} başlık</small></span></button>`;}).join('');
    const groupList=[{id:'',label:'Bütün canlılar',color:'#000080',count:entries.length},...Object.entries(groups).map(([id,g])=>({id,...g,count:entries.filter(e=>e.group===id).length})).filter(g=>g.count)];
    $('guideGroups').innerHTML=groupList.map(g=>`<button type="button" data-group="${esc(g.id)}" aria-pressed="${g.id===''}"><i class="guide-group-swatch" style="background:${esc(g.color)}" aria-hidden="true"></i>${esc(g.label)}<b>${fmt(g.count)}</b></button>`).join('');
    groupList.filter(g=>g.id).forEach(g=>$('guideGroupMobile').add(new Option(`${g.label} (${g.count})`,g.id)));
    [...new Set(entries.flatMap(e=>e.roles))].sort((a,b)=>a.localeCompare(b,'tr')).forEach(role=>$('guideRole').add(new Option(role,role)));
    const names=new Map(entries.map(e=>[e.name,String(e.id)]));
    const namePattern=new RegExp('\\b(?:'+[...names.keys()].sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','g');
    function prose(e,text){let out='',end=0;for(const m of text.matchAll(namePattern)){out+=esc(text.slice(end,m.index));const id=names.get(m[0]);out+=id!==String(e.id)?`<a href="#canli-${id}" class="guide-connected"><i>${esc(m[0])}</i></a>`:esc(m[0]);end=m.index+m[0].length;}return out+esc(text.slice(end));}
    function cites(e,field){return e.sources.map((s,i)=>s.supports?.includes(field)?link(s.url,`[${i+1}]`,`class="guide-cite" aria-label="Kaynak ${i+1}: ${esc(s.label)}"`):'').join('');}
    function photo(e,p,index){return !p?'':`<figure><button type="button" class="guide-photo-button" data-photo="${esc(e.id)}" data-photo-index="${index}" aria-label="${esc(e.name)} fotoğrafını büyüt"><img src="${esc(safeURL(p.url))}" alt="${esc(e.name)}; ${esc(p.author)}" loading="lazy" decoding="async"></button><figcaption>${link(p.page,esc(p.author))}<br>${esc(p.license)}</figcaption></figure>`;}
    function card(e,index){
      const pictures=photos[e.id]||{},own=pictures.own,group=groups[e.group]?.label||e.group;
      const mapURL=`./?taxon=${encodeURIComponent(e.source_taxon_ids.join(','))}&quality=research&entry=${encodeURIComponent(e.id)}`;
      return `<details class="guide-entry" id="canli-${esc(e.id)}" data-id="${esc(e.id)}"><summary><span class="guide-number">${String(index+1).padStart(3,'0')}</span>${own?`<img class="guide-thumb" src="${esc(safeURL(own.url))}" alt="${esc(e.name)} gezi fotoğrafı" loading="lazy" decoding="async">`:'<span class="guide-thumb"></span>'}<span class="guide-name"><strong>${esc(e.name)}</strong>${e.common_name?`<span class="guide-common">${esc(e.common_name)}</span>`:''}<small class="${e.rank==='genus'?'guide-rank':''}">${e.rank==='genus'?'Cins düzeyinde · ':''}${esc(group)} · ${esc(e.family)}</small></span><span class="guide-brief"><span>${esc(e.summary)}</span><span class="guide-roleline">${e.roles.map(esc).join(' · ')}</span></span><span class="guide-recordcount">${fmt(e.count)}<small>gözlem<br>${fmt(e.observers)} gözlemci</small></span><span class="guide-toggle" aria-hidden="true">+</span></summary>
      <div class="guide-spread"><div class="guide-copy"><div class="guide-tags">${e.habitats.map(h=>`<span>${esc(h)}</span>`).join('')}</div><h3>Tanıma ipuçları</h3><p>${prose(e,e.recognition)}${cites(e,'recognition')}</p><h3>Nasıl yaşar?</h3><p>${prose(e,e.life)}${cites(e,'life')}</p><h3>Yaşamdaki yeri</h3><p>${prose(e,e.ecology)}${cites(e,'ecology')}</p>${e.aliases?.length?`<p class="guide-alias">Kaynaklarda ayrıca: <i>${e.aliases.map(esc).join(', ')}</i>.</p>`:''}</div>
      <div class="guide-visual"><div class="guide-pictures">${photo(e,own,0)}${photo(e,pictures.reference,1)}</div><div class="guide-visit"><p><b>${fmt(e.count)} gezi kaydı</b> · ${fmt(e.observers)} gözlemci</p><p>CSV’deki ilk ve son kayıt: ${esc(e.first_time)}–${esc(e.last_time)}</p><details><summary>Gezi gözlemlerini aç (${fmt(e.count)})</summary><div class="guide-observation-links">${e.observations.map(o=>link(o.url,`${esc(o.author)} · ${esc(o.time)} · #${esc(o.id)}`)).join('')}</div></details><div class="guide-actions">${e.map_count?`<a href="${esc(mapURL)}">Haritada bul (${fmt(e.map_count)}) ↗</a>`:'<span class="guide-no-map">Bu kayıtlar için haritada gösterilen konum yok.</span>'}${link(`https://www.inaturalist.org/taxa/${e.id}`,'iNaturalist ↗')}</div></div></div></div>
      <footer class="guide-sources"><strong>Kaynaklar</strong>${e.sources.map((s,i)=>link(s.url,`<span class="guide-source-index">[${i+1}]</span> ${esc(s.label)} ↗`)).join('')}${e.kew&&!e.sources.some(s=>s.url.replace(/\/$/,'')===e.kew.replace(/\/$/,''))?link(e.kew,'Kew / POWO ↗'):''}<a href="#canli-${esc(e.id)}" data-permalink="${esc(e.id)}">Bu dosyanın bağlantısı #</a></footer></details>`;
    }
    function matches(e){const q=norm($('guideSearch').value),role=$('guideRole').value,drawer=drawers.find(d=>d.id===state.drawer);return (!state.group||e.group===state.group)&&(!role||e.roles.includes(role))&&(!$('guideSingle').checked||e.count===1)&&(!drawer||drawer.test(e))&&norm([e.name,e.common_name,e.family,e.summary,e.recognition,e.life,e.ecology,...e.habitats,...e.roles,...(e.aliases||[])].join(' ')).includes(q);}
    let filtered=[];
    function render(){
      filtered=entries.filter(matches).sort($('guideSort').value==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>b.count-a.count||a.name.localeCompare(b.name));
      const pages=Math.max(1,Math.ceil(filtered.length/pageSize));state.page=Math.min(state.page,pages-1);const start=state.page*pageSize,list=filtered.slice(start,start+pageSize);
      $('guideEntries').innerHTML=list.map((e,i)=>card(e,start+i)).join('');
      $('guideStatus').textContent=`${fmt(filtered.length)} canlı başlığı · ${fmt(filtered.reduce((sum,e)=>sum+e.count,0))} araştırma sınıfı gözlem`;
      $('guideActiveDrawer').textContent=drawers.find(d=>d.id===state.drawer)?.title||'';
      $('guidePage').textContent=list.length?`${start+1}–${start+list.length} / ${filtered.length} başlık · ${state.page+1}/${pages}`:'0 başlık';
      $('guidePrev').disabled=state.page===0;$('guideNext').disabled=state.page===pages-1;$('guideEmpty').hidden=filtered.length>0;
      document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===state.group)));
      document.querySelectorAll('[data-drawer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.drawer===state.drawer)));
      $('guideGroupMobile').value=state.group;bindCards();
    }
    function reset(){state.group='';state.drawer='';state.page=0;$('guideSearch').value='';$('guideRole').value='';$('guideSingle').checked=false;$('guideSort').value='count';render();}
    function bindCards(){
      document.querySelectorAll('.guide-entry').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open)history.replaceState(null,'',`#canli-${detail.dataset.id}`);}));
      document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openPhoto(b.dataset.photo,+b.dataset.photoIndex));
      document.querySelectorAll('[data-permalink]').forEach(a=>a.onclick=event=>{event.preventDefault();history.replaceState(null,'',`#canli-${a.dataset.permalink}`);});
      document.querySelectorAll('.guz-guide img').forEach(img=>{if(img.dataset.errorBound)return;img.dataset.errorBound='true';img.addEventListener('error',()=>{img.hidden=true;if(img.closest('.guide-photo-button')){const fallback=document.createElement('span');fallback.className='guide-photo-missing';fallback.textContent='Fotoğraf yüklenemedi. Altındaki kaynağı açabilirsiniz.';img.after(fallback);}},{once:true});});
    }
    function openPhoto(id,index){const e=byID.get(String(id)),p=index?photos[id]?.reference:photos[id]?.own;if(!e||!p)return;$('guidePhotoTitle').textContent=e.name;$('guidePhotoImage').src=p.large_url||p.url;$('guidePhotoImage').alt=`${e.name}; ${p.author}`;$('guidePhotoCredit').textContent=`${p.author} · ${p.license}`;$('guidePhotoSource').href=safeURL(p.page);$('guidePhotoDialog').showModal();}
    $('guidePhotoClose').onclick=()=>$('guidePhotoDialog').close();
    $('guidePhotoDialog').addEventListener('click',event=>{if(event.target===$('guidePhotoDialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
    $('guideFilters').onsubmit=event=>event.preventDefault();
    ['guideSearch','guideRole','guideSort','guideSingle'].forEach(id=>$(id).addEventListener(id==='guideSearch'?'input':'change',()=>{state.page=0;render();}));
    $('guideReset').onclick=reset;$('guideEmptyReset').onclick=reset;
    $('guideGroupMobile').onchange=()=>{state.group=$('guideGroupMobile').value;state.page=0;render();};
    document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{state.group=b.dataset.group;state.page=0;render();});
    document.querySelectorAll('[data-drawer]').forEach(b=>b.onclick=()=>{reset();state.drawer=b.dataset.drawer;render();$('guideWorkspace').scrollIntoView({block:'start',behavior:'instant'});});
    function turn(delta){state.page+=delta;render();$('guideWorkspace').scrollIntoView({block:'start',behavior:'instant'});}
    $('guidePrev').onclick=()=>turn(-1);$('guideNext').onclick=()=>turn(1);
    function openHash(){const id=location.hash.match(/^#canli-(\d+)$/)?.[1];if(!id||!byID.has(id))return;reset();const index=filtered.findIndex(e=>String(e.id)===id);state.page=Math.floor(index/pageSize);render();const detail=$(`canli-${id}`);if(detail){detail.open=true;detail.scrollIntoView({block:'start',behavior:'instant'});}}
    window.addEventListener('hashchange',openHash);render();if(location.hash)openHash();
  }catch(error){console.error(error);$('guideCounts').textContent='Canlı dosyaları yüklenemedi.';$('guideStatus').textContent='Sayfayı yenileyin ve research-guide.json ile research-photos.json dosyalarının yüklendiğini kontrol edin.';}
})();
