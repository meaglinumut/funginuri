# Kilyos Bahar 2026, perspektif gözlem haritası

Kaynak veriler: `../bahar-2026/data/observations-manifest.json` ve manifestteki 16 gözlem JSON'u. Kilyos kampüsüne atanmış kayıtlar, sayfa açıldığında filtrelenir. Orijinal Bahar verileri değiştirilmez.

Görsel: kullanıcı tarafından sağlanan 1412 × 708 eğik kıyı fotoğrafının aynı ölçülerde ve aynı perspektifte WebP kopyası (`perspective.webp`).

Referanslama: QGIS `resimharita.points` dosyasındaki 7 yer kontrol noktası; EPSG:3857 Web Mercator. `calibration.json` dosyasındaki `origin` ve `ground_to_pixel` homografi matrisi kullanılarak WGS84 coğrafi koordinatları görüntü piksellerine dönüştürülür. Alternatif 6 noktalı hesap kullanıcı tarafından seçilebilir. Görüntü rasterı eğilmez veya yeniden projekte edilmez. Konumlar tek bir düzlem homografisiyle yaklaşık olarak gösterilir; yükselti/paralaks kaynaklı sapmalar olasıdır.

Dışarıda kalan kayıtlar görüntü sınırında gösterilmez. GPS adayları iNaturalist fotoğraflarının EXIF GPS verileri doğrulanmış anlamına gelmez; tahmini koordinatların belirsizliği yüksektir. Fotoğraf üzerinde yer alabilen gözlemlerin sayısı dönüşüm modu ve filtrelerle değişebilir.

Kullanım: GitHub Pages üzerindeki `/kilyos-bahar-2026/` dizini. Yerelde çalıştırmak için `python -m http.server` ile depo kökünü sunmak gerekir. Leaflet yerel `../vendor/leaflet.js` dosyasından yüklenir; ek hizmet gerekmez.
