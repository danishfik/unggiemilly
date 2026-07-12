# Danish & Kamilia — Wedding

Wedding landing page for **Muhammad Danish Fikri Bin Mat Juri** & **Intan
Kamilia Binti Roslan**. Built with Vite + TypeScript and animated with
[GSAP ScrollTrigger](https://gsap.com/scroll/).

## Development

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build -> dist/
npm run preview   # preview the production build locally
```

## Placeholders to replace before launch

- **Wedding date/time**: `WEDDING_DATE` in [src/main.ts](src/main.ts) —
  currently `2026-12-12T10:00:00+08:00`. Drives the countdown timer.
- **Date/venue text**: `.date-line` in [index.html](index.html) —
  currently "12TH DECEMBER 2026 · KUALA LUMPUR".
- **Photos**: every `<img>` currently points at a `picsum.photos` random
  placeholder (hero photo, collage, schedule photo, gallery grid) —
  search `picsum.photos` in [index.html](index.html) and swap in real photos.
  Drop files into `src/assets/` and reference them as `/src/assets/your-photo.jpg`
  so Vite bundles them, or use any external URL. The `PHOTO_CARD_IMAGES` array
  in [src/wishes.ts](src/wishes.ts) reuses the same 8 gallery placeholder seeds
  for the slideshow page's photo card — update it alongside the gallery grid.
- **Schedule**: events/times/venues in the `#schedule` section (Akad Nikah
  and Majlis Resepsi tabs) — sample Malay wedding running order, update to
  match the real day-of schedule.
- **Points of interest & map**: the list in `#directions` and the Google
  Maps embed (currently a generic "Kuala Lumpur" search) — replace with the
  real venue addresses/pins.
- **Firebase config** (required for the Gifts section to work — see below).

## Gifts & Wishes sections (Firebase Firestore)

GitHub Pages only serves static files — it can't run a server or persist
writes on its own. The `#gifts` list (guests state what they're bringing so
others can see and avoid duplicates) and the `#wishes` carousel (guests leave
a message for the couple and can read what others wrote) both need somewhere
to store that shared, live-updating data, so they use
[Firebase Firestore](https://firebase.google.com/docs/firestore)
(free tier is plenty for this). The site still deploys to GitHub Pages as
normal — Firestore is just the data store the client-side JS talks to.

**Setup:**

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com).
2. In the project, go to **Build → Firestore Database → Create database**
   (start in production mode, pick any region).
3. Go to **Project settings → General → Your apps**, click the web icon
   (`</>`) to register a web app, and copy the `firebaseConfig` object it
   gives you.
4. Paste those values into `firebaseConfig` in [src/firebase.ts](src/firebase.ts)
   (replacing the `YOUR_...` placeholders). These values are meant to be
   public/client-side — Firestore access is controlled by the security
   rules below, not by hiding this config.
5. In **Firestore Database → Rules**, replace the default rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /gifts/{giftId} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasOnly(['name', 'gift', 'createdAt'])
                       && request.resource.data.name is string
                       && request.resource.data.name.size() > 0
                       && request.resource.data.name.size() <= 60
                       && request.resource.data.gift is string
                       && request.resource.data.gift.size() > 0
                       && request.resource.data.gift.size() <= 200;
         allow update, delete: if false;
       }
       match /wishes/{wishId} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasOnly(['name', 'message', 'createdAt'])
                       && request.resource.data.name is string
                       && request.resource.data.name.size() > 0
                       && request.resource.data.name.size() <= 60
                       && request.resource.data.message is string
                       && request.resource.data.message.size() > 0
                       && request.resource.data.message.size() <= 300;
         allow update, delete: if false;
       }
     }
   }
   ```

   This lets anyone read the lists and add an entry (no login needed, so
   guests don't need an account), but nobody can edit or delete existing
   entries, and each entry is validated to look like a real gift/wish entry.

Since there's no login, the form is open to anyone with the link (same
trust model as a public guestbook) — the honeypot field in the form deters
basic bots, but isn't hard security. That's an acceptable tradeoff for a
personal wedding site; skip it if you'd rather not have an open write
endpoint at all.

## Wishes slideshow ([wishes.html](wishes.html))

A standalone, full-page display at `/wishes.html` — meant for a TV or
monitor at the venue — that cycles through the same `wishes` collection one
at a time: a photo card (reusing the gallery placeholder seeds) crossfades on
the left, the wish text crossfades on the right, same cream background and
floating petal/spark decoration as the rest of the site. It's read-only (no
form); a "View as full-screen slideshow" link from the `#wishes` section on
the main page points here. It isn't localized via `/en/`/`/bm/` like the main
page — it always renders in English. `vite.config.ts` builds it as a second
Rollup entry alongside `index.html`; in dev, visit `/wishes.html` directly.

## Deploying

### GitHub Pages

A workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
builds and deploys `dist/` to GitHub Pages automatically on every push to
`main`. In the repo settings, set **Settings → Pages → Source** to
**GitHub Actions** once, and pushes will deploy automatically.
