# Boğaziçi Tür Say Güz 2026 güncellemesi

## Görünüm düzeltmesi, üçüncü sürüm

Proje bağlantısı üç etkinlik sayfasında da başlık kutusunun sağındadır. Gözlemci, canlı grubu ve harita zemini seçimleri Filtreler dışında her zaman görünür. Noktalar, tahmin üçgenleri ve rota çizgileri Bolu renkleriyle eşleştirildi.

Önceki paketi yüklediyseniz bu ZIP’ten yalnızca `guz-2026` klasörünü deponun ana dizinine sürükleyip yükleyin. Önceden dosya silmeyin. Ana index, menü, Bolu ve renk dosyalarını yeniden yüklemeniz gerekmez.

Bolu’nun ortak teması kullanılır. Konum filtresi üç seçeneklidir: GPS + tahminler, GPS adayları, tahmini konumlar. Harita zeminleri uydu ve OpenStreetMap’tir. Isı ayarları ve zaman çubuğu klasik kare tutamaçlıdır. Harita altındaki açıklamalar ve konum grafiği kaldırıldı. Konum verilerinde değişiklik yapılmadı.

## İlk kez yükleme

ZIP’i bilgisayarda ayıklayın. GitHub deposunun ana dizininde Add file → Upload files açın. Paketin içindeki `guz-2026`, `partials`, `js` klasörlerini ve `index.html` dosyasını birlikte sürükleyin. ZIP dosyasını veya dış paket klasörünü yüklemeyin. Commit changes ile kaydedin.

Yeni etkinlik `/guz-2026/` adresinde açılır. Ana sayfa kartı ve Geçmiş türsaylar menüsü hazırdır. İstatistikler `guz-2026/istatistikler.html`, sonraya bırakılan canlılar bölümü `guz-2026/canlilar.html` dosyasındadır.

## Korunan mevcut dosyalar

Bolu sayfaları, fotoğraflar, renk dosyaları ve mevcut istatistikler bu pakette değiştirilmez. Ana index, partials/header.html ve js/common.js dosyaları, 5 Kasım 2026 tarihinde yayımlanmış mevcut sürümünüz esas alınarak yeni etkinlikle genişletildi. Bu üç dosyada daha sonra ayrıca değişiklik yaptıysanız önce GitHub’daki sürümlerini indirin. GitHub geçmişinden eski sürümler geri alınabilir.

## İleride ne nereden düzenlenir?

- Yeni etkinlik başlıkları ve metinleri: guz-2026 içindeki üç HTML.
- Yeni etkinlik görünümü: guz-2026/css/event.css.
- Harita: guz-2026/js/map.js.
- İstatistik sunumu: guz-2026/js/stats.js.
- Gözlem verileri: guz-2026/data/observations.json.
- İstatistikler: guz-2026/data/statistics.json.
- Uydu zemini ve harita ayarları: guz-2026/data/config.json.
- Özgün CSV: guz-2026/data/kaynak.csv.
- Tüm konum kararları: guz-2026/data/konum_denetimi.csv.
- GPS adayları, tahminler, belirsizler ayrı CSV dosyalarıdır.

## Konum denetimi

1.045 kayıt = 656 GPS adayı + 191 tahmin + 198 belirsiz. GPS adaylarının 37’sinde positioning_method=gps; 619’u hareket ve en fazla 50 m belirsizlik bilgisine dayalı adaydır. GPS kaynağı, fotoğraf EXIF dosyalarından kesin olarak doğrulanmadı.

253 gözlemi üç koordinata yığılmış kocoleoptera hesabında 182 konum tahmin edildi; 71’i belirsiz bırakıldı. defne77130 için sekiz, talha1001 için bir tahmin üretildi. Tahminlerin 190’ı diğer gözlemcilerin zaman eşleşen baskın kümesinden, biri aynı gözlemcinin iki kaydı arasından üretildi. Aynı yerde kısa sürede tekrarlanan kayıtlar otomatik olarak hatalı sayılmadı. Dalgiczurafa’nın Bolu’daki saat sorunu bu ayrı etkinliğe aktarılmadı.

Başlangıç haritası 847 GPS adayı/tahmin içerir. Belirsiz kayıtlar filtreyle ayrıca görüntülenebilir. Değiştirilmemiş kaynak koordinatları denetim CSV’lerinde korunur. iNaturalist üzerinde hiçbir kayıt değiştirilmedi. Tahminler gerçek çekim noktasının doğrulaması veya yeni GPS ölçümü değildir. İstatistikler konum süzmesinden etkilenmez ve tüm 1.045 kaydı kapsar.

Küme tahminleri ±5 dakika içinde her gözlemciden bir konum alır; en az dört gözlemci ve %60 baskın küme gerekir. Birden fazla belirgin grup varsa tahmin yapılmaz. Kendi kayıtları arasında enterpolasyon en fazla 15 dakikalık aralıkta yapılır. Ayrıntılı kurallar ve yeniden üretim scripti `guz-2026/data/konum_analizi.py` dosyasındadır. Aynı klasördeki kaynak.csv ile `python konum_analizi.py` komutu çalışır; sonuçları analysis klasörüne yazar. Kaynak koordinatlar hiçbir zaman üstüne yazılmaz.

İç kontrolde 493 GPS adayının kendi gözlemcisi referanslardan dışarıda bırakıldı. Ortanca konum farkı 17 m, %90 eşiği 94 m, %95 eşiği 219 m. Bu bağımsız saha doğrulaması değildir. Tahmin çevreleri istatistiksel güven aralığı değildir.

Uydu zemini yerel JPEG olarak paketlenmiştir ve harita zemini için internet gerektirmez. Alternatif OpenStreetMap ve açık harita internet ister. CSV fotoğrafları ve iNaturalist bağlantıları internet ister. Harita, sunucu üzerinden açılmalıdır; dosyaya çift tıklamak JSON yüklemesini engelleyebilir. Yerel deneme için site kökünde python -m http.server 8000 çalıştırın, ardından http://localhost:8000/guz-2026/ açın.

Uydu: Esri World Imagery; Esri, Vantor, Earthstar Geographics ve GIS User Community. OpenStreetMap: © OpenStreetMap contributors. Açık harita: © CARTO ve OpenStreetMap contributors. Gözlem verileri: kullanıcı tarafından sağlanan iNaturalist dışa aktarımı; kayıt ve görsel lisansları kaynak CSV’de korunur.
