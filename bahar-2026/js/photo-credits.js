/* iNaturalist fotoğraf künyesi: her fotoğrafın kendi lisansını kullanır. */
(function () {
  const credits = new Map();
  const inflight = new Set();
  const root = document.getElementById('taxonCards');
  if (!root) return;

  function photographer(attribution) {
    const raw = String(attribution || '').trim();
    if (!raw) return '';
    return raw
      .replace(/^(?:©|\(c\)|copyright)\s*/i, '')
      .replace(/,?\s*(?:some rights reserved|all rights reserved|no rights reserved)\b.*$/i, '')
      .replace(/\s*\((?:CC0|CC[-\w]+|all rights reserved)\)\s*$/i, '')
      .trim();
  }

  function render(node, record) {
    const photoId = node.dataset.photoId;
    const link = document.createElement('a');
    link.href = photoId ? 'https://www.inaturalist.org/photos/' + photoId : 'https://www.inaturalist.org/observations/' + node.dataset.observationId;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = record && record.author ? record.author : 'Fotoğraf kaynağı';
    node.replaceChildren(link);
    const rights = document.createElement('span');
    rights.textContent = ' · ' + (record && record.license ? record.license : 'Lisans bilgisi iNaturalist’te');
    node.append(rights);
  }

  async function fetchCredits(ids) {
    if (!ids.length) return;
    const url = 'https://api.inaturalist.org/v1/observations?per_page=100&id=' + ids.join(',');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('iNaturalist API: ' + response.status);
      const payload = await response.json();
      const found = new Map((payload.results || []).map(item => [String(item.id), item]));
      for (const id of ids) {
        const observation = found.get(id);
        if (!observation) { credits.set(id, new Map()); continue; }
        const byPhoto = new Map((observation.photos || []).map(photo => [String(photo.id), photo]));
        credits.set(id, byPhoto);
      }
    } catch (error) {
      ids.forEach(id => credits.set(id, new Map()));
      console.warn('Fotoğraf lisansları alınamadı; iNaturalist bağlantıları gösteriliyor.', error);
    } finally {
      ids.forEach(id => inflight.delete(id));
      sync();
    }
  }

  function sync() {
    const nodes = Array.from(root.querySelectorAll('.photo-credit[data-observation-id]'));
    const missing = new Set();
    for (const node of nodes) {
      const id = node.dataset.observationId;
      const photoId = node.dataset.photoId;
      const photo = credits.get(id)?.get(photoId);
      if (photo) {
        const author = photographer(photo.attribution);
        const license = String(photo.license_code || '').toUpperCase();
        render(node, {author, license: license || 'Tüm hakları saklıdır'});
      } else {
        render(node, null);
        if (photoId && id && !credits.has(id) && !inflight.has(id)) missing.add(id);
      }
    }
    const ids = [...missing];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      batch.forEach(id => inflight.add(id));
      fetchCredits(batch);
    }
  }
  window.BaharPhotoCredits = {sync};
  sync();
})();
