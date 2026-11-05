import csv, json, math, statistics, collections, datetime, pathlib

ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=ROOT/'kaynak.csv' if (ROOT/'kaynak.csv').exists() else ROOT.parents[1]/'upload/observations-809258.csv'
OUT=ROOT/'analysis'; OUT.mkdir(exist_ok=True)
raw=list(csv.DictReader(SOURCE.open(encoding='utf-8-sig')))
def distance(a,b):
    return math.hypot((a[0]-b[0])*111195,(a[1]-b[1])*83800)
def quantile(a,q):
    s=sorted(a); return s[min(len(s)-1,math.ceil(q*len(s))-1)] if s else 0
rows=[]
for x in raw:
    dt=datetime.datetime.strptime(x['time_observed_at'],'%Y-%m-%d %H:%M:%S %z') if x['time_observed_at'] else None
    local=dt.astimezone(datetime.timezone(datetime.timedelta(hours=3))) if dt else None
    rows.append(dict(id=x['id'],user=x['user_login'],name=x['scientific_name'] or 'Tanımlanmamış',common=x['common_name'],group=x['iconic_taxon_name'] or 'Unidentified',quality=x['quality_grade'],species=x['taxon_species_name'],taxon=x['taxon_id'],lat=float(x['latitude']) if x['latitude'] else None,lon=float(x['longitude']) if x['longitude'] else None,t=(local.hour*60+local.minute+local.second/60) if local else None,time=local.isoformat() if local else None,acc=float(x['positional_accuracy']) if x['positional_accuracy'] else None,explicit=x['positioning_method']=='gps',image=x['image_url'],url=x['url']))
users=collections.defaultdict(list)
for d in rows: users[d['user']].append(d)
suspects={}; static=[]
for user,items in users.items():
    coords=collections.Counter((d['lat'],d['lon']) for d in items)
    if len(items)>=20 and len(coords)<=3 and coords.most_common(1)[0][1]/len(items)>=.5:
        static.append(user)
        for d in items:suspects[d['id']]='Çok sayıda kayıt yalnızca birkaç koordinata yığılmış; hareket bilgisi yok.'
    for coord,count in coords.items():
        same=[d for d in items if (d['lat'],d['lon'])==coord and d['t'] is not None]
        if count>=3 and same and max(d['t'] for d in same)-min(d['t'] for d in same)>45:
            for d in same:suspects[d['id']]='Aynı koordinat 45 dakikadan uzun bir zaman aralığında tekrar kullanılmış.'
    timed=sorted((d for d in items if d['t'] is not None),key=lambda d:d['t'])
    for i in range(1,len(timed)-1):
        a,b,c=timed[i-1:i+2]; p=(a['lat'],a['lon']);q=(b['lat'],b['lon']);r=(c['lat'],c['lon'])
        left=(b['t']-a['t'])*60;right=(c['t']-b['t'])*60
        if 0<left<=600 and 0<right<=600 and distance(p,r)<180 and distance(p,q)>250 and distance(q,r)>250 and distance(p,q)/left>3 and distance(q,r)/right>3:
            suspects[b['id']]='Yakın zamanlı iki kayıt arasında tekil konum sıçraması; olası GPS hatası.'
for d in rows:
    d['original_lat']=d['lat'];d['original_lon']=d['lon'];d['radius']=d['acc'];d['method']='';d['reason']='';d['anchors']=[];d['anchor_users']=[]
    if d['lat'] is None or d['lon'] is None:
        d['status']='unlocated'; d['reason']='Koordinat eksik.'
    elif d['id'] in suspects:
        d['status']='uncertain';d['reason']=suspects[d['id']]
    elif d['acc'] is not None and d['acc']>50:
        d['status']='uncertain';d['reason']='Bildirilen konum belirsizliği 50 metreden büyük; koordinat değiştirilmedi.'
    elif d['explicit']:
        d['status']='gps_explicit';d['reason']='CSV positioning_method alanı gps; sorunlu tekrar/sıçrama işareti yok.';d['radius']=d['acc'] or 30
    elif d['acc'] is not None and len({(z['lat'],z['lon']) for z in users[d['user']]})>=2:
        d['status']='gps_likely';d['reason']='Hareket eden koordinatlar ve en fazla 50 m bildirilen belirsizlik; GPS adayı, ham EXIF doğrulanmadı.';d['radius']=d['acc']
    else:
        d['status']='uncertain';d['reason']='GPS kökenini destekleyen yeterli doğruluk/cihaz verisi yok; koordinat değiştirilmedi.'
anchors=[d for d in rows if d['status'] in ('gps_explicit','gps_likely') and d['t'] is not None]

def consensus(d):
    # Her gözlemciden tek oy: en yakın zamanlı güvenilir konum. +/- 5 dakika.
    byuser={}
    for a in anchors:
        delta=abs(a['t']-d['t'])
        if a['user']==d['user'] or delta>5:continue
        if a['user'] not in byuser or delta<byuser[a['user']][0]:byuser[a['user']]=(delta,a)
    candidates=[a for _,a in byuser.values()]
    if len(candidates)<4:return None
    clusters=[[b for b in candidates if distance((a['lat'],a['lon']),(b['lat'],b['lon']))<=80] for a in candidates]
    clusters.sort(key=len,reverse=True);cluster=clusters[0]
    if len(cluster)<4 or len(cluster)/len(candidates)<.6:return None
    center=(statistics.median(a['lat'] for a in cluster),statistics.median(a['lon'] for a in cluster))
    # İkinci büyük, ayrı küme varsa farklı yürüyüş grupları olasılığı yüksek.
    others=[a for a in candidates if distance(center,(a['lat'],a['lon']))>160]
    if len(others)>=3:return None
    radius=max(70,quantile([distance(center,(a['lat'],a['lon'])) for a in cluster],.9)+40)
    if radius>130:return None
    return center,radius,cluster,len(candidates)

for d in rows:
    # Belirsiz fakat bildirilmiş koordinatları rastgele taşımak yerine sadece
    # güçlü tekrar/sıçrama işareti bulunan kayıtlar için tahmin üret.
    if d['id'] not in suspects or d['t'] is None:continue
    own=sorted([a for a in anchors if a['user']==d['user']],key=lambda a:a['t'])
    before=[a for a in own if a['t']<=d['t']];after=[a for a in own if a['t']>=d['t']]
    result=None
    if before and after:
        a,b=before[-1],after[0];gap=b['t']-a['t'];dist=distance((a['lat'],a['lon']),(b['lat'],b['lon']))
        if 0<gap<=15 and dist<=400 and dist/(gap*60)<=1.5:
            w=(d['t']-a['t'])/gap;center=(a['lat']+(b['lat']-a['lat'])*w,a['lon']+(b['lon']-a['lon'])*w)
            result=(center,max(50,dist/2+max(a['radius'],b['radius'])),[a,b],'own_interpolation')
    if result:
        center,radius,selected,method=result
    else:
        c=consensus(d)
        if not c:continue
        center,radius,selected,n=c;radius=max(100,radius);method='group_consensus'
    d['lat'],d['lon']=center;d['radius']=round(radius);d['status']='estimated';d['method']=method
    d['anchors']=[a['id'] for a in selected];d['anchor_users']=sorted({a['user'] for a in selected})
    d['reason']+=' '+('Kendi güvenilir kayıtları arasında zaman enterpolasyonu.' if method=='own_interpolation' else '±5 dakika içinde en az 4 bağımsız gözlemcinin baskın konum kümesiyle yaklaşık konum.')

counts=collections.Counter(d['status'] for d in rows)
summary={'observations':len(rows),'observers':len(users),'species':len({d['species'] for d in rows if d['species']}),'taxa':len({d['taxon'] for d in rows if d['taxon']}),'quality':dict(collections.Counter(d['quality'] for d in rows)),'location':dict(counts),'static_users':static,'date':'2026-09-27','time_zone':'Europe/Istanbul','source':'observations-809258.csv','original_gps_verified':False}
(OUT/'observations.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
fields=list(raw[0])+['location_status','display_latitude','display_longitude','estimated_uncertainty_m','correction_method','location_reason','anchor_observation_ids','anchor_observers']
def write_csv(path,subset):
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
        for x,d in zip(raw,rows):
            if not subset(d):continue
            writer.writerow(dict(x,location_status=d['status'],display_latitude=d['lat'],display_longitude=d['lon'],estimated_uncertainty_m=d['radius'],correction_method=d['method'],location_reason=d['reason'],anchor_observation_ids=';'.join(d['anchors']),anchor_observers=';'.join(d['anchor_users'])))
write_csv(OUT/'konum_denetimi.csv',lambda d:True)
write_csv(OUT/'gps_adayi_gozlemler.csv',lambda d:d['status'] in ('gps_explicit','gps_likely'))
write_csv(OUT/'tahmini_konumlar.csv',lambda d:d['status']=='estimated')
write_csv(OUT/'belirsiz_konumlar.csv',lambda d:d['status'] in ('uncertain','unlocated'))
observer_summary=[]
for user,items in users.items():
    observer_summary.append(dict(user=user,observations=len(items),species=len({d['species'] for d in items if d['species']}),taxa=len({d['taxon'] for d in items if d['taxon']}),research=sum(d['quality']=='research' for d in items),location=dict(collections.Counter(d['status'] for d in items))))
(OUT/'observers.json').write_text(json.dumps(sorted(observer_summary,key=lambda d:-d['observations']),ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('ESTIMATES',collections.Counter((d['user'],d['method']) for d in rows if d['status']=='estimated'))
print('FLAGGED',len(suspects),'UNCHANGED SUSPECTS',sum(d['id'] in suspects and d['status']=='uncertain' for d in rows))
