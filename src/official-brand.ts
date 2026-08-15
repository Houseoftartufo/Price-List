import './styles/official-brand.css';

const DARK_LOGO = '/brand/house-of-tartufo-logo-dark.png';
const WHITE_LOGO = '/brand/house-of-tartufo-logo-white.png';

function logoFor(brand: HTMLElement): string {
  return brand.dataset.brandVariant === 'white' || brand.classList.contains('brand-on-dark')
    ? WHITE_LOGO
    : DARK_LOGO;
}

function applyOfficialBrand(): void {
  document.querySelectorAll<HTMLElement>('.brand').forEach((brand) => {
    const wanted = logoFor(brand);
    let logo = brand.querySelector<HTMLImageElement>('.brand-logo');

    if (!logo) {
      logo = document.createElement('img');
      logo.className = 'brand-logo';
      // The surrounding brand element already carries the accessible label.
      logo.alt = '';
      logo.decoding = 'async';
      logo.draggable = false;
      brand.replaceChildren(logo);
    }

    if (logo.getAttribute('src') !== wanted) logo.src = wanted;
    brand.dataset.officialBrand = 'true';
  });
}

applyOfficialBrand();

const observer = new MutationObserver(applyOfficialBrand);
observer.observe(document.body, { childList: true, subtree: true });

export {};
