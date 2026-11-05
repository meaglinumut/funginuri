# Güz 2026: KML sınırı ve çevrimdışı harita güncellemesi

## GitHub'a yükleme

1. ZIP'i bilgisayarınızda açın.
2. GitHub'da sitenizin deposunun ana dizinine girin. Burası `index.html`, `css`, `js`, `guz-2026` klasörlerinin bulunduğu yer.
3. **Add file > Upload files** seçin.
4. ZIP'in içindeki klasörleri ve dosyaları birlikte yükleme alanına sürükleyin. ZIP'i veya ZIP'in açıldığı üst klasörü yüklemeyin. Klasörlerin içindeki dosyalar da aktarılmalı.
5. **Commit changes** ile kaydedin. Eski dosyaları önceden silmeyin; aynı yoldaki dosyalar güncellenir.
6. GitHub Pages yayını tamamlanınca `/guz-2026/` sayfasını açın. Gerekirse `Ctrl + Shift + R` kullanın.

Bu paket önceki Bolu/Güz ortak biçim güncellemesinin üzerine uygulanır. Güz sayfasının ihtiyaç duyduğu ortak CSS ve başlık parçası da pakete eklenmiştir. Bolu fotoğrafları ve verileri pakette değiştirilmez.

## Konumlarda yapılan değişiklik

Kampüse girmeden önce metro çıkışında kaydedildiği kullanıcı tarafından belirtilen **13 gözlem**, saat eşiğine veya KML sınırına takılmayacak şekilde kayıt kimlikleriyle korundu. Bu kayıtların kaynak CSV koordinatları aynen geri getirildi. CSV bu kayıtların saatlerini 10.05–10.27 olarak verdiğinden, saat farkı hakkında varsayım yapılarak kayıtlar dışlanmadı. Kaynak saatler değiştirilmedi.

Başlangıçta KML dışında bulunan **53** kaydın **13** tanesi metro buluşma noktası istisnası olarak özgün yerinde korundu. **29** kayda zaman desteğiyle sınır içinde yaklaşık konum üretildi. Sınır dışında olup yeterli destek bulunmayan **11** kayıt haritada gösterilmiyor. Ayrıca, uzun süre aynı koordinata atanmış kayıtlar da yeniden değerlendirildi. Desteksiz sabit konumlar dahil toplam **53** kayıt açıkça harita dışında bırakıldı. Hiçbir gözlem kaynak CSV'den veya genel istatistiklerden silinmedi.

Başlangıç haritasında **893** kayıt gösterilir: **645 GPS adayı + 243 tahmini konum + özgün konumu korunan diğer 5 metro kaydı**. Metro kayıtlarının tamamı, özgün konumlarıyla 13 kayıttır; bunların 8'i zaten GPS adayı sınıfındadır. GPS olarak sınıflandırılmamış diğer 5 kayıt da kullanıcının açık konum doğrulamasıyla haritaya alınmıştır. Mevcut konum filtresinin kapsamı dışında kalan diğer 99 belirsiz kayıt da korunmuştur. Genel toplamlar **1.045 gözlem, 255 tür, 27 gözlemci ve 347 araştırma sınıfı kayıt** olarak kalır.

İlk sınır kontrolündeki 26 düzeltmenin 16'sı aynı gözlemcinin en fazla 15 dakika aralıklı iki sınır içi GPS adayının arasında hesaplandı. Birinde aynı gözlemcinin en fazla iki dakika uzaktaki sınır içi kaydı kullanıldı. Diğer 9'unda ±5 dakika içindeki en az dört farklı gözlemcinin baskın konum kümesi kullanıldı.

Sabit veya yetersiz konumlu gözlemciler için ikinci bir geçiş yapıldı. Önce meaglinumut'un en fazla 15 dakika aralıklı iki sınır içi GPS adayı arasında hesaplama yapıldı; uygun çift yoksa en fazla üç dakika uzaktaki GPS adayı kullanıldı. Bu referans bulunamadığında ±5 dakika içinde en az üç farklı gözlemcinin baskın konum kümesi kullanıldı. Referans gözlemcilerin aynı grupta yürüdüğü varsayılır; kişiler arasındaki gerçek mesafe bilinmez. Bu nedenle bu konumlara en az 100 m yaklaşık belirsizlik atandı. İçbükey sınırdan dışarı çıkan doğrusal ara noktalar kabul edilmedi. Noktalar sınır çizgisine yapıştırılmadı.

| Gözlemci / yeniden değerlendirilen kayıtlar | Tahmin üretildi | Zaman desteği bulunamadı |
| --- | ---: | ---: |
| kocoleoptera, 253 kayıt | 205 | 48 |
| defne77130, 9 sabit koordinatlı kayıt | 9 | 0 |
| periferik, 2 sınır dışı kayıt | 2 | 0 |
| zeynepakten, 1 sınır dışı kayıt | 0 | 1 |

Bu ikinci geçişteki 216 yaklaşık konumun 80'i meaglinumut'un iki kaydı arasında, 89'u yakın saatli tek kaydında, 47'si grubun baskın konum kümesinde hesaplandı. Daha önce yaklaşık konum verilen kayıtlar da bu sayılara dahildir.

GPS adayı etiketi ham fotoğraf EXIF verisiyle doğrulanmış özgün kamera GPS'i anlamına gelmez. Yaklaşık konumlar gerçek çekim noktaları olarak kabul edilmemelidir.

## Veri dosyaları

| Dosya | İçerik |
| --- | --- |
| `guz-2026/data/observations.json` | Sitenin kullandığı 1.045 kayıt; harita görünürlüğü ve düzeltme bilgileri |
| `guz-2026/data/konum_denetimi.csv` | Kaynak sütunları, önceki ve yeni gösterim konumları, yöntem ve referans gözlem kimlikleri |
| `guz-2026/data/gps_adayi_gozlemler.csv` | Haritada kullanılabilir 645 GPS adayı |
| `guz-2026/data/tahmini_konumlar.csv` | Haritada kullanılabilir 243 tahmini konum |
| `guz-2026/data/belirsiz_konumlar.csv` | Önceki analizde belirsiz sınıfında olan 104 kayıt; metro istisnasıyla 5'i haritada gösterilir |
| `guz-2026/data/harita_disinda.csv` | Yetersiz zaman/konum desteği nedeniyle haritada gösterilmeyen 53 kayıt |
| `guz-2026/data/sabit_konum_duzeltmeleri.csv` | İkinci geçişte değerlendirilen 265 kaydın önceki ve yeni konumları |
| `guz-2026/data/metro_korunan_gozlemler.csv` | Özgün koordinatları korunan 13 metro çıkışı gözlemi |
| `guz-2026/data/campus-boundary.kml` | Verdiğiniz özgün KML dosyası |
| `guz-2026/data/campus-boundary.geojson` | Haritada ince kesikli çizgiyle gösterilen sınır |
| `guz-2026/data/boundary-summary.json` | Bu güncellemenin sayısal özeti |
| `guz-2026/assets/campus-satellite-kml.jpg` | KML ve yakın çevresini kapsayan yeni çevrimdışı uydu görseli |

Kaynak CSV ve iNaturalist kayıtları değiştirilmedi. Son metro düzeltmesinde uydu görseli ve harita sınırları değiştirilmedi; mevcut görsel metro kayıtlarının tamamını kapsar. Uydu görseli ilk geniş alanın yaklaşık %58'ini kapsar. Kuzey ve güneyde KML sınırına yaklaşık 60 m pay bırakıldı; yatay haritada çevreyi görebilmek için doğu ve batı payı daha geniştir. Görselin sınırları `config.json` içinde saklanır. Uydu katmanı internetten karo çağırmaz; dosyalar bilgisayarda bir yerel sunucuyla açıldığında da çalışır. OpenStreetMap seçeneği internet gerektirir.

Eski `validation.json` dosyası ilk konum analizine aittir; bu yeni sınır düzeltmelerinin doğruluk testi değildir. Eski `konum_analizi.py` yeniden çalıştırılırsa KML kısıtı ayrıca yeniden uygulanmalıdır.
