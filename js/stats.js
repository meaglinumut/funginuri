(async function(){
try {
const data=await fetch("../data/bolu-2026/statistics.json").then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('tr-TR');
document.getElementById('metrics').innerHTML=data.metrics.map(x=>`<div class="metric"><strong>${esc(x.value)}</strong><span>${esc(x.label)}</span></div>`).join('');
data.charts.forEach((c,i)=>{let pos=0,total=c.items.reduce((n,x)=>n+x.count,0);const gradient=c.items.map(x=>{const start=pos;pos+=x.count/total*100;return `${x.color} ${start}% ${pos}%`}).join(',');document.getElementById('chart'+i).innerHTML=`<h2>${esc(c.title)}</h2><div class="donut" style="background:conic-gradient(${gradient})"><div><strong>${esc(c.center_value)}</strong><br>${esc(c.center_label)}</div></div><ul>${c.items.map(x=>`<li><i style="background:${x.color}"></i>${esc(x.label)}<b>${fmt(x.count)}</b></li>`).join('')}</ul>`});
document.getElementById('facts').innerHTML=data.facts.map(x=>`<div class="fact"><strong>${esc(x.value)}</strong><span>${esc(x.label)}</span></div>`).join('');
function bars(id,rows){const max=Math.max(1,...rows.map(x=>x.count));document.getElementById(id).innerHTML=rows.map(x=>`<div class="barrow"><span>${esc(x.label)}</span><div class="track"><div style="width:${x.count/max*100}%"></div></div><b>${fmt(x.count)}</b></div>`).join('')}
for(const key of ['top_taxa','hours'])bars(key,data[key]);
function ranking(){bars('ranks',data.rankings[document.getElementById('ranking').value].map(([label,count])=>({label,count})))}document.getElementById('ranking').onchange=ranking;ranking();
document.getElementById('observers').innerHTML=data.observers.map(x=>`<tr><td>${esc(x.user)}</td><td>${fmt(x.observations)}</td><td>${fmt(x.taxa)}</td><td>${fmt(x.research)}</td></tr>`).join('');
} catch(error){ console.error(error);const message=document.createElement("p");message.className="runtime-error";message.textContent="Veriler yüklenemedi. Lütfen sayfayı yenileyin.";document.querySelector("main").prepend(message);}
})();
