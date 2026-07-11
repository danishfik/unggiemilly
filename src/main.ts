import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { applyTranslations, initLangSwitch, t } from './i18n';

gsap.registerPlugin(ScrollTrigger);

applyTranslations();
initLangSwitch();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================
   Wedding date — TODO: replace with the real date/time/timezone
   ========================================================== */
const WEDDING_DATE = new Date('2026-12-12T10:00:00+08:00');

/* ============ COUNTDOWN ============ */
const countdownEl = document.getElementById('countdown');

function updateCountdown() {
  if (!countdownEl) return;

  const diff = WEDDING_DATE.getTime() - Date.now();
  const clamp = (n: number) => Math.max(0, n);

  const days = clamp(Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = clamp(Math.floor((diff / (1000 * 60 * 60)) % 24));
  const minutes = clamp(Math.floor((diff / (1000 * 60)) % 60));
  const seconds = clamp(Math.floor((diff / 1000) % 60));

  const pad = (n: number) => String(n).padStart(2, '0');

  countdownEl.querySelector('[data-days]')!.textContent = pad(days);
  countdownEl.querySelector('[data-hours]')!.textContent = pad(hours);
  countdownEl.querySelector('[data-minutes]')!.textContent = pad(minutes);
  countdownEl.querySelector('[data-seconds]')!.textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ============ LIGHTBOX ============ */
const lightbox = document.getElementById('lightbox')!;
const lightboxImg = document.getElementById('lightboxImg') as HTMLImageElement;
const lightboxClose = document.getElementById('lightboxClose')!;
const lightboxPrev = document.getElementById('lightboxPrev')!;
const lightboxNext = document.getElementById('lightboxNext')!;

let currentGroup: HTMLImageElement[] = [];
let currentIndex = 0;

function showLightboxImage() {
  const img = currentGroup[currentIndex];
  lightboxImg.src = img.src.replace(/\/\d+\/\d+$/, '/1200/1500');
  lightboxImg.alt = img.alt;
}

function openLightbox(group: HTMLImageElement[], index: number) {
  currentGroup = group;
  currentIndex = index;
  showLightboxImage();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll<HTMLElement>('[data-lightbox-group]').forEach((group) => {
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('.photo-grid-item'));
  const images = buttons.map((btn) => btn.querySelector('img')!);

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => openLightbox(images, index));
  });
});

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

lightboxPrev.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
  showLightboxImage();
});

lightboxNext.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % currentGroup.length;
  showLightboxImage();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev.click();
  if (e.key === 'ArrowRight') lightboxNext.click();
});

/* ============ GIFT LIST ============
   Stored in Firestore (see src/firebase.ts) so every visitor sees the same
   shared, live-updating list — GitHub Pages alone can't persist writes. */
interface GiftEntry {
  name?: string;
  gift?: string;
}

// Loose text match so "A rice cooker" / "rice cooker 5L" / "Rice Cooker!!"
// all flag as the same gift, without needing a fuzzy-match dependency.
function normalizeGiftText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|the)\s+/, '');
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  a.forEach((word) => { if (b.has(word)) intersection++; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function findSimilarGift(newGift: string, existing: GiftEntry[]): GiftEntry | null {
  const normalizedNew = normalizeGiftText(newGift);
  if (!normalizedNew) return null;
  const newWords = new Set(normalizedNew.split(' ').filter(Boolean));

  for (const entry of existing) {
    const normalizedExisting = normalizeGiftText(entry.gift ?? '');
    if (!normalizedExisting) continue;

    if (normalizedNew === normalizedExisting) return entry;
    if (normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew)) return entry;

    const existingWords = new Set(normalizedExisting.split(' ').filter(Boolean));
    if (jaccardSimilarity(newWords, existingWords) >= 0.6) return entry;
  }
  return null;
}

const giftForm = document.getElementById('giftForm') as HTMLFormElement | null;
const giftList = document.getElementById('giftList');
const giftFormStatus = document.getElementById('giftFormStatus');
const giftSubmitBtn = document.getElementById('giftSubmitBtn') as HTMLButtonElement | null;
const giftConfirm = document.getElementById('giftConfirm');
const giftConfirmMessage = document.getElementById('giftConfirmMessage');
const giftConfirmYes = document.getElementById('giftConfirmYes');
const giftConfirmNo = document.getElementById('giftConfirmNo');

if (giftForm && giftList && giftSubmitBtn && giftConfirm && giftConfirmMessage && giftConfirmYes && giftConfirmNo) {
  let latestGifts: GiftEntry[] = [];
  let pendingSubmission: { name: string; gift: string } | null = null;

  const giftsQuery = query(collection(db, 'gifts'), orderBy('createdAt', 'desc'));

  onSnapshot(
    giftsQuery,
    (snapshot) => {
      latestGifts = snapshot.docs.map((doc) => doc.data() as GiftEntry);

      if (snapshot.empty) {
        giftList.innerHTML = `<li class="gift-list-empty">${t('gifts.listEmpty')}</li>`;
        return;
      }
      giftList.innerHTML = '';
      snapshot.forEach((doc) => {
        const data = doc.data() as GiftEntry;
        const li = document.createElement('li');
        const nameEl = document.createElement('span');
        nameEl.className = 'gift-list-name';
        nameEl.textContent = data.name ?? '';
        const giftEl = document.createElement('span');
        giftEl.className = 'gift-list-item';
        giftEl.textContent = data.gift ?? '';
        li.append(nameEl, giftEl);
        giftList.appendChild(li);
      });
    },
    () => {
      giftList.innerHTML = `<li class="gift-list-empty">${t('gifts.listError')}</li>`;
    }
  );

  async function submitGift(name: string, gift: string) {
    giftSubmitBtn!.disabled = true;
    if (giftFormStatus) giftFormStatus.textContent = t('gifts.statusAdding');

    try {
      await addDoc(collection(db, 'gifts'), { name, gift, createdAt: serverTimestamp() });
      giftForm!.reset();
      if (giftFormStatus) giftFormStatus.textContent = t('gifts.statusThankYou');
    } catch {
      if (giftFormStatus) giftFormStatus.textContent = t('gifts.statusError');
    } finally {
      giftSubmitBtn!.disabled = false;
    }
  }

  function showGiftConfirm(similar: GiftEntry, name: string, gift: string) {
    pendingSubmission = { name, gift };
    giftConfirmMessage!.textContent = t('gifts.confirmSimilar', { name: similar.name ?? t('gifts.someone'), gift: similar.gift });
    giftConfirm!.hidden = false;
    giftSubmitBtn!.hidden = true;
  }

  function hideGiftConfirm() {
    giftConfirm!.hidden = true;
    giftSubmitBtn!.hidden = false;
  }

  giftForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(giftForm);
    const honeypot = String(formData.get('company') ?? '').trim();
    if (honeypot) return;

    const name = String(formData.get('name') ?? '').trim();
    const gift = String(formData.get('gift') ?? '').trim();
    if (!name || !gift) return;

    const similar = findSimilarGift(gift, latestGifts);
    if (similar) {
      showGiftConfirm(similar, name, gift);
      return;
    }

    void submitGift(name, gift);
  });

  giftConfirmYes.addEventListener('click', () => {
    hideGiftConfirm();
    if (pendingSubmission) {
      void submitGift(pendingSubmission.name, pendingSubmission.gift);
      pendingSubmission = null;
    }
  });

  giftConfirmNo.addEventListener('click', () => {
    hideGiftConfirm();
    pendingSubmission = null;
    document.getElementById('giftItem')?.focus();
  });
}

/* ============ HERO INTRO ============ */
const heroEls = gsap.utils.toArray<HTMLElement>('[data-hero-el]');
if (prefersReducedMotion) {
  gsap.set(heroEls, { opacity: 1, y: 0 });
} else {
  gsap.set(heroEls, { opacity: 0, y: 30 });
  gsap
    .timeline({ delay: 0.2 })
    .to(heroEls, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });

  // Subtle parallax drift on the hero photo (and full-bleed desktop background)
  gsap.to('.hero-photo img, .hero-bg img', {
    yPercent: 10,
    ease: 'none',
    scrollTrigger: { trigger: '.hero-panel', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ============ SCROLL REVEALS ============ */
if (!prefersReducedMotion) {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 60%', scrub: 0.4 },
      }
    );
  });

  gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
    const items = Array.from(group.children) as HTMLElement[];
    gsap.fromTo(
      items,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 88%', end: 'top 40%', scrub: 0.4 },
      }
    );
  });

  // Divider draw-in
  gsap.utils.toArray<HTMLElement>('[data-divider]').forEach((div) => {
    ScrollTrigger.create({
      trigger: div,
      start: 'top 90%',
      once: true,
      onEnter: () => div.classList.add('is-drawn'),
    });
  });
} else {
  document.querySelectorAll('[data-divider]').forEach((div) => div.classList.add('is-drawn'));
}

/* ============ REFRESH ON LOAD (fonts / images can shift layout) ============ */
window.addEventListener('load', () => ScrollTrigger.refresh());
