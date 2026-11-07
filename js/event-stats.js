(async function () {
  const $=id=>document.getElementById(id), fmt=n=>n.toLocaleString('tr-TR');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const data=await fetch(document.body.dataset.statistics,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}), s=data.summary;
    $('metrics').innerHTML=[[s.observations,'Gözlem'],[s.project_species_count ?? s.species, s.project_species_count ? 'Tür / takson (iNaturalist)' : 'Tür'],[s.observers,'Gözlemci'],[s.quality.research,'Araştırma sınıfı kayıt']].map(([n,label])=>`<div class="metric"><strong>${fmt(n)}</strong><span>${label}</span></div>`).join('');
    function donut(id,title,center,label,items){
      const total=items.reduce((a,b)=>a+b.count,0);let pos=0;const gradient=items.filter(x=>x.count).map(x=>{const start=pos;pos+=x.count/total*100;return `${x.color} ${start}% ${pos}%`;}).join(',');
      $(id).innerHTML=`<h2>${esc(title)}</h2><div class="event-donut" style="background:conic-gradient(${gradient})" role="img" aria-label="${esc(items.map(x=>x.label+': '+x.count).join(', '))}"><div><strong>${fmt(center)}</strong><span>${esc(label)}</span></div></div><ul class="chart-key">${items.filter(x=>x.count).map(x=>`<li><i style="background:${x.color}"></i><span>${esc(x.label)}</span><b>${fmt(x.count)}</b></li>`).join('')}</ul>`;
    }
    donut('qualityChart','Gözlemlerin tanımlanma durumu',s.observations,'gözlem',[{label:'Araştırma sınıfı',count:s.quality.research||0,color:'#A8CC00'},{label:'Tanımlama gerekli',count:s.quality.needs_id||0,color:'#FFEC8B'},{label:'Sıradan',count:s.quality.casual||0,color:'#AAA'}]);
    donut('groupChart',s.project_species_count?'Canlı gruplarına göre tür düzeyindeki teşhisler':'Canlı gruplarına göre türler',s.species,'tür',data.groups.map(g=>({label:g.label,count:g.species,color:g.color})));
    const peak=data.hours.reduce((a,b)=>a.count>b.count?a:b,{label:'Saat yok',count:0});
    $('facts').innerHTML=[[s.taxa,'farklı takson'],...(s.project_species_count?[[s.species,'CSV’de tür düzeyinde tanımlanmış farklı tür']]:[]),[data.single_observer_species,'tür yalnızca bir gözlemci tarafından kaydedildi'],[data.single_record_species,'tür yalnızca bir kayıtta yer aldı'],[peak.label,'en yoğun gözlem saati'],[(100*s.quality.research/s.observations).toLocaleString('tr-TR',{maximumFractionDigits:1})+'%','araştırma sınıfına ulaşan kayıt']].map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('');
    function bars(id,items){const max=Math.max(1,...items.map(x=>x.count));$(id).innerHTML=items.map(x=>`<div class="event-barrow"><span>${esc(x.label)}</span><div class="event-track"><div style="width:${x.count/max*100}%"></div></div><b>${fmt(x.count)}</b></div>`).join('');}
    bars('hours',data.hours);bars('topTaxa',data.top_taxa);
    function curve(id,key,label){
      const rows=data.accumulation.filter(x=>x.t!==null);if(!rows.length){$(id).textContent='Saat bilgisi yok.';return;}const min=Math.floor(rows[0].t/60)*60, max=Math.max(min+60,Math.ceil(rows.at(-1).t/60)*60), total=Math.max(...rows.map(x=>x[key])), x=t=>52+(t-min)/(max-min)*650, y=n=>220-n/total*185;
      const points=[[min,0],...rows.map(r=>[r.t,r[key]])].map(([t,n])=>`${x(t)},${y(n)}`).join(' ');
      const ticks=Array.from({length:5},(_,i)=>{const n=Math.round(total*i/4);return `<line x1="52" x2="702" y1="${y(n)}" y2="${y(n)}" stroke="#a0baa4"/><text x="44" y="${y(n)+4}" text-anchor="end">${fmt(n)}</text>`;}).join('');
      let times='';for(let t=min;t<=max;t+=Math.max(60,Math.ceil((max-min)/360)*60))times+=`<text x="${x(t)}" y="244" text-anchor="middle">${String(t/60).padStart(2,'0')}.00</text>`;
      $(id).innerHTML=`<svg class="event-curve" viewBox="0 0 730 260" role="img" aria-label="${esc(label)}: gün sonunda ${fmt(total)}"><title>${esc(label)}: ${fmt(total)}</title>${ticks}<polyline points="${points}" fill="none" stroke="#135f39" stroke-width="3"/>${times}</svg>`;
    }
    curve('observationCurve','observations','Birikimli gözlem sayısı');curve('speciesCurve','species','Birikimli tür sayısı');
    function observers(){const search=$('observerSearch').value.trim().toLocaleLowerCase('tr-TR'), key=$('ranking').value;const rows=data.observers.filter(d=>d.user.toLocaleLowerCase('tr-TR').includes(search)).sort((a,b)=>b[key]-a[key]||a.user.localeCompare(b.user));
      $('observerRows').innerHTML=rows.map(d=>`<tr><td><a href="./?observer=${encodeURIComponent(d.user)}">${esc(d.user)}</a></td><td>${fmt(d.observations)}</td><td>${fmt(d.species)}</td><td>${fmt(d.taxa)}</td><td>${fmt(d.research)}</td><td>${fmt((d.location.gps_explicit||0)+(d.location.gps_likely||0))}</td><td>${fmt(d.location.estimated||0)}</td><td>${fmt(d.map_observations===undefined?(d.location.uncertain||0)+(d.location.unlocated||0)+(d.location.excluded||0):d.observations-d.map_observations)}</td></tr>`).join('')||'<tr><td colspan="8">Gözlemci bulunamadı.</td></tr>';
    }
    if(data.definition_note && document.querySelector('.stat-note'))document.querySelector('.stat-note').textContent=data.definition_note+' '+(data.time_note||'');$('ranking').onchange=observers;$('observerSearch').oninput=observers;observers();
  }catch(error){console.error(error);$('metrics').textContent='İstatistik verileri yüklenemedi. Dosyaların GitHub’a yüklendiğini kontrol edin.';}
})();
