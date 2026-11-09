'use strict';

const byId = id => document.getElementById(id);
const number = new Intl.NumberFormat('tr-TR');
const dateFormat = new Intl.DateTimeFormat('tr-TR', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'});
const msPerDay = 86400000;
const day = value => Date.parse(value) / msPerDay;
const dateLabel = value => dateFormat.format(value * msPerDay);
const format = value => number.format(value);
const observationUrl = id => 'https://www.inaturalist.org/observations/' + id;
const labels = {
  Animalia:'Diğer hayvanlar', Arachnida:'Örümceğimsiler', Aves:'Kuşlar',
  Chromista:'Kromistler', Fungi:'Mantarlar', Insecta:'Böcekler', Mammalia:'Memeliler',
  Mollusca:'Yumuşakçalar', Plantae:'Bitkiler', Protozoa:'Protozoalar',
  Reptilia:'Sürüngenler', Unidentified:'Grubu belirsiz'
};
const locationLabels = {
  estimated:'Tahmini konum', gps_likely:'Tür Say kaydındaki konum',
  gps_explicit:'GPS konumu', uncertain:'Konumu belirsiz', csv:'Gözlemde paylaşılan konum'
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, url) {
  const node = element('a', text);
  node.href = url;
  return node;
}

async function read(name) {
  const response = await fetch('data/' + name + '?v=2');
  if (!response.ok) throw new Error(name + ' (' + response.status + ')');
  return response.json();
}

function counts(records) {
  return {
    total: records.length,
    species: new Set(records.map(o => o.taxon.species).filter(Boolean)).size,
    observers: new Set(records.map(o => o.user).filter(Boolean)).size,
    research: records.filter(o => o.quality === 'research').length,
    needsId: records.filter(o => o.quality === 'needs_id').length
  };
}

function populateOptions(select, items) {
  select.replaceChildren(...items.map(([value,label]) => new Option(label,value)));
}

function tally(records, key) {
  const buckets = new Map();
  for (const o of records) {
    const name = key(o);
    if (name) buckets.set(name, (buckets.get(name) || 0) + 1);
  }
  return [...buckets];
}

function campusSelection(campuses) {
  const select = byId('campus');
  const options = [['','Tüm kampüsler'], ...campuses.map(c => [c.id,c.name])];
  populateOptions(select, options);

  const requested = new URLSearchParams(location.search).get('kampus') || '';
  if (options.some(([id]) => id === requested)) select.value = requested;
  function syncLinks() {
    const current = new URL(location.href);
    if (select.value) current.searchParams.set('kampus',select.value);
    else current.searchParams.delete('kampus');
    history.replaceState(null,'',current);
    for (const tab of document.querySelectorAll('.atlas .event-tabs a')) {
      const target = new URL(tab.href);
      if (select.value) target.searchParams.set('kampus',select.value);
      else target.searchParams.delete('kampus');
      tab.href = target.href;
    }
  }
  select.addEventListener('change',syncLinks);
  syncLinks();
  return select;
}

function selectCampus(select, id) {
  select.value = id;
  select.dispatchEvent(new Event('change'));
}

function groupSelection(records) {
  const select = byId('group');
  const groups = [...new Set(records.map(o => o.taxon.group))].map(id => [id,labels[id] || id]);
  groups.sort((a,b) => a[1].localeCompare(b[1],'tr'));
  populateOptions(select,[['','Tüm gruplar'],...groups]);
  return select;
}

function inScope(records, id) {
  return id ? records.filter(o => o.campus === id) : records;
}

function initMap(records, boundaries, campuses, campus, summary) {
  const campusIds = new Set(campuses.map(c => c.id));
  const mapped = records.filter(o => o.lat !== null && campusIds.has(o.campus));
  const group = groupSelection(mapped);
  const quality = byId('quality');
  const map = L.map('atlasMap',{maxZoom:19, zoomSnap:.5});
  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxNativeZoom:19, attribution:'Esri, Vantor, Earthstar Geographics, GIS User Community'}
  ).addTo(map);
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
  });
  byId('basemap').addEventListener('change',event => {
    if (event.target.value === 'street') { map.removeLayer(satellite); street.addTo(map); }
    else { map.removeLayer(street); satellite.addTo(map); }
  });

  const colors = new Map(campuses.map(c => [c.id,c.color]));
  const campusNames = new Map(campuses.map(c => [c.id,c.name]));
  const borders = L.geoJSON(boundaries,{
    style: feature => ({color:feature.properties.color,weight:3,fillOpacity:.10}),
    onEachFeature(feature,layer) {
      const {id,name} = feature.properties;
      layer.bindTooltip(element('span',name),{sticky:true});
      layer.on('click',() => selectCampus(campus,id));
    }
  }).addTo(map);
  const allBounds = borders.getBounds();
  const campusBounds = new Map();
  borders.eachLayer(layer => campusBounds.set(layer.feature.properties.id,layer.getBounds()));
  for (const o of mapped) campusBounds.get(o.campus).extend([o.lat,o.lon]);
  function fit() {
    const bounds = campusBounds.get(campus.value);
    map.fitBounds(bounds?.isValid() ? bounds : allBounds,{padding:[28,28],maxZoom:17});
  }

  const keys = [['','Tümü',null], ...campuses.map(c => [c.id,c.name,c.color])];
  const keyButtons = keys.map(([id,name,color]) => {
    const button = element('button');
    button.type = 'button';
    if (color) {
      const swatch = element('span',null,'atlas-swatch');
      swatch.style.setProperty('--swatch',color);
      button.append(swatch);
    }
    button.append(name);
    button.addEventListener('click',() => selectCampus(campus,id));
    byId('campusKey').append(button);
    return [id,button];
  });
  const wrap = byId('mapWrap');
  const full = byId('fullMap');
  const updateFull = () => {
    const active = document.fullscreenElement === wrap || wrap.classList.contains('map-expanded');
    full.setAttribute('aria-label',active ? 'Tam ekrandan çık' : 'Tam ekran');
    full.title = full.getAttribute('aria-label');
    map.invalidateSize();
  };
  full.addEventListener('click',async () => {
    if (document.fullscreenElement === wrap) { await document.exitFullscreen(); return; }
    if (wrap.classList.contains('map-expanded')) { wrap.classList.remove('map-expanded'); updateFull(); return; }
    try {
      if (!wrap.requestFullscreen) throw new Error();
      await wrap.requestFullscreen();
    } catch {
      wrap.classList.add('map-expanded');
      updateFull();
    }
  });
  document.addEventListener('fullscreenchange',updateFull);
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && wrap.classList.contains('map-expanded')) {
      wrap.classList.remove('map-expanded');
      updateFull();
    }
  });
  byId('fitMap').addEventListener('click',fit);
  L.control.scale({imperial:false}).addTo(map);

  const timeline = byId('timeline');
  const play = byId('play');
  const start = day(summary.from);
  const end = day(summary.to);
  timeline.min = start;
  timeline.max = end;
  timeline.value = end;
  timeline.disabled = play.disabled = start === end;
  byId('startDate').textContent = dateLabel(start);
  byId('endDate').textContent = dateLabel(end);

  const renderer = L.canvas({padding:.35,tolerance:4});
  const visible = L.layerGroup().addTo(map);
  const cache = new Map();
  let filtered = [];
  let index = 0;
  let frame = 0;
  function marker(o) {
    if (!cache.has(o.id)) {
      const estimated = o.status === 'estimated';
      const point = L.circleMarker([o.lat,o.lon],{
        renderer,radius:estimated ? 4.5 : 4,weight:1.1,
        fillColor:estimated ? '#ffb757' : colors.get(o.campus) || '#59636c',
        color:estimated ? '#723809' : '#fffde3',fillOpacity:.9
      });
      point.bindPopup(() => {
        const detail = element('div');
        detail.append(element('strong',o.taxon.name),
          element('div',dateLabel(o.day) + ' · ' + o.user),
          element('div',campusNames.get(o.campus) + ' · ' + (locationLabels[o.status] || 'Gözlem konumu')),
          link('iNaturalist gözlemi ↗',observationUrl(o.id)));
        return detail;
      });
      cache.set(o.id,point);
    }
    return cache.get(o.id);
  }

  function show(value) {
    const current = Math.round(value);
    while (index < filtered.length && filtered[index].day <= current) {
      visible.addLayer(marker(filtered[index++]));
    }
    while (index > 0 && filtered[index-1].day > current) {
      visible.removeLayer(marker(filtered[--index]));
    }
    timeline.value = current;
    timeline.setAttribute('aria-valuetext',dateLabel(current));
    byId('currentDate').textContent = dateLabel(current);
    byId('mapStatus').textContent =
      'Gösterilen ' + format(index) + ' / ' + format(filtered.length) + ' konumlu gözlem';
  }

  function refresh(refit) {
    visible.clearLayers();
    index = 0;
    filtered = inScope(mapped,campus.value).filter(o =>
      (!group.value || o.taxon.group === group.value) && (!quality.value || o.quality === quality.value));
    if (refit) {
      borders.eachLayer(layer => {
        const selected = !campus.value || campus.value === layer.feature.properties.id;
        layer.setStyle({opacity:selected ? 1 : .22, fillOpacity:selected ? .10 : 0});
      });
      for (const [id,button] of keyButtons) button.setAttribute('aria-pressed',String(id === campus.value));
      fit();
    }
    show(+timeline.value);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    play.textContent = 'Oynat';
  }
  play.addEventListener('click',() => {
    if (frame) { stop(); return; }
    const initial = +timeline.value === end ? start : +timeline.value;
    const duration = Number(byId('speed').value) * 1000;
    const began = performance.now();
    play.textContent = 'Duraklat';
    show(initial);
    function tick(now) {
      const next = Math.min(end,initial + (end-start)*(now-began)/duration);
      if (Math.round(next) !== +timeline.value) show(next);
      if (next === end) stop();
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
  timeline.addEventListener('input',() => { stop(); show(+timeline.value); });
  campus.addEventListener('change',() => refresh(true));
  group.addEventListener('change',() => refresh(false));
  quality.addEventListener('change',() => refresh(false));
  refresh(true);
}

function renderBars(id, entries) {
  const max = Math.max(1,...entries.map(([,value]) => value));
  const rows = entries.map(([label,value]) => {
    const row = element('div',null,'atlas-bar');
    const meter = element('meter');
    meter.max = max;
    meter.value = value;
    meter.setAttribute('aria-label',label);
    row.append(element('span',label),meter,element('output',format(value)));
    return row;
  });
  byId(id).replaceChildren(...(rows.length ? rows : [element('p','Bu kapsamda kayıt yok.')]));
}

function renderGrowth(records, summary) {
  const countsByYear = new Map(tally(records,o => o.date.slice(0,4)));
  const first = Number(summary.from.slice(0,4));
  const last = Number(summary.to.slice(0,4));
  let runningTotal = 0;
  const years = Array.from({length:last-first+1},(_,i) => {
    const year = String(first+i);
    const added = countsByYear.get(year) || 0;
    runningTotal += added;
    return {year,added,total:runningTotal};
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  function draw(tag, attrs, label) {
    const node = document.createElementNS(svgNS,tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    if (label) node.textContent = label;
    return node;
  }
  const chart = draw('svg',{viewBox:'0 0 760 265',role:'img','aria-label':'Yıllara göre birikimli gözlem sayısı. ' + last + ' itibarıyla ' + format(runningTotal) + ' gözlem.'});
  const left = 56, right = 733, top = 22, bottom = 228;
  const stepBase = Math.pow(10,Math.floor(Math.log10(Math.max(1,runningTotal / 5))));
  const step = stepBase * [1,2,5,10].find(n => n*stepBase >= runningTotal / 5);
  const max = Math.max(step,Math.ceil(runningTotal/step)*step);
  const x = index => left + index * (right-left) / Math.max(1,years.length-1);
  const y = value => bottom - (value / max) * (bottom-top);
  for (let value = 0; value <= max; value += step) {
    chart.append(draw('line',{x1:left,y1:y(value),x2:right,y2:y(value),class:'atlas-gridline'}),
      draw('text',{x:left-8,y:y(value)+4,'text-anchor':'end'},format(value)));
  }
  chart.append(draw('line',{x1:left,y1:top,x2:left,y2:bottom,class:'atlas-gridline'}));
  const points = years.map(({total},i) => x(i) + ',' + y(total));
  chart.append(draw('polygon',{points:[left+','+bottom,...points,x(years.length-1)+','+bottom].join(' '),class:'atlas-growth-area'}),
    draw('polyline',{points:points.join(' '),class:'atlas-growth-line'}));
  years.forEach(({year,added,total},i) => {
    const dot = draw('circle',{cx:x(i),cy:y(total),r:3.5,class:'atlas-growth-point'});
    dot.append(draw('title',{},year + ' · ' + format(total) + ' birikimli, ' + format(added) + ' yeni gözlem'));
    chart.append(dot,draw('text',{x:x(i),y:bottom+22,'text-anchor':'middle'},year));
  });
  byId('yearGrowth').replaceChildren(chart);
  byId('yearRows').replaceChildren(...years.map(({year,added,total}) => {
    const row = element('tr');
    const heading = element('th',year);
    heading.scope = 'row';
    row.append(heading,element('td',format(added)),element('td',format(total)));
    return row;
  }));
}

function renderDonut(id, total, label, items) {
  const donut = element('div',null,'event-donut');
  donut.setAttribute('role','img');
  donut.setAttribute('aria-label',format(total) + ' ' + label);
  let end = 0;
  const key = element('ul',null,'chart-key');
  const stops = [];
  for (const [name,value,color] of items) {
    if (!value) continue;
    const start = end;
    end += value;
    stops.push(color + ' ' + (start/total*100) + '% ' + (end/total*100) + '%');
    const swatch = element('i');
    swatch.style.backgroundColor = color;
    const item = element('li');
    item.append(swatch,element('span',name),element('b',format(value)));
    key.append(item);
  }
  donut.style.background = stops.length > 1 ? 'conic-gradient(' + stops.join(', ') + ')' : items.find(item => item[1])?.[2] || 'var(--border-light)';
  const center = element('div');
  center.append(element('strong',format(total)),element('span',label));
  donut.append(center);
  byId(id).replaceChildren(donut,key);
}

function initStats(records, campuses, campus, summary) {
  const groupColors = {
    Plantae:'#A8CC00', Fungi:'#FF128F', Insecta:'#FF6B00', Arachnida:'#FF9800',
    Mollusca:'#13BEE8', Aves:'#296BBF', Mammalia:'#7C398D', Reptilia:'#258675',
    Animalia:'#93613F', Chromista:'#51BDA3', Protozoa:'#5E519C', Unidentified:'#8D918F'
  };
  const metrics = [
    ['total','Gözlem sayısı'],['species','Tür sayısı'],['observers','Gözlemci sayısı'],
    ['research','Araştırma sınıfı'],['needsId','Tanılama gerekli']
  ];
  const rows = [{id:'',name:'Tüm kampüsler'},...campuses].map(({id,name}) => {
    const data = counts(inScope(records,id));
    const row = element('tr');
    const title = element('th',name);
    title.scope = 'row';
    row.append(title,...metrics.map(([key]) => element('td',format(data[key]))));
    return [id,row];
  });
  byId('campusRows').replaceChildren(...rows.map(([,row]) => row));
  function update() {
    const scoped = inScope(records,campus.value);
    const data = counts(scoped);
    const cards = metrics.slice(0,4).map(([key,label]) => {
      const metric = element('div',null,'metric');
      metric.append(element('strong',format(data[key])),element('span',label));
      return metric;
    });
    byId('statsMetrics').replaceChildren(...cards);
    byId('statsScope').textContent = scoped.length
      ? dateLabel(scoped[0].day) + ' – ' + dateLabel(scoped.at(-1).day)
      : 'Bu kapsamda kayıt yok.';
    renderGrowth(scoped,summary);
    renderDonut('atlasQualityChart',data.total,'gözlem',[
      ['Araştırma sınıfı',data.research,'#A8CC00'],
      ['Tanılama gerekli',data.needsId,'#FFEC8B'],
      ['Diğer',data.total-data.research-data.needsId,'#AAA']
    ]);
    const uniqueSpecies = new Map();
    for (const {taxon} of scoped) {
      if (taxon.species) uniqueSpecies.set(taxon.species,taxon.group);
    }
    const speciesGroups = tally(uniqueSpecies.values(),group => group);
    renderDonut('atlasGroupChart',data.species,'tür',speciesGroups
      .sort((a,b) => b[1]-a[1])
      .map(([group,value]) => [labels[group] || group,value,groupColors[group] || '#888']));
    const observers = tally(scoped,o => o.user).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'tr'));
    renderBars('observerBars',observers.slice(0,12));
    byId('moreObservers').hidden = observers.length <= 12;
    renderBars('otherObserverBars',observers.slice(12));
    renderBars('speciesBars',tally(scoped,o => o.taxon.species).sort((a,b) => b[1]-a[1]).slice(0,15));
    for (const [id,row] of rows) row.toggleAttribute('data-selected',campus.value === id);
  }
  campus.addEventListener('change',update);
  update();
}

function initLife(records, campus) {
  const research = records.filter(o => o.quality === 'research');
  const group = groupSelection(research);
  const search = byId('search');
  const cards = byId('taxonCards');
  const size = 24;
  const prev = byId('prevPage');
  const next = byId('nextPage');
  let page = 0;

  function card([taxon, sightings]) {
    const item = element('article',null,'atlas-taxon');
    const cover = sightings.find(o => o.image);
    if (cover) {
      const [id,extension] = cover.image.split('.');
      const image = element('img');
      image.src = 'https://inaturalist-open-data.s3.amazonaws.com/photos/' + id + '/medium.' + extension;
      image.alt = taxon.name;
      image.loading = 'lazy';
      image.addEventListener('error',() => image.remove());
      item.append(image);
    }
    const heading = element('h2');
    heading.append(element('i',taxon.name));
    item.append(heading);
    if (taxon.common) item.append(element('p',taxon.common));
    item.append(element('p',format(sightings.length) + ' araştırma sınıfı gözlem'));
    const details = element('details');
    details.append(element('summary','Gözlem kayıtlarını aç'));
    details.addEventListener('toggle',() => {
      if (!details.open || details.children.length > 1) return;
      const list = element('ul');
      for (const o of sightings) {
        const row = element('li');
        row.append(link(dateLabel(o.day) + ' · ' + o.user + ' ↗',observationUrl(o.id)));
        list.append(row);
      }
      details.append(list);
    });
    item.append(details);
    if (cover) {
      const credit = element('p',null,'photo-credit');
      credit.dataset.observationId = cover.id;
      credit.dataset.photoId = cover.image.split('.')[0];
      credit.append(link('Fotoğraf kaynağı',observationUrl(cover.id)));
      item.append(credit);
    }
    return item;
  }

  function update() {
    const term = search.value.trim().toLocaleLowerCase('tr');
    const filtered = inScope(research,campus.value).filter(o =>
      (!group.value || group.value === o.taxon.group) &&
      (!term || (o.taxon.name + ' ' + o.taxon.common).toLocaleLowerCase('tr').includes(term)));
    const grouped = new Map();
    for (const o of filtered) {
      const key = o.taxon.id || o.taxon.name;
      if (!grouped.has(key)) grouped.set(key,[o.taxon,[]]);
      grouped.get(key)[1].push(o);
    }
    const taxa = [...grouped.values()].sort((a,b) => a[0].name.localeCompare(b[0].name,'tr'));
    const pages = Math.ceil(taxa.length/size);
    byId('lifeStatus').textContent = taxa.length
      ? format(filtered.length) + ' araştırma sınıfı gözlem · ' + format(taxa.length) + ' takson'
      : 'Bu filtrelerle eşleşen araştırma sınıfı gözlem bulunamadı.';
    cards.replaceChildren(...taxa.slice(page*size,(page+1)*size).map(card));
    byId('pageLabel').textContent = pages ? (page+1) + ' / ' + pages : '0 / 0';
    prev.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    window.BaharPhotoCredits?.sync();
  }
  for (const [control,event] of [[campus,'change'],[group,'change'],[search,'input']]) {
    control.addEventListener(event,() => { page = 0; update(); });
  }
  prev.addEventListener('click',() => { page--; update(); cards.scrollIntoView({block:'start'}); });
  next.addEventListener('click',() => { page++; update(); cards.scrollIntoView({block:'start'}); });
  update();
}

async function main() {
  const page = document.body.dataset.atlas;
  const [catalog, summary, boundaries] = await Promise.all([
    read('catalog.json'),read('summary.json'),read('boundaries.geojson')
  ]);
  const parts = await Promise.all(catalog.chunks.map(read));
  const taxa = catalog.taxa.map(([id,name,common,group,species]) => ({id,name,common,group,species}));
  const records = parts.flat().map(([id,date,user,taxon,quality,lat,lon,campus,status,image]) =>
    ({id,date,day:day(date),user:catalog.users[user],taxon:taxa[taxon],quality,lat,lon,campus,status,image}));
  if (records.length !== summary.total) throw new Error('Eksik gözlem verisi');
  const campuses = boundaries.features.map(feature => feature.properties);
  const campus = campusSelection(campuses);
  byId('atlasContent').hidden = false;
  if (page === 'map') initMap(records,boundaries,campuses,campus,summary);
  if (page === 'stats') initStats(records,campuses,campus,summary);
  if (page === 'life') initLife(records,campus);
  byId('atlasMessage').hidden = true;
}

main().catch(error => {
  console.error(error);
  byId('atlasContent').hidden = true;
  byId('atlasMessage').textContent = 'Kampüs verileri yüklenemedi. Sayfayı yenileyip tekrar deneyin.';
});
