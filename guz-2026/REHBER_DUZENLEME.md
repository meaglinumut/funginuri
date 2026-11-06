# Güz 2026 canlı defterini düzenleme

Bu bölüm `canlilar.html` adresinde açılır. İçerik, fotoğraflar ve görünüm ayrı dosyalarda tutulur.

| Değişiklik | Dosya |
| --- | --- |
| Başlık ve giriş açıklaması | `guz-2026/canlilar.html` |
| Canlıların Türkçe tanıtımları, Türkçe adları, yaşam alanları, ekolojik rolleri, kaynakları ve gözlem bağlantıları | `guz-2026/data/research-guide.json` |
| İki fotoğrafın adresleri, fotoğrafçıları, gerçek fotoğraf lisansları ve kaynak sayfaları | `guz-2026/data/research-photos.json` |
| Renk, boşluk, fotoğraf boyutu ve telefon görünümü | `css/guz-guide.css` |
| Arama, keşif çekmeceleri, açılan dosyalar, sayfalama ve fotoğraf büyütme | `js/guz-guide.js` |
| Canlı dosyasından haritaya geçişteki takson filtresi | `js/event-map.js` |

## Bir canlının metnini değiştirme

GitHub'da `guz-2026/data/research-guide.json` dosyasını açıp kalem simgesine basın. İlgili bilimsel adı aratın. `summary` kısa satır açıklamasıdır; `recognition` tanıma ipuçlarını, `life` yaşam biçimini ve `ecology` ekolojik ilişkilerini içerir. `sources` içindeki bağlantılar bu metinlerin kaynaklarıdır. `supports` alanı, ilgili kaynağın hangi metnin yanında numaralandırılacağını belirtir.

`common_name` alanı boşsa bilimsel adın altında Türkçe ad gösterilmez. Yeni bir Türkçe ad eklenecekse kullanılan adı bir kaynaktan doğrulayın. `roles` ve `habitats` aynı yazımla kullanılan etiket dizileridir. Yeni ekolojik roller filtrede otomatik görünür.

Kaydederken tırnakları, virgülleri ve köşeli parantezleri koruyun. `Commit changes` sonrasında GitHub Pages yayını günceller.

## Fotoğrafı değiştirme

`research-photos.json` dosyasında canlının sayısal takson kimliğini aratın. `own`, gezi gözlemine ait fotoğraftır; `reference`, karşılaştırma görselidir. `url` satırdaki ve dosyadaki görseli, `large_url` büyütülen görseli belirler. `author`, `license` ve `page` bilgilerini görselle birlikte güncelleyin. Fotoğraf lisansı, gözlemin veri lisansından farklı olabilir.

Fotoğraf dosyaları dönüştürülmedi. Sayfa, iNaturalist'in yayımladığı fotoğraf adreslerini kullanır; bu görsellerin yüklenmesi internet gerektirir. Fotoğrafların altındaki ad ve lisanslar her görselin kendi üstverisinden alınmıştır.

## Veri kapsamı

Kaynak: mevcut `guz-2026/data/kaynak.csv` dosyası. Araştırma sınıfında bulunan 347 kayıt, 133 tür ve 2 cins başlığında sunulur. Üç alt tür başlığı kendi türleriyle birleştirilmiştir. Türkçe adlar kaynak CSV'deki adlardan alınmıştır. Kaynak CSV ve haritanın konum düzeltmeleri bu rehber hazırlanırken değiştirilmemiştir.

`arastirma_sinifi_kayitlari.csv`, bu 347 kaydın kaynak sütunları korunarak ayrılmış halidir. `GUZ_CANLI_KAYNAKLARI.md`, canlı dosyalarındaki kaynakların toplu listesidir. Tanıtım ve fotoğraf üstverisi kontrol tarihi 6 Kasım 2026'dır.
