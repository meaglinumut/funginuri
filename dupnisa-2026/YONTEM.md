# Dupnisa konum veri denetimi

Kaynak CSV: `observations-811247.csv`. Gözlemler 71 kayıt, 4 gözlemci, 42 tür düzeyinde farklı ad.

Haritada bütün noktalar taşınmamıştır. **23 kaydın** özgün koordinatı korunur. **48 kayıt**, birden çok saat/gün boyunca tekrar kullanılan aynı koordinata sahip olduğundan görselleştirme için mağara girişine yerleştirilir. Belirleme ölçütü: en az üç kaydın aynı koordinatı paylaşması ve zaman aralığının bir saatten uzun olması ya da zaman bilgisi olmaması; veya en az iki kaydın aynı koordinatta altı saatten fazla aralıkla bulunması. Aynı anda yakın çekilen iki fotoğrafın ortak GPS noktası korunur. Bu ayrım yalnızca harita gösterimi içindir.

Mağara girişi: OSM düğüm 3077789524, 41.84058, 27.55587.

Özgün koordinatlar her kayıt için `original_lat` ve `original_lon` alanlarında korunur; `coordinate-audit.csv` ile ayrıca denetlenebilir. Sayfaya yöntem ve konum kalitesi açıklaması eklenmemiştir.