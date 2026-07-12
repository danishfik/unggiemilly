import './style.css';
import { db } from './firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { applyTranslations, t } from './i18n';

applyTranslations();

/* ============ WISHES SLIDESHOW ============
   Standalone full-page display (wishes.html) meant for a TV/monitor at the
   venue — reads the same Firestore `wishes` collection as the embedded
   carousel on the main site and cycles through them one at a time, with a
   photo card (same picsum seeds as the #gallery grid in index.html — swap
   both spots together when replacing with real photos) crossfading in sync
   on the left, wish text on the right. */
interface WishEntry {
  name?: string;
  message?: string;
}

const PHOTO_CARD_IMAGES = Array.from({ length: 8 }, (_, i) => `https://picsum.photos/seed/wedding-g${i + 1}/700/900`);
const ADVANCE_MS = 8000;

const stageTrack = document.getElementById('wishStageTrack');
const stagePhoto = document.getElementById('wishStagePhoto');

if (stageTrack && stagePhoto) {
  let wishes: WishEntry[] = [];
  let currentIndex = 0;
  let advanceTimer: ReturnType<typeof setInterval> | null = null;

  const photoImages = PHOTO_CARD_IMAGES.map((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.className = 'wish-stage-photo-img' + (i === 0 ? ' is-active' : '');
    stagePhoto.appendChild(img);
    return img;
  });

  function goTo(index: number) {
    if (wishes.length === 0) return;
    currentIndex = ((index % wishes.length) + wishes.length) % wishes.length;
    stageTrack!.querySelectorAll('.wish-stage-slide').forEach((slide, i) => {
      slide.classList.toggle('is-active', i === currentIndex);
    });
    photoImages.forEach((img, i) => img.classList.toggle('is-active', i === currentIndex % photoImages.length));
  }

  function render() {
    stageTrack!.innerHTML = '';

    if (wishes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'wish-stage-empty';
      empty.textContent = t('wishes.listEmpty');
      stageTrack!.appendChild(empty);
      return;
    }

    wishes.forEach((wish, i) => {
      const slide = document.createElement('div');
      slide.className = 'wish-stage-slide' + (i === currentIndex ? ' is-active' : '');
      const messageEl = document.createElement('p');
      messageEl.className = 'wish-stage-message';
      messageEl.textContent = wish.message ?? '';
      const nameEl = document.createElement('p');
      nameEl.className = 'wish-stage-name';
      nameEl.textContent = wish.name ?? t('gifts.someone');
      slide.append(messageEl, nameEl);
      stageTrack!.appendChild(slide);
    });
  }

  function startAdvance() {
    stopAdvance();
    if (wishes.length > 1) {
      advanceTimer = setInterval(() => goTo(currentIndex + 1), ADVANCE_MS);
    }
  }

  function stopAdvance() {
    if (advanceTimer !== null) {
      clearInterval(advanceTimer);
      advanceTimer = null;
    }
  }

  const wishesQuery = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'));

  onSnapshot(
    wishesQuery,
    (snapshot) => {
      wishes = snapshot.docs.map((doc) => doc.data() as WishEntry);
      currentIndex = Math.min(currentIndex, Math.max(wishes.length - 1, 0));
      render();
      goTo(currentIndex);
      startAdvance();
    },
    () => {
      wishes = [];
      stopAdvance();
      stageTrack!.innerHTML = '';
      const error = document.createElement('p');
      error.className = 'wish-stage-empty';
      error.textContent = t('wishes.listError');
      stageTrack!.appendChild(error);
    }
  );
}
