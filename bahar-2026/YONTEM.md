# Boğaziçi Tür Say Bahar 2026, harita verisi

Kaynaklar: `observations-810391.csv`, `bogazici guney kamp(1).kml`, `kilyos kampüs.kml`.

CSV SHA256: `f1f6d7dc763d04961ddc74b6727cac12f6a43d638a3200a015aa92f8603ea165`

Bu paket, önceki sohbetin geçici `/workspace/scratch/...` analiz dosyalarına erişilemediği için, *aynı* sonuçların bayt düzeyinde kopyası değildir. Başka bir çalışmada bildirilen GPS 1.843 / tahmini 462 / gizli 73 ayrımı ile karıştırılmamalıdır.

Bu çalışmada 1866 GPS adayı, 461 yaklaşık, 51 gizli bulunmaktadır. 2327 kayıt haritada gösterilir. 25 gizlenmiş iNaturalist koordinatı tahmin edilmedi.

**GPS adayı tanımı:** KML sınırı içinde, tekrarlanmayan (aynı kullanıcı/gün/koordinatta en çok 3) ve bildirilen konum belirsizliği 80 m veya altında olan nokta; CSV'de `positioning_method=gps` bulunanlarda en fazla 150 m ve en çok 5 tekrar. EXIF üzerinden doğrulama yapılmadı.

**Tahmini konum:** KML içindeki özgün konumlar kendi kampüsüne atanır. KML dışındaki noktalar için aynı gözlemcinin iki kampüste yakın zamanlı güvenilir kayıtları karşılaştırılır; belirgin bir yakınlık bulunmazsa 23 Mayıs için Güney, 24 Mayıs için Kilyos başlangıç varsayımıyla değerlendirilir. Önce aynı gözlemcinin 18 dakika içindeki güvenilir gözlemleri ve mümkünse iki nokta arası zaman interpolasyonu, bunlar yoksa başka gözlemcilerin 12 dakika içindeki yerel kümelenmiş gözlemleri kullanılır. Yakın zamandaki farklı güzergâhlar karıştırılmamak üzere 240 m uzamsal küme uygulanır. Her tahminin referans ID'leri denetim tablosunda vardır. Gerçek GPS gibi sunulmamalıdır.

**Gizlenenler:** Koordinatı iNaturalist tarafından gizlenmiş 25 kayıt ve güvenilir referansı olmayan diğer kayıtlar. Orijinal koordinatlar kaynak CSV'de tutulur ancak harita JSON'unda gizlenmiş 25 kaydın `lat`/`lon` alanları boştur. `original_lat`/`original_lon` alanları gizlenmiş kayıtların kaynaktaki (bulanıklaştırılmış) değerlerini içerir.

**Sınırlar:** KML içindeki kaynak koordinatlar ilgili poligona atanır, çünkü farklı günlerde her iki kampüste de kayıt bulunabilir. KML dışındaki kayıtlarda günün etkinlik kampüsü varsayılır. Yakın saatli referanslar aynı gözlemci ya da grup tarafından desteklenir. Kestirimler ilgili KML poligonu içinde tutulur. Tarih ve konum çelişkileri ortadan kaldırılmaz; denetim CSV'sinde incelenebilir.

**Kaynak:** Siteye yalnızca görselleştirme verisi yüklenir; asıl CSV ve KML dosyaları değişmez. `source-audit.csv` her gözlemin kaynaktan yeni konuma dönüşümünü belgeler.
## Tür/takson sayımı

iNaturalist proje sayfasında 7 Kasım 2026 tarihinde 536 **Tür** gösterilmiştir. iNaturalist bu toplam için *leaf count* yöntemini kullanır: tür altı taksonlar üst türe indirgenir, mevcut daha alt taksonların üst atası olan taksonlar ikinci kez sayılmaz ve cins gibi türün üstündeki bazı tanımlar da yaprak takson olabilir. Bu sayı yalnızca CSV'deki tür düzeyindeki teşhisleri ifade etmez.

Kaynak CSV'nin `taxon_species_name` sütununda 403 farklı tür adı vardır; 1.348 gözlemde bu sütun dolu, 1.030 gözlemde boş bırakılmıştır. CSV'de 847 farklı `taxon_id` mevcuttur; bunların hepsi ayrı tür değildir. Projenin 536 sayısı proje ekranından alınmış sabit bir anlık değerdir, CSV'den bağımsız olarak tam taksonomi ağacı çözülüp yeniden hesaplanmış değildir. İstatistiklerdeki canlı grubu tür dağılımları, gözlemci başına tür sayıları ve birikim eğrileri 403 türlük CSV ölçüsünü kullanır. Daha sonra projede teşhisler değişirse proje sayısı da değişebilir.
