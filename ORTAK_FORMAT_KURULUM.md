# Bolu ve Güz ortak biçim güncellemesi

Bu paket, mevcut deponuzun üstüne yüklenecek güncellemedir. ZIP’i ayıklayın. İçindeki `bolu-2026`, `guz-2026`, `css`, `js`, `data`, `partials` klasörleriyle `index.html` dosyasını GitHub deposunun ana dizinindeki Add file → Upload files alanına birlikte sürükleyin. Commit changes ile kaydedin. Önceden dosya veya klasör silmeyin. ZIP’in kendisini veya dış paket klasörünü yüklemeyin.

## Ortak düzenleme noktaları

- `css/events.css`: iki etkinliğin ortak arayüzü, düğmeler, kaydırma çubukları ve istatistik görünümü.
- `js/event-map.js`: iki etkinliğin ortak harita, filtre ve animasyon kodu.
- `js/event-stats.js`: iki etkinliğin ortak istatistik ve grafik kodu.
- `partials/bolu-2026-hero.html`: Bolu kapağı, başlığı, proje bağlantısı.
- `partials/guz-2026-hero.html`: Güz başlığı ve proje bağlantısı.
- Her etkinliğin üç HTML dosyası: o sayfanın metni, bölümleri ve veri dosyası yolları.
- `data/bolu-2026/statistics.json`: Bolu istatistikleri.
- `data/bolu-2026/observations.json`: Bolu’nun aynı konum ve saatleri korunmuş, tür ve kalite bilgileri eklenmiş harita kayıtları.
- `data/bolu-2026/map-config.json`: Bolu zemini, zaman aralığı ve varsayılan ısı ayarları.
- `guz-2026/data/`: Güz’e ait mevcut veri dosyaları. Gözlem ve istatistik sayıları değiştirilmedi.

Eski `js/bolu-map.js`, `js/stats.js`, `guz-2026/js/map.js`, `guz-2026/js/stats.js` ve `guz-2026/css/event.css` dosyaları bu sayfalarda artık çağrılmıyor. GitHub’da kalmaları bir sorun oluşturmaz; sonraki düzenlemeleri yukarıdaki ortak dosyalardan yapın.

## Bolu hesapları

2.792 gözlem, 370 tür, 701 farklı takson, 25 gözlemci ve 600 araştırma sınıfı kayıt. Tür sayısı, tür düzeyinde tanımlanan farklı tür adlarını sayar; cins, familya ve üst düzey tanımlamalar eklenmez. Alt türler kendi türlerinin altında birleştirilir.

ZIP’teki eski harita ve istatistik JSON dosyaları tam taksonomik alanları içermediği için, daha önce sağladığınız `observations-808138.csv` dışa aktarımı kullanıldı. Bu CSV’nin bütün 2648 harita kaydı kimlik üzerinden eşleşti; eski istatistiklerdeki 2.792 gözlem, 25 gözlemci ve 600 araştırma sınıfı kayıt toplamları da doğrulandı. Yeni bir gözlem indirmesi yapılmadı.

701 takson kimliğinin düzeyi iNaturalist API’den doğrulandı. 370’i tür, 176’sı cins ve kalanları diğer düzeylerdedir. Tek alt tür kaydı ayrıca yeni bir tür olarak sayılmadı. Eski 701 sayısı tür sayısı değildi. Ana sayfadaki önceki 468 tür değeri de bu veri kapsamı için 370 olarak düzeltildi. Takson eşleştirmeleri `data/bolu-2026/taxonomy.json`, kaynak CSV `data/bolu-2026/kaynak.csv` dosyasında korunur. Taksonomi denetimi: 5 Kasım 2026. Kaynak: https://api.inaturalist.org/v1/docs/ ve /v1/taxa/{id}.

Haritadaki 2648 kaydın enlem, boylam, saat, tahmin durumu ve belirsizlik değerleri aynen korundu. Harita dışında kalan 144 kayıt istatistik toplamlarına dahildir. dalgiczurafa ve zbaharat için önceden kullanılmayan saatler yeniden animasyona alınmadı. Saat grafikleri kullanılabilir 2.640 kayıt üzerinden hesaplandı; bu yüzden saat eğrisinin son değeri bütün kayıtların toplamından farklı olabilir.

Bolu’daki araştırma sınıfı canlılar arşivi 606 kayıt içeren ayrı bir dışa aktarımdan oluşturulmuştu; bu içerik ve fotoğrafları değiştirilmedi. Eski istatistik CSV’si 600 araştırma sınıfı kayıt içerir. Yeni bir CSV verilmediği için iki farklı dışa aktarımın tarih farkı sessizce birleştirilmedi.

## Korunan içerik

Göl kapağı, bütün fotoğraf dosyaları, fotoğrafçı kredileri, galeri dizilişi, canlı rehberi ve kaynakları, Instagram bağlantıları, ortak renkler ve logolar korunmuştur. Kaynak iNaturalist kayıtları değiştirilmedi. Kapak ve galeri için hiçbir fotoğraf küçültülmedi veya yeniden sıkıştırılmadı.
