# BounMantar: ayrı sayfalar ve düzenlenebilir veriler

Bu paket, son BounMantar retro site paketinin dosya düzeni yeniden kurulmuş sürümüdür. Tasarım ve içerik korunmuştur. Harita, istatistikler ve canlı rehberi artık kendi adreslerinde açılır. Sayfaların içine gömülü iframe veya büyük veri blokları yoktur.

## GitHub’a ilk yükleme

1. ZIP’i bilgisayarda açın.
2. Paketin içindeki **bütün dosya ve klasörleri**, GitHub deposunda mevcut index.html dosyasının bulunduğu düzeye yükleyin. ZIP dosyasını yüklemeyin; GitHub ZIP’i açmaz.
3. Ana dizinde index.html ile birlikte bolu-2026, kampus, css, js, data, partials, assets, vendor ve pages klasörleri bulunmalı. Dosya adlarını ve klasör yapısını koruyun.
4. Mevcut index.html dosyasının üzerine yazıp değişiklikleri kaydedin. GitHub Pages’in mevcut yayın ayarını kullanabilirsiniz.
5. Sonraki değişikliklerde yalnızca düzenlediğiniz dosyayı, aynı klasördeki dosyanın üzerine yüklemek yeterlidir.

**Bu sürümde yalnızca index.html yüklemek yeterli değildir. İlk kurulumda klasörlerin tamamını yükleyin.**

## Hangi dosyayı düzenleyeceğim?

| Değiştirmek istediğiniz | Dosya |
| --- | --- |
| Ana sayfa yazıları | index.html |
| Bolu haritasının sayfa düzeni ve filtre kutuları | bolu-2026/index.html |
| İstatistik sayfasının başlıkları ve açıklamaları | bolu-2026/istatistikler.html |
| Araştırma sınıfı açıklaması ve canlı tablosunun düzeni | bolu-2026/canlilar.html |
| Kampüs sayfası | kampus/index.html |
| Ortak üst menü, topluluk adı ve üst logo | partials/header.html |
| Ortak alt bilgi, Instagram bağlantıları ve alt logolar | partials/footer.html |
| Bolu başlığı, etkinlik tarihi ve proje bağlantısı | partials/bolu-2026-hero.html |
| Genel renkler ve yazı tipleri | css/tokens.css |
| Genel görünüm | css/theme.css |
| Sayfalar arası düğmeler | css/navigation.css |
| Canlı tablosunun görünümü | css/research.css |
| İstatistiklerin görünümü | css/stats.css |
| Canlı tanıtımları, Türkçe isimler, kaynaklar, fotoğraflar | data/bolu-2026/species.json |
| İstatistik sayıları, grafik grupları ve gözlemci sıralamaları | data/bolu-2026/statistics.json |
| Harita noktaları, gözlem saatleri ve kullanıcılar | data/bolu-2026/observations.json |
| Harita uydu görseli ve kapsadığı sınırlar | data/bolu-2026/map-config.json |
| Haritanın davranışı ve animasyonu | js/bolu-map.js |
| Canlı araması, filtreler ve sayfalama | js/research.js |
| Grafik ve istatistiklerin çizilmesi | js/stats.js |
| Ortak menü ve alt bilginin yüklenmesi | js/common.js |
| Logolar ve uydu görüntüsü | assets/ |

css/layout.css ve css/retro-base.css temel yerleşim kurallarını içerir. vendor/ klasörü Leaflet harita kütüphanesidir. Günlük içerik düzenlemelerinde bu dosyaları değiştirmeniz gerekmez.

## Sayfa adresleri

- Ana sayfa: index.html
- Bolu haritası: bolu-2026/
- Bolu istatistikleri: bolu-2026/istatistikler.html
- Bolu canlı rehberi: bolu-2026/canlilar.html
- Kampüs: kampus/

pages/stats.html ve pages/research.html, eski bağlantılar için yeni adreslere yönlendirir.

## Bilgisayarda önizleme

Veriler ve ortak menüler JSON/HTML dosyalarından yüklendiği için index.html dosyasına çift tıklamak tam önizleme sağlamaz. GitHub Pages üzerinden açın veya Python kuruluysa paket klasöründe terminal açıp `python -m http.server 8000` çalıştırın. Tarayıcıda http://localhost:8000 adresini açın. Node veya derleme işlemi gerekmez.

Fotoğraflar ve Google Fonts internet bağlantısı kullanır. JSON verileri, logolar, Leaflet ve uydu görseli paketin içindedir.

## Verilerin kapsamı

Harita 2.648 konumlandırılmış kayıt; canlı rehberi 606 araştırma sınıfı kaydından türetilmiş 176 başlık içerir. İstatistikler önceki 2.792 kayıtlık dışa aktarımın özetlerini korur. Bu farklı dosyaların sayıları aynı veri kapsamından gelmez. Paket düzenlenirken yeni biyolojik veya konumsal veri eklenmedi.

JSON dosyaları otomatik olarak birbirinden hesaplanmaz. Örneğin yeni harita kaydı eklemek istatistik özetlerini kendiliğinden güncellemez. İlgili veri setlerini birlikte güncelleyin. Canlı sayfasındaki üst sayaçlar species.json içeriğinden hesaplanır.

Alanların açıklamaları ve düzenleme örnekleri için DUZENLEME_REHBERI.md dosyasına bakın.
