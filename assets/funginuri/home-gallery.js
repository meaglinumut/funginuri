(() => {
  const gallery = document.querySelector('.fungi-gallery');
  const slides = JSON.parse(document.getElementById('fungi-slides').textContent);
  const controls = gallery.querySelector('.fungi-controls');
  const play = gallery.querySelector('[data-play]');
  const species = gallery.querySelector('.fungi-species');
  const place = gallery.querySelector('.fungi-place');
  const position = gallery.querySelector('.fungi-position');
  const photoLink = gallery.querySelector('.fungi-photo');
  const caption = gallery.querySelector('figcaption');
  const interval = 6000;
  let index = 0;
  let photo = photoLink.querySelector('img');
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loading = false;
  let timer;

  function schedule() {
    window.clearTimeout(timer);
    if (playing && !document.hidden && !loading) {
      timer = window.setTimeout(() => advance(1), interval);
    }
  }

  function updatePlay() {
    play.textContent = playing ? 'Duraklat' : 'Oynat';
    caption.setAttribute('aria-live', playing ? 'off' : 'polite');
    schedule();
  }

  async function advance(direction) {
    if (loading) return;
    loading = true;
    window.clearTimeout(timer);
    for (let step = 1; step < slides.length; step += 1) {
      const nextIndex = (index + slides.length + step * direction) % slides.length;
      const {src, name, locality, url} = slides[nextIndex];
      const nextPhoto = new Image();
      nextPhoto.alt = name;
      nextPhoto.src = src;
      try {
        await nextPhoto.decode();
      } catch {
        continue;
      }
      photo.replaceWith(nextPhoto);
      photo = nextPhoto;
      index = nextIndex;
      photoLink.href = species.href = url;
      species.querySelector('i').textContent = name;
      place.textContent = locality;
      position.textContent = (index + 1) + ' / ' + slides.length;
      break;
    }
    loading = false;
    schedule();
  }

  gallery.querySelector('[data-prev]').addEventListener('click', () => advance(-1));
  gallery.querySelector('[data-next]').addEventListener('click', () => advance(1));
  play.addEventListener('click', () => {
    playing = !playing;
    updatePlay();
  });
  document.addEventListener('visibilitychange', schedule);
  controls.hidden = false;
  updatePlay();
})();
