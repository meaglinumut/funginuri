# Kandilli Bioblitz 2026: konum ve sayım yöntemi

- Kaynak CSV: `observations-811239.csv` (SHA-256: `656e81d406392bfd12707a2efea21590a6d32176addea56029ebacbb593448b2`)
- Kaynak sınır: `kandilli.kml` (SHA-256: `6faddbe6661b6341418acfcc70fbd926588da90205ed2ef2cc19832cb5473958`)
- Tarih: 2 Ekim 2026 (CSV verisi).
- Gözlem sayısı: 98; gözlemci: 3; tür düzeyinde tanımlanan farklı tür: 51; araştırma sınıfı: 30.
- 98/98 kaynak koordinatı sağlanan KML sınırı içinde.
- Orijinal koordinatlar aynen korunmuştur: GPS doğrulaması, rota interpolasyonu, elle düzeltme, sınır içine taşıma veya yaklaşık konum üretimi yapılmamıştır.
- GPS işareti CSV`nin `positioning_method` sütunundan gelir; işaretsiz kayıtlar da kullanıcı talebi üzerine kaynak koordinatı olarak haritada gösterilmiştir. Fotoğraf EXIF doğrulaması yapılmadı.
- Tür sayısı CSV`deki `taxon_species_name` sütununun benzersiz, dolu değerlerinden hesaplanır; iNaturalist proje leaf-count sayısıyla aynı ölçü değildir.
- Fotoğraflar iNaturalist gözlem bağlantısından gösterilir; görüntü lisansları mümkünse fotoğraf API bilgisinden alınır.
- Haritada yalnızca CSV`deki 98 gözlem bulunur. KML görselleştirilir, gözlem verileri KML`ye göre filtrelenmez.