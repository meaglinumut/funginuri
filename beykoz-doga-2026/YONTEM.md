# Beykoz Doğa Koleji Tür Say 2026 - Konum yöntemi

Etkinlik: 14 Mayıs 2026. Kaynak: `observations-810454.csv` ve `doga-koleji-beykoz-kampusu.kml`. Kaynak SHA256: 7ada19d51b4d3afcabf72da8462a51d1ba3fcaa5f7c37a6bbec4665be6f2edda.

- Toplam **185** gözlem; KML içinde başlangıçta **160** ve KML dışında **25** nokta.
- Haritada **185**; GPS adayı **143**, zaman/küme destekli veya doğrulanmamış özgün yaklaşık konum **42**, harita dışında **0**.
- **GPS adayı**: koordinatı kampüs KML sınırında, kamuya açık, `positional_accuracy` ≤100 m (CSV'de açık GPS işaretli olanlarda ≤150 m) ve aynı kullanıcı/gün/koordinat tekrar sayısı en fazla 5. EXIF doğrulaması yapılmadı.
- **Yaklaşık**: aynı kullanıcının 20 dakika içindeki güvenilir kayıtlarıyla önce/sonra interpolasyonu (300 m'den kısa doğrusal mesafe, en fazla 1.7 m/sn), ya da 12 dakika içindeki aynı kullanıcı referansı; uygun değilse 9 dakika içindeki farklı gözlemcilerin 90 m'lik yerel kümeleri. Kaynak koordinatla 430 m'den uzak grup referansı kullanılmaz.
- Referans bulunmadığında KML içindeki ancak GPS kökeni doğrulanmamış özgün nokta **GPS değil, yaklaşık** olarak gösterilir. KML dışındaki desteklenmeyen nokta tahmin edilmez. KML dışında tutulan noktanın ekranda gösterilen konumu güvenilir referanstan elde edilmişse en yakın iç KML bölgesine taşınabilir; bu özgün GPS ölçümü değildir.
- Tüm sonuçların gerekçeleri ve referans gözlem ID'leri `source-audit.csv` dosyasındadır. CSV'nin orijinal koordinatları değiştirilmedi.
- Tür metrikleri CSV'nin `taxon_species_name` alanında tür düzeyine ulaşan farklı türleri sayar (**62**). Tür üstü taksonlar dahil edilmez. Takson ID sayısı **104**.