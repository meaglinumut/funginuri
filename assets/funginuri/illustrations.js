(function(pages,artwork){
  const assets = new URL('./', document.currentScript.src);
  const siteRoot = new URL('../../', assets).pathname;
  let page = location.pathname.slice(siteRoot.length);
  if (!page || page.endsWith('/')) page += 'index.html';
  const pageIndex = Math.max(0, pages.indexOf(page));
  const choices = Array.from({length: 15}, (_, index) =>
    artwork[(pageIndex * 13 + index * 5) % artwork.length]
  );

  function illustration(filename) {
    const img = document.createElement('img');
    img.src = new URL('decor/' + filename, assets).href;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function fillIllustrations(container, files, start) {
    if (!container) return;
    files.forEach((filename, index) => {
      const img = illustration(filename);
      const variation = pageIndex * 7 + (start + index) * 3;
      img.style.setProperty('--fn-art-tilt', (variation % 7 - 3) + 'deg');
      img.style.setProperty('--fn-art-width', (76 + variation % 24) + '%');
      container.append(img);
    });
  }

  for (const [side, start] of [['left', 0], ['right', 5]]) {
    const rail = document.querySelector('.fn-decor-rail-' + side);
    if (!rail) continue;
    rail.style.setProperty('--fn-rail-top', (13 + (pageIndex * 17 + start * 5) % 42) + 'px');
    rail.style.setProperty('--fn-rail-gap', (10 + (pageIndex * 3 + start) % 13) + 'px');
    const inner = document.createElement('div');
    inner.className = 'fn-decor-rail-inner';
    rail.append(inner);
    fillIllustrations(inner, choices.slice(start, start + 5), start);
  }

  fillIllustrations(document.querySelector('.fn-bottom-illustrations'), choices.slice(10), 10);

  const navArtwork = {
    anasayfa: 'plate-01.webp',
    tursaylar: 'plate-57.webp',
    bounmantar: 'plate-36.webp',
    inaturalist: 'plate-70.webp',
    fungarium: 'plate-13.webp',
    mikroskopi: 'plate-38.webp',
    hakkimda: 'plate-65.webp',
  };

  function decorateNavigation(scope) {
    const items = scope.querySelectorAll(
      '.main-nav > a, .main-nav > details > summary, .fn-nav > a, .fn-nav > details > summary'
    );
    for (const item of items) {
      if (item.classList.contains('fn-nav-with-icon')) continue;
      const key = item.tagName === 'SUMMARY' ? 'tursaylar' : item.dataset.pageLink || item.dataset.fnPage;
      if (!navArtwork[key]) continue;
      const img = illustration(navArtwork[key]);
      img.className = 'fn-nav-mushroom';
      img.loading = 'eager';
      img.width = 18;
      img.height = 22;
      item.classList.add('fn-nav-with-icon');
      item.prepend(img);
    }
  }

  function decorateFooter(scope) {
    for (const footer of scope.querySelectorAll('footer.site-footer, footer.beykoz-footer')) {
      if (footer.querySelector('.fn-footer-brand')) continue;
      let wordmark = [...footer.querySelectorAll('strong')].find(el => el.textContent.trim() === 'funginuri.');
      const brand = document.createElement('span');
      brand.className = 'fn-footer-brand';
      const logo = document.createElement('img');
      logo.src = new URL('funginuri-logo.png', assets).href;
      logo.alt = '';
      logo.width = 36;
      logo.height = 49;
      logo.loading = 'lazy';
      brand.append(logo);
      if (wordmark) {
        wordmark.before(brand);
      } else {
        wordmark = document.createElement('strong');
        wordmark.textContent = 'funginuri.';
        footer.prepend(brand);
      }
      brand.append(wordmark);
    }
  }

  decorateNavigation(document);
  decorateFooter(document);
  for (const target of document.querySelectorAll('[data-include="header"], [data-include="footer"]')) {
    if (target.firstElementChild) continue;
    const observer = new MutationObserver(() => {
      observer.disconnect();
      if (target.dataset.include === 'header') decorateNavigation(target);
      else decorateFooter(target);
    });
    observer.observe(target, {childList: true});
  }
})(["bahar-2026/canlilar.html","bahar-2026/index.html","bahar-2026/istatistikler.html","beykoz-doga-2026/canlilar.html","beykoz-doga-2026/index.html","beykoz-doga-2026/istatistikler.html","bolu-2026/canlilar.html","bolu-2026/index.html","bolu-2026/istatistikler.html","bounmantar.html","fungarium.html","guz-2026/canlilar.html","guz-2026/index.html","guz-2026/istatistikler.html","hakkimda.html","inaturalist.html","index.html","kampus/index.html","mikroskopi.html","rehber/bitkiler.html","rehber/bocekler.html","rehber/kuslar.html","rehber/likenler.html","rehber/mantarlar.html","rehber/omurgalilar.html","rehber/orumcegimsiler.html","rehber/yumusakcalar.html","tursay-nedir.html","tursaylar.html"],
[
  "plate-01.webp",
  "107_Hygrophoropsis_aurantiaca.webp",
  "plate-02.webp",
  "plate-03.webp",
  "108_Sarcoscypha_coccinea.webp",
  "plate-04.webp",
  "plate-05.webp",
  "109_Lepidotia_hispida.webp",
  "plate-06.webp",
  "plate-07.webp",
  "110_Suillus_grevillei.webp",
  "plate-08.webp",
  "plate-09.webp",
  "111_Coltricia_perennis_var.webp",
  "plate-10.webp",
  "plate-11.webp",
  "112_Amanita_ceciliae.webp",
  "plate-12.webp",
  "plate-13.webp",
  "113_Lycoperdon_utriforme_var.webp",
  "plate-14.webp",
  "plate-15.webp",
  "88_Limacella_guttata.webp",
  "plate-16.webp",
  "plate-17.webp",
  "89_Entoloma_bloxamii.webp",
  "plate-18.webp",
  "plate-19.webp",
  "90_Crepidotus_variabilis.webp",
  "plate-20.webp",
  "plate-21.webp",
  "91_Mucidula_mucida_Oudemansiella_mucida.webp",
  "plate-22.webp",
  "plate-23.webp",
  "92_Tricholoma_equestre.webp",
  "plate-24.webp",
  "plate-25.webp",
  "93_Clavulinopsis_fusiformis.webp",
  "plate-26.webp",
  "plate-27.webp",
  "Coltricia_perennis.webp",
  "plate-36.webp",
  "plate-37.webp",
  "Gymnopus_fusipes.webp",
  "plate-38.webp",
  "plate-39.webp",
  "Hypsizygus_ulmarius.webp",
  "plate-40.webp",
  "plate-41.webp",
  "Legaliana_badia.webp",
  "plate-51.webp",
  "plate-52.webp",
  "Pholiota_squarrosa.webp",
  "plate-53.webp",
  "plate-54.webp",
  "plate-55.webp",
  "plate-56.webp",
  "plate-57.webp",
  "plate-64.webp",
  "plate-65.webp",
  "plate-66.webp",
  "plate-67.webp",
  "plate-68.webp",
  "plate-69.webp",
  "plate-70.webp",
  "plate-71.webp"
]);
