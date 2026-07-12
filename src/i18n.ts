import i18next from 'i18next';
import en from './locales/en.json';
import bm from './locales/bm.json';

export type Lang = 'en' | 'bm';

// html lang="" wants a real BCP 47 tag — "bm" isn't one, Malay is "ms".
const HTML_LANG: Record<Lang, string> = { en: 'en', bm: 'ms' };

function stripIndexAndLangSegment(pathname: string): string {
  let path = pathname.replace(/index\.html?$/i, '');
  path = path.replace(/(en|bm)\/?$/i, '');
  if (!path.endsWith('/')) path += '/';
  return path;
}

export function detectLang(): Lang {
  const path = location.pathname.replace(/index\.html?$/i, '');
  const match = path.match(/\/(en|bm)\/?$/i);
  return match ? (match[1].toLowerCase() as Lang) : 'en';
}

export function langHref(lang: Lang): string {
  return stripIndexAndLangSegment(location.pathname) + lang + '/' + location.search + location.hash;
}

// For links that must point at a root-level file (e.g. wishes.html) regardless
// of which lang copy (/, /en/, /bm/) the current page was served from.
export function siteRootHref(filename: string): string {
  return stripIndexAndLangSegment(location.pathname) + filename;
}

const lang = detectLang();

i18next.init({
  lng: lang,
  fallbackLng: 'en',
  resources: { en: { translation: en }, bm: { translation: bm } },
});

document.documentElement.lang = HTML_LANG[lang];

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}

export function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr!.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      el.setAttribute(attr, t(key));
    });
  });
}

export function initLangSwitch(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((link) => {
    const linkLang = link.dataset.langLink as Lang;
    link.href = langHref(linkLang);
    if (linkLang === lang) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
}
