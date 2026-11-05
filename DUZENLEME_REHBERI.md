Güncel ortak etkinlik dosyaları: `css/events.css`, `js/event-map.js`, `js/event-stats.js`. Bolu ve Güz aynı dosyaları kullanır. Ayrıntılar: [Ortak biçim rehberi](ORTAK_FORMAT_KURULUM.md).

# Veri düzenleme rehberi

JSON metin dosyalarını VS Code gibi bir düzenleyicide açabilirsiniz. Tırnakları, köşeli parantezleri ve virgülleri koruyun. Son öğeden sonra virgül koymayın. Düzenledikten sonra dosyayı UTF-8 olarak kaydedin. JSON dosyalarına yorum satırı eklemeyin.

## Bir canlının açıklamasını veya fotoğrafını değiştirme

`data/bolu-2026/species.json` içinde bilimsel adı arayın. Her kayıt tek bir canlı başlığıdır.

| Alan | Anlamı |
| --- | --- |
| name | Bilimsel ad |
| common_name | Türkçe ad; yoksa boş metin bırakılır |
| id | iNaturalist takson kimliği |
| rank | species veya genus |
| group | Türkçe canlı grubu |
| family | Familya |
| traits | Ayırt edici özellikler metni |
| life | Yaşam biçimi ve habitat metni |
| count | Bu başlığa bağlı gezi gözlemi sayısı |
| observers | Farklı gözlemci sayısı |
| observations | Gezi gözlemlerinin iNaturalist kimlikleri |
| own_photo | Gezi fotoğrafı ve gözlem kaynağı |
| own_photo.url | Gezi fotoğrafının doğrudan görsel adresi |
| own_photo.user_name | Fotoğrafın kredi adı; yoksa user_login kullanılır |
| own_photo.user_login | iNaturalist kullanıcı adı |
| own_photo.observation | Görselin bağlı olduğu gözlem bağlantısı |
| own_photo.observation_id | İlgili gözlem kimliği |
| own_photo.license | Fotoğraf lisansı |
| photos | Dış referans görselleri; şu anda ilk görsel gösterilir |
| photos[0].url | Dış görsel adresi |
| photos[0].author | Fotoğrafçı |
| photos[0].page | Fotoğrafın kaynak sayfası |
| photos[0].license | Fotoğraf lisansı |
| sources | Tanıtımın kaynak bağlantıları |
| sources[].label | Ekranda görünen kaynak adı |
| sources[].url | Kaynağın adresi |
| kew | Varsa Kew / POWO bağlantısı |

Fotoğraf değiştirdiğinizde bağlantısını, fotoğrafçı adını ve lisansını birlikte güncelleyin. Fotoğraf altındaki “Referans:” öneki kaldırılmıştır; doğrudan kredi adı ve lisans görünür.

Yeni canlı eklemek için bir kaydı şablon olarak kopyalayıp bütün alanlarını güncelleyin. Üst sayaçlar, grup listesi ve arama yeni veriyi kullanır. count, observers ve observations alanlarını birbirleriyle tutarlı tutun.

## İstatistik değiştirme

`data/bolu-2026/statistics.json` alanları:

- metrics: üstteki dört özet kutusu; value görünen değer, label başlıktır.
- charts: üç halka grafik. items içindeki label, count ve color alanları dilimleri belirler. Dilim oranları sayılardan hesaplanır. center_value ve center_label grafik ortasında gösterilir.
- facts: kısa bilgi kutuları.
- rankings: gözlemci sıralamaları. obs gözlem, taxa farklı takson, research araştırma sınıfı sıralamasıdır.
- top_taxa: en çok kaydedilen taksonların etiket ve sayıları.
- hours: saatlere göre kayıt sayıları.
- observers: alttaki gözlemci tablosu.

Bir sayı değiştiğinde diğer özetlerin de güncellenmesi gerekebilir. Bunlar ayrı özet alanlarıdır. Sıralama çubuklarının uzunlukları ve halka grafik oranları otomatik hesaplanır.

## Harita verisi değiştirme

`data/bolu-2026/observations.json` alanları:

- id: iNaturalist gözlem kimliği.
- user: gözlemci kullanıcı adı.
- lat, lon: haritada kullanılan koordinatlar.
- t: yerel saatte gece yarısından itibaren dakika; örneğin 09.30 için 570. Güvenilir saat yoksa null.
- time: varsa saat dilimi içeren tarih-saat metni.
- est: tahmini konum için true, özgün konum adayı için false.
- radius: tahminin belirsizlik yarıçapı, metre; kullanılmıyorsa null.
- name: görünen takson adı.
- group: filtrelerde kullanılan grup kodu, örneğin Fungi veya Plantae.
- taxon: iNaturalist takson kimliği.
- spatial: yalnızca yaklaşık bölge bilgisi varsa true.
- basis: konum sınıflandırma dayanağı.
- accuracy: dışa aktarımdaki konum doğruluğu.
- rawLat, rawLon: dışa aktarımdaki ham koordinatlar.

Saatleri güvenilmez olan kayıtları animasyona sokmamak için t alanını null tutun. Ham koordinat ile tahmini koordinatı birbirine karıştırmayın. Yeni gözlemciler ve gruplar filtrelere otomatik eklenir. Yeni bir grup için özel Türkçe etiket isterseniz bolu-2026/index.html içindeki grup seçeneklerine etiketini ekleyebilirsiniz.

## Ortak başlıkları değiştirme

`partials/header.html`, `partials/footer.html` ve `partials/bolu-2026-hero.html` doğrudan düzenlenebilir. {{BASE}} işaretini koruyun; bu işaret, bağlantıların sitenin farklı klasörlerinde doğru açılmasını sağlar.

Yeni bir etkinlik için bolu-2026 ve data/bolu-2026 klasörlerini yeni adla kopyalayabilirsiniz. Yeni sayfalardaki veri adreslerini ve üst menüdeki etkinlik bağlantısını da güncellemeniz gerekir.
