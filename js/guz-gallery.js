/* Boğaziçi Tür Say Güz 2026 fotoğraf galerisi. Fotoğraflar iNaturalist'ten yüklenir. */
(async function () {
  const host = document.getElementById('guzPhotoGallery');
  if (!host) return;
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  try {
    const res = await fetch('../data/guz-2026/gallery.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const gallery = await res.json();
    const photos = gallery.photos || [];
    if (!photos.length) throw new Error('Fotoğraf listesi boş');
    const photographer = gallery.photographer;
    const h2 = make('h2', '', 'Fotoğraf galerisi');
    const intro = make('p', 'guz-gallery-intro');
    intro.append(document.createTextNode(photos.length + ' gözlemden seçilmiş kareler · Fotoğraflar: '));
    const author = make('a', '', photographer.name + ' (@' + photographer.username + ')');
    author.href = photographer.url;
    author.target = '_blank';
    author.rel = 'noopener noreferrer';
    intro.append(author);
    const grid = make('div', 'guz-gallery-grid');
    const dialog = make('dialog', 'photo-dialog guz-photo-dialog');
    dialog.setAttribute('aria-label', 'Fotoğraf büyütme ve gezinme');
    const dialogHead = make('header');
    const title = make('h3');
    const closeButton = make('button', 'photo-close', 'Kapat ×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Fotoğrafı kapat');
    dialogHead.append(title, closeButton);
    const figure = make('figure');
    const full = make('img');
    full.alt = '';
    const photoCaption = make('figcaption');
    figure.append(full, photoCaption);
    const nav = make('nav');
    nav.setAttribute('aria-label', 'Fotoğraf gezinme');
    const previous = make('button', 'photo-prev', '◀ Önceki');
    const count = make('span', 'photo-count');
    count.setAttribute('aria-live', 'polite');
    const next = make('button', 'photo-next', 'Sonraki ▶');
    previous.type = next.type = 'button';
    nav.append(previous, count, next);
    dialog.append(dialogHead, figure, nav);

    let current = 0;
    const sourceLink = (p) => {
      const link = make('a', '', 'iNaturalist gözlemini aç ↗');
      link.href = p.observation_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    };
    const show = (index) => {
      current = (index + photos.length) % photos.length;
      const p = photos[current];
      title.textContent = p.scientific_name;
      full.onerror = () => {
        full.onerror = null;
        full.src = p.image_large;
      };
      full.src = p.image_original;
      full.alt = p.scientific_name + (p.common_name ? ' (' + p.common_name + ')' : '');
      photoCaption.replaceChildren(document.createTextNode('Fotoğraf: '));
      const credit = make('a', '', photographer.name);
      credit.href = photographer.url;
      credit.target = '_blank';
      credit.rel = 'noopener noreferrer';
      photoCaption.append(credit, document.createTextNode(' · '), sourceLink(p));
      count.textContent = (current + 1) + ' / ' + photos.length;
    };
    const open = (index) => {
      show(index);
      if (!dialog.open) dialog.showModal();
    };
    photos.forEach((p, i) => {
      const card = make('figure', 'guz-photo-card');
      const button = make('button', 'guz-photo-open');
      button.type = 'button';
      button.setAttribute('aria-label', p.scientific_name + ' fotoğrafını büyüt');
      const image = make('img');
      image.src = p.image_large;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = p.scientific_name + (p.common_name ? ' · ' + p.common_name : '');
      image.onerror = () => {
        image.onerror = null;
        image.src = p.image_medium;
      };
      button.append(image);
      button.addEventListener('click', () => open(i));
      const caption = make('figcaption');
      const latin = make('strong', 'guz-scientific', p.scientific_name);
      caption.append(latin);
      if (p.common_name) caption.append(make('span', 'guz-common', p.common_name));
      caption.append(sourceLink(p));
      card.append(button, caption);
      grid.append(card);
    });
    closeButton.addEventListener('click', () => dialog.close());
    previous.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    host.replaceChildren(h2, intro, grid);
    document.body.append(dialog);
  } catch (err) {
    console.error('Güz galerisi yüklenemedi:', err);
    host.replaceChildren(make('h2', '', 'Fotoğraf galerisi'), make('p', '', 'Fotoğraf galerisi şu anda yüklenemiyor.'));
  }
})();
