# Expo AR demo: handoff report

Status: spec steps 1–4 done and verified in headless tests (five documents incl. our business card; own-card constellation flow). Step 5 (sky server) not started — wait for the client. Lead capture and the combined summary are dropped.
Read this together with `CLAUDE.md` (original spec, later decisions, lessons learned) and `README.md`.

---

## 1. What the product is (short)
A Farsi-only, right-to-left mobile web page for an expo booth (the company's name is not decided; placeholders are in `js/config.js`). Visitors scan one QR code on a printed banner, open the camera, and point it at any of **four documents printed on the banner**, or at **our business card** (handed out, scanned later at home). Each document gets an AR animation that turns a messy paper into an organised result, then a result card. Everything is pre-written: it is a **demonstration of a workflow, not live AI**, and every result card says so.

Hard constraints still in force: works in Iran on domestic hosting with no foreign APIs or CDNs (all libraries are self-hosted), HTTPS, a small first load, Farsi with Persian digits, no app or login, and honest wording (never "analysis / reading / extraction"; no percentages or savings claims).

## 2. Decisions the client made after the original spec (these override it)
- **Farsi only.** No English or Latin words anywhere a visitor can see, including on the printed documents. (Placeholders such as `BRAND_NAME_FA` show as «نام برند».)
- **Five documents.** Doc 5, our business card, was dropped once and then brought back as a leave-behind scan target (see section 3).
- **No tiles, no explanations.** Intro → one button opens the camera → the visitor points at any document → it is recognised. All four documents are in **one tracking file**.
- **No camera-free mode for visitors.** The "play on a still image" and "view sample result" buttons were removed.
- **Hidden booth-only samples:** tap the logo 5 times within 3 seconds to open a menu of the four sample results.
- **Camera denied or unavailable:** one plain Farsi screen with how to allow the camera, a note about in-app browsers (Telegram/Instagram), "ask our staff", and a retry button.
- **Every result card** ends with «این یک نمایش است؛ نتیجهٔ این برگه از قبل آماده شده است.»
- **Steadiness matters:** the overlay must stay locked to the paper.
- **Real handwriting and a real photo.** The content stays general business (not construction), except Doc 2, which is a real construction-site photo used **with the owner's permission** (the client confirmed). The source was jnarak.ir.
- **Official-looking forms:** the client rejected found templates, so Docs 1, 2 and 4 are custom designs styled like Iranian official forms.
- **The floor plan (Doc 3) stays printed;** maybe hand-drawn later.

## 3. The four documents (all A4 portrait; print files in `print/`)
| # | Document | Story in the animation | Result card |
|---|---|---|---|
| 1 | «درخواست خرید و برنامهٔ شیفت» (official internal form), **real handwriting** | handwritten lines lift off, fly into a clean table that locks over the page, one shift conflict pulses (Reza on leave Tuesday but scheduled Tuesday morning) | clean order table + shift table with the conflict flagged |
| 2 | «گزارش تصویری روزانهٔ کارگاه» with the **real site photo** | labels appear on the pump, mixer truck, scaffold, sand piles; one cautious warning (open slab edges without guardrail) | daily site status report in cautious wording ("appears to", "about") |
| 3 | Floor plan, printed dimensions (CAD-style) | rooms highlight one by one with their areas, then the total (240 m²) | rooms, areas, draft materials/equipment list |
| 4 | «صورتحساب فروش کالا» (printed) + yellow «رسید تحویل کالا به انبار» with **real handwriting** | invoice lines connect to receipt lines (different order); 5 ticked, 1 mismatch flagged: cartons billed 40, received 36 | discrepancy (4 short, 112,000 tomans), the receipt's note «یک بسته جدا میاد», "hold payment for this line" |

| 5 / 6 | **Our business card**, A6 portrait 105 × 148 mm, two variants (client will choose): doc5 front = brand pieces scattered among stars; doc6 front = only sky. Back = QR only (`SITE_URL?from=card`) | doc5: pieces lift and fly into place; doc6: particles rise from the printed stars and form every shape; both: logo bloom + shockwave, finale glint, then tappable phone/Telegram/website links pinned on the card + «ذخیرهٔ مخاطب» + «کارت خودتان را هم امتحان کنید» (see CLAUDE.md 'round 5') | contact card |

All names and numbers are fictional; each sheet carries «نمونهٔ نمایشی».

**Own-card flow:** framing + one-tap capture → photo becomes ~1400–2200 particles (halved automatically if frames > 24 ms) → scatter → one of 15 hand-coded constellations, chosen from the photo's dominant hue (6 families × 2 brightness) or, for white/grey/black cards, brightness only (3) → brand mark + «از پراکندگی تا نظم» → save image (1080×1350 PNG), personal replay link `?c=…`, remembered on the phone. Reachable from the camera screen, every result card, the card animation and `?mode=card` (print `print/qr-own-card.png` on the banner).

## 4. Where things are
```
index.html, css/app.css            shell (RTL, Vazirmatn self-hosted)
js/config.js                       brand/contact placeholders, booth tap count
js/strings.fa.js                   ALL visitor-facing UI text (Farsi only)
js/app.js                          intro → camera screen → result overlay; progress dots; booth menu; camera-help screen
js/ar.js                           MindAR, one anchor per document, scene created when first seen, pose smoothing ("lock")
js/scene-kit.js                    shared three.js helpers (planes, cards, ribbons, rings, label painter)
js/docs/targets.js                 order of documents inside targets/banner.mind
js/docs/docN.data.js               the document's content + millimetre coordinates (shared by print AND app)
js/docs/docN.scene.js / .result.js animation timeline update(t) / DOM result card
js/docs/doc1.layout.js             GENERATED: where each handwritten piece really is (from the scan)
targets/banner.mind                ONE MindAR file with all 4 documents
img/docN.jpg                       web copies of the print files (used as AR textures)
print/docN.pdf/.png                FINAL print files (300 DPI)
print/templates/                   blank forms to fill by hand + readable examples (Vazirmatn) + fields json
print/assets/doc2-photo.jpg        prepared photo crop
scans/                             client's photos of the filled forms + the site photo (inputs)
vendor/, fonts/                    self-hosted three r160, MindAR 1.2.5 (patched), Vazirmatn, Aref Ruqaa
tools/                             build scripts (not part of the website), tools/tests/ automated checks
```

## 5. How to rebuild (Node 22, Playwright Chromium, ImageMagick, pdfunite; Python 3 with opencv-python-headless)
```bash
npm install --ignore-scripts      # mind-ar's canvas dependency is not needed
npm run vendor                    # copy libs; patches MindAR (bare "three" imports, tracking keyframe 0)
npm run print                     # make-print.mjs (print files, templates, examples) + import-scans.py (real handwriting)
npm run targets                   # compile targets/banner.mind, then prune matching levels > 720 px
npm run inspect                   # tracking points per document (keep >= 25 on keyframe 0)
npm run serve                     # local static server with gzip (--cert/--key for https)
```
Any change to a document's content or artwork means: `npm run print && npm run targets`, rerun the checks, and **reprint the banner**, because the camera matches against the exact artwork.

### Real-handwriting pipeline (`tools/import-scans.py`)
Phone photo of a filled form → SIFT + RANSAC homography onto the blank form → ECC refine → lighting flattened → ink = darker than the printed form **and** clearly blue/red (the client's printer is black-and-white, so printed parts came out darker than the colour original) → fragments lying on printed lines dropped → ink composited onto the clean colour form → print/img files; for Doc 1 it also re-measures `doc1.layout.js`. Blank forms and examples share the same random numbers via `ink()` in `tools/print/lib.js` (important; keep using `handLine()`/`ink()` for anything drawn by hand).

## 6. Verified (headless Chromium, simulated camera; NOT a real phone)
- **Tracking points** (256 px keyframe; client asked for ≥ 25): doc1 33, doc2 42, doc3 36, doc4 33. Blank forms alone still ≥ 30.
- **Confusion test:** each document photographed at 3 angles (front/tilted/far, noise, blur) matched only itself: 0 wrong, 0 missed.
- **Full flow** for all four with a fake camera feed: found in ~3–4 s, animation plays, result card with the "prepared" note, back to camera, progress saved.
- **Steadiness** (still feed with sensor noise): frame-to-frame shake ~3.0 px → ~0.7 px; drift ~3.5 px → ~1.2 px; added lag ~70–80 ms. Settings are at the top of `js/ar.js`; details in CLAUDE.md "Steadiness".
- **GitHub Pages sub-path** (`/expo-ar-demo/`): every file loads (camera page, `targets/banner.mind`, fonts), nothing requested outside the sub-path, no errors.
- **Text:** no Latin words or Latin digits on any visitor screen.
- **Weight:** shell ~146 KB; first camera open ~1.6 MB gzipped (libraries ~0.6 MB + tracking file ~1.1 MB), then cached.

## 7. Not verified / known limitations
- **No real-phone results yet.** The camera, the tracking quality on real prints, iPhone Safari (completely untested) and performance on mid-range Android all need the client's feedback.
- **Doc 2 photo is low resolution** (1000×750 → ~140 DPI at full width). Prints acceptably at banner distance, soft up close. Ask the owner for the original camera file if possible; swap it into `scans/photo.jpg` and rebuild.
- Very faint ghost marks along a few table lines on Doc 1 (leftovers of the black-and-white print); barely visible.
- Overlay text on an A4 sheet is small on a phone; the result card is the readable version.
- iOS < 16.4 not a concern (no import maps used), but older WebGL1-only devices are untested.
- Hosting for tests is GitHub Pages (client's public repo `holidays-cloud/expo-ar-demo`; the client uploads zips through the GitHub website). Production should move to the Parspack VPS with HTTPS (step 7).

## 8. What is left
1. **Step 5, sky server + page** (only when the client asks): tiny Node server (no framework) on the same VPS; store constellation index, position, colour and timestamp only (no photos, no card contents); endpoints add star / list stars (since); rate limit (~1 star per minute per IP), body size limit, validation, escaping; SQLite or append-only file (say which and why); client-side offline queue; never fake visitor stars (a decorative background starfield is fine but must look different). The constellation code (`?c=` format in `js/owncard.js`) is the natural payload.
2. **Step 7, deployment notes** (Parspack VPS, nginx, Let's Encrypt or Parspack certificate) **and a phone test checklist.**
- **Dropped by the client:** lead capture / contact forms (step 6) and the combined operations summary.
- Before printing the business card: set the real `SITE_URL`, `BRAND_NAME_FA`, `PHONE`, `PHONE_DISPLAY_FA` in `js/config.js`, then `npm run print:card`, `npm run targets`, `npm run inspect`, rerun the confusion test, reprint.
- The client wants to stop after each step to test on the phone. Explain things simply; the client is not technical.

## 9. Gotchas
- MindAR 1.2.5 needs **three r160** (imports `sRGBEncoding`); the `outputEncoding` console warning is harmless.
- Tracking quality depends on bold, high-contrast, non-repeating shapes at large scale; thin lines, light tables and repeated rows give almost no points. Check with `npm run inspect` after any artwork change.
- The GitHub web uploader takes at most 100 files per upload (the zip is 94 files now).
- Test hooks `window.__AR_TUNE` / `window.__AR_DEBUG` exist only for automated tests.
- Automated checks: `tools/tests/` (see its README).
