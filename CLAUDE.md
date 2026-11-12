# Expo AR Demo: Project Context and Rules

## What this is
A mobile web experience for an expo booth. The company does AI automation and optimization for any kind of business (not only construction). A printed standing banner carries one QR code. Visitors scan it, point their phone at documents printed on the banner, and watch an AR animation turn a messy document into a clean, organized result. At the end, they scan their own business card and it turns into a constellation that joins a shared "sky" of every visitor's constellation.

Audience: busy, professional business owners and managers. Tone: calm, polished, credible. No games, no jokes, no gamified language.

Company name is NOT decided. Use a placeholder `BRAND_NAME` and `BRAND_NAME_FA` in one config file (`config.js`) so it can be swapped in one place. Same for contact links (Telegram ID, phone).

## Hard constraints (read before writing any code)
1. **No foreign APIs, no AI API calls, no VPN dependence.** Everything must work in Iran on domestic hosting (Parspack VPS) and on weak expo mobile data.
2. **No CDN links.** Self-host every library, font and asset in the project folder. Vendor the files into `/vendor`. If a package cannot be installed, tell me exactly which file to download and where to put it.
3. **HTTPS is required** (phone browsers block the camera on HTTP). Provide deployment notes for Let's Encrypt or a Parspack certificate.
4. **Page weight:** the first load (shell, before AR assets) under about 1.5 MB. Load AR libraries and tracking files only when the visitor taps a scan tile.
5. **Farsi-first, right-to-left.** Self-hosted Vazirmatn font. English as a secondary line where useful. Use proper RTL layout (`dir="rtl"`, logical CSS properties). Persian digits in the UI.
6. **No app, no login, no account.** Plain web page.
7. **Honesty rule (important):** the four banner documents are fixed, so their results are pre-written and bundled into the page. This is a demonstration of a workflow, NOT live AI. Never write UI text that claims live processing, "analysis", "extraction" or "reading". The visitor's own card is never read or understood, only transformed as an image. Use verbs like "reorganized", "assigned", "mapped". No percentages or savings claims anywhere.

## The experience (in order)
1. **Intro screen:** short headline, one line of explanation, a button to begin.
2. **Five scan tiles** with a progress marker on each (filled when done):
   - Doc 1: handwritten-style order page and shift table. Animation: scribbles lift off the paper, sort into rows, lock into a clean table over the page, one shift conflict pulses. Result card shows the clean table and the flagged conflict.
   - Doc 2: workspace photo/illustration. Animation: labels appear over parts of the image. Result card is a daily status report written with cautious wording ("appears to", "approximately").
   - Doc 3: floor plan with printed dimensions. Animation: rooms highlight one by one with their areas. Result card lists rooms, areas, and a draft materials/equipment list.
   - Doc 4: delivery slip next to a supplier invoice. Animation: both documents' lines connect and one mismatch is flagged. Result card shows the discrepancy.
   - Doc 5: the company business card (the leave-behind). Animation: name resolves out of scattered pieces, then a "save our contact" button downloads a vCard.
3. **After the documents:** a combined operations summary, assembled from the completed scans.
4. **Visitor's own card:** a framing outline, one tap to capture. The photo breaks into particles, scatters, then settles into a real constellation, then resolves into the brand mark. Closing line: "Scattered becomes ordered" (Farsi primary). Button to save the result as an image.
5. **The sky:** a canvas page showing every visitor's constellation as a glowing cluster, with their own pulsing once. New ones appear live (polling every few seconds is fine).
6. **Contact step:** one button, "Send me this summary", asking for a Telegram ID or phone number. Optional separate button "Send us your card too" with a clear consent line.

## AR approach
- Use MindAR (image tracking) with three.js, self-hosted. Compile each document image into a MindAR target file and store it in `/targets`.
- Provide a **non-AR fallback** for every scan: if the camera is denied, AR fails, or the phone is old, a "play on a still image" button runs the same animation on the document image.
- Provide a "view sample result" button as a last fallback on every tile.
- Documents must be designed for tracking: dense, varied detail, subtle border pattern or logo, no large blank areas. Print is matte.

## Documents and print files
Generate the print-ready document images yourself with a script (SVG to PNG), at real print size and 300 DPI where possible, in `/print`. Put the handwritten-style text in a clean handwriting-like Persian font if one is available locally; otherwise leave a clearly marked area and tell me to replace it with a real handwritten scan. Keep all content fictional and generic (no real company or person names).

## Card to constellation
- Hand-code coordinates for 12 to 15 real constellations in a local data file. Do not depend on any external dataset.
- Choose the constellation deterministically from measurable properties of the card photo (dominant hue and average brightness). Same card gives the same constellation.
- Particle count about 1500 to 2500; detect low-end devices (frame-time check) and reduce automatically.
- Constellation names shown in Farsi and English. Mark the Persian names as "verify against a Farsi source" in a comment, and list them in the final report so I can check them.
- All of this runs on the phone. The card photo is never uploaded unless the visitor presses "Send us your card too".

## The sky (backend)
- A tiny Node.js server (no heavy framework) on the same VPS. Store one small record per scan: constellation id, position in the sky, color, timestamp. **No photos, no card contents.**
- Endpoints: add a star, list stars (with a "since" parameter), save a lead (contact and which scans were completed), optional card upload.
- Rate limit per IP (about one star per minute per phone) and a maximum body size. Validate all input. Escape anything shown back.
- Persist to SQLite or an append-only file, whichever needs the fewest dependencies on a plain VPS. Say which you picked and why.
- If the server is unreachable, the visitor's own constellation still plays and the star is queued locally to send later. Never fill the sky with fake stars as if they were visitors. A plain decorative background starfield is fine and must look different from visitor stars.

## Performance and robustness
- Test target: mid-range Android and iPhone from the last 4 to 5 years, on mobile data.
- Keep progress in `localStorage`, wrapped in try/catch (it can throw in private mode).
- Camera permission screen explains why the camera is needed, in plain Farsi.
- Handle orientation changes, camera denial, and slow connections without dead ends.

## How to work
- Build in this order, and stop after each step so I can test on my phone: (1) page shell, (2) Doc 1 end to end with AR and fallback, (3) Docs 2 to 5, (4) card-to-constellation, (5) sky server and page, (6) lead capture, (7) deployment notes and a test checklist.
- Keep code simple and commented. No build step unless necessary; prefer plain ES modules.
- Put all visible text in one `strings.fa.js` file so I can edit wording without touching logic.
- At the end of each step, tell me what to test, and anything you could not do (for example, a file I must download).
- Do not claim something works until you have run it. If you can't test it (camera, AR), say so.

---

# Decisions that override the spec above (from the user, after step 2)
- **Farsi only.** No English words anywhere a visitor can see (UI and printed documents).
- ~~Four banner documents, not five.~~ Superseded: our business card is back as Doc 5 (see below).
- **No tiles, no explanations.** Intro → one tap opens the camera → the visitor points at any of the four documents and it is recognised. All four are in ONE tracking file (`targets/banner.mind`).
- **No camera-free mode for visitors.** No "play on a still image", no visible "view sample result". Visitors only scan the banner and then see the result.
- **Hidden booth-only samples:** tapping the logo 5 times within 3 s opens a menu of the four sample results (for staff).
- **Camera denied/unavailable:** one plain Farsi screen explaining how to allow the camera, suggesting the in-app-browser fix, and asking the visitor to ask our staff. A retry button.
- **Every result card** keeps a short Farsi line saying it is a demonstration prepared in advance.
- **Steadiness matters:** the overlay must stay locked to the paper (see "Steadiness" below).
- **Official-looking forms** (user request, after rejecting found templates): Doc 1 is «درخواست خرید و برنامهٔ شیفت» and Doc 4 is «صورتحساب فروش کالا» + yellow «رسید تحویل کالا به انبار», built from the official-form helpers in `tools/print/lib.js` (formHeader, sectionBar, signatureBoxes, roundStamp, rectStamp, sideStrip, edgeTab, punchHoles, qrBlock). No decorative corner marks on these two; their tracking comes from the dark header cell, section bars, stamps, side strip, tabs and QR (blank forms alone: 30 points each).
- **Real handwriting and a real photo** (user request). Content stays general (not construction); the Doc 2 photo will be a construction site (the user's 4th sample photo, the concrete frame with the pump truck, pending the original file and permission). Docs 1 and 4 are printed as blank forms (Doc 3 floor plan stays printed for now), filled in by hand, photographed, and imported; Doc 2 uses the user's own workplace photo. Until those files arrive, the font-based versions are used.
- Each document needs ≥ 25 tracking points on the 128 px keyframe and must never be confused with another (both checked; see Tooling).

# Implementation notes (kept up to date by Claude between sessions)

## Status
- Steps 1–4 are built (shell, five documents incl. our business card, one combined camera screen, own-card constellation flow with save image / replay link / remembered on phone). Waiting for the user's phone test. Next, only when the client asks: step 5 (sky server + page), then step 7 (deployment notes + phone test checklist). Step 6 (lead capture) is dropped.
- Hosting for phone tests: GitHub Pages (static, HTTPS). All paths are relative; `.nojekyll` is present.

## Layout
- The project root is the web root. Do not deploy `/tools`, `/node_modules`, `/print` (the dev server already refuses to serve `/tools` and `/node_modules`).
- `js/config.js` holds brand/contact placeholders. `js/strings.fa.js` holds all UI text.
- The text printed on a document belongs to the artwork and lives in `js/docs/docN.data.js`, the single source for both the print generator and the animation.
- Per document: `docN.data.js` (content and mm coordinates), `docN.scene.js` (three.js timeline `update(t)`, built with `js/scene-kit.js`), `docN.result.js` (DOM result card), `docN.js` (module entry). Doc 1 also has `doc1.layout.js` (GENERATED piece boxes).
- `js/docs/targets.js` holds the target order inside `targets/banner.mind`; `js/docs/index.js` maps it to the doc modules.
- `js/ar.js` runs MindAR with one anchor per document, creates a document's scene when it is first seen (and disposes the previous one), and smooths the pose (see Steadiness).
- `js/app.js`: intro → camera screen → result overlay; progress dots (tap a filled dot to see that result again); hidden booth menu; camera-help screen.

## Tooling (Node 22, Playwright + Chromium preinstalled on the dev machine)
- `npm install --ignore-scripts` (the `canvas` dependency of mind-ar is not needed; skip its build).
- `npm run vendor`: copies three/MindAR/fonts into `/vendor` and `/fonts`, rewriting MindAR's bare `"three"` imports to relative paths (no import map needed, so it works on older iOS).
- `npm run print`: renders `print/docN.{png,pdf,svg}`, `img/docN.jpg`, `js/docs/docN.layout.js` in headless Chromium.
- `npm run targets`: compiles all four into `targets/banner.mind` with MindAR's own compiler in headless Chromium (from 900 px copies), then `tools/prune-target.mjs` drops matching levels wider than 720 px (phone camera frames are ~640×480, so those levels are never used; saves ~25 %).
- `npm run inspect`: feature counts per document and scale (keyframe 1 is used for tracking; keep ≥ 25).
- `npm run serve`: zero-dependency static server with gzip (`--cert/--key` for HTTPS).

## Lessons learned
- **MindAR 1.2.5 needs three r160** (it imports `sRGBEncoding`, removed in r162). The resulting `outputEncoding` console warning is harmless.
- **Tracking runs on a 128 px wide copy of the target** (tracking keyframe 1, similarity threshold 0.8). Fine handwriting vanishes at that size; the first Doc 1 design had only 5 tracking points and could not track. Every document needs bold, high-contrast, non-repeating shapes at a large scale (dark header band, unique corner marks, tabs, stamp, sticky note, heavy grid). Aim for at least 25 points on keyframe 1 (`inspect-target`). Doc 1 now has 26.
- Points concentrate on dark blobs with corners; thin lines, light tables and fine QR modules give almost nothing at 128 px, and repeated rows are rejected as look-alikes. Fixes that worked: dark filled boxes (totals, tabs, badges), unique pictograms, stamps, a deeper paper colour for the slip, corner marks that differ per document.
- Confusion check: photograph each document (perspective-warped, noisy) and match it against every target; expect only its own. See the steadiness/confusion notes in README.
- AR can be tested headlessly: feed a `.y4m` of the document (perspective-warped) to Chromium with `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=…` plus `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- MindAR swallows getUserMedia errors, so `ar.js` probes the camera itself first to tell "denied" apart from "unsupported".

## Steadiness (measured, headless Chromium with a noisy fake camera; ~11 MindAR updates/s)
Settings live at the top of `js/ar.js` plus `TRACKING_KEYFRAME` in `tools/vendor.mjs`.

| Setup | Frame-to-frame shake | Drift around rest | Lag behind real movement |
|---|---|---|---|
| Before (128 px tracking, filter 0.0001/10, no lock) | ~3.0 px | ~3.5 px | 0 ms |
| 128 px tracking + lock | ~1.5 px | ~2.7 px | ~60 ms |
| **Now: 256 px tracking + lock (0.9 %, 0.9°, slow 0.5/s, fast 25/s), filter 0.001/1, warmup 6, miss 10** | **~0.7 px** | **~1.2 px** | **~70–80 ms** |

- 128 px tracking is limited by its own resolution (1 px there ≈ 3 px on screen), so smoothing alone could not fix the drift.
- The lock holds the overlay while the change stays within 0.9 % of the page width / 0.9°, and follows quickly beyond that. During continuous movement the overlay trails by up to about 1 % of the page width (a few pixels), then catches up.
- missTolerance 10 keeps the overlay up through brief tracking drops (~0.3 s at 30 fps) instead of blinking; warmup 6 adds ~0.05 s before it first appears.
- Test hooks: `window.__AR_TUNE` (override settings) and `window.__AR_DEBUG` (pose log) are only set by automated tests.

## Real handwriting pipeline
- `npm run print` = `tools/make-print.mjs` (generated versions + `print/templates/docN-blank.pdf` forms + `docN-example.pdf` to copy from + combined `1-PRINT-these-blank-forms.pdf` / `2-COPY-from-these-examples.pdf` + `docN-fields.json`) then `tools/import-scans.py`.
- `tools/print/lib.js` `MODE.template` + `ink(fn)`: in blank-form mode pen work is drawn then removed, so random numbers (wobbly grid, barcode, border) are identical between blank and example. Keep using `ink()` / `handLine()` for anything written by hand.
- `tools/import-scans.py` (Python, `pip install opencv-python-headless`): `scans/docN.jpg` → SIFT + RANSAC homography onto the blank → ECC refine → lighting flattened → ink = darker than the printed form (9 px dilation tolerance) → ink composited over the clean form → `print/docN.png/.pdf`, `img/docN.jpg`; for Doc 1 it re-measures `doc1.layout.js` by assigning word blobs to the nearest expected field. Tested with simulated phone photos: mean difference vs original < 1/255 (docs 1, 4); 32/33 Doc 1 pieces in place.
- Doc 2: `scans/photo.jpg` is centre-cropped into the photo area by make-print. **After a real photo arrives, `SPOTS` in `doc2.data.js` (and the report wording) must be rewritten to match what is actually in the photo.**
- After importing real scans: `npm run targets`, `npm run inspect` (≥ 25 points each) and rerun the confusion test before shipping.
- The user uploads photos to their GitHub repo; fetch with the add_repo tool, then copy to `scans/` as doc1.jpg, doc3.jpg, doc4.jpg, photo.jpg.

## Status after importing the real files
- `scans/doc1.jpg`, `scans/doc4.jpg` (user's handwriting, forms printed in black and white, blue ballpoint) and `scans/photo.jpg` (construction site, used with the owner's permission; only 1000x750, so Doc 2 shows it full-width at about 140 DPI) are imported. Source: the user's repo holidays-cloud/expo-ar-demo (files uploaded to its root).
- `import-scans.py` now also requires ink to be clearly blue or red (`pen_colour_weight`), because a black-and-white print makes printed parts darker than the colour form; falls back to darkness only for a black pen. Fragments lying ≥ 85 % on printed lines are dropped.
- Doc 2 is now an official «گزارش تصویری روزانهٔ کارگاه»; SPOTS/REPORT describe the real photo (pump, mixer truck, scaffold, sand piles; follow-up: open slab edges without guardrail).
- Tracking points (256 px keyframe): doc1 33, doc2 42, doc3 36, doc4 33. Confusion test: 0 wrong, 0 missed.

# Decisions, round 4 (override everything above)
- **No lead capture, no contact forms, no combined operations summary.** Do not build them. (Spec step 6 and the "after the documents" summary are dropped.)
- **Doc 5 = our business card**, a leave-behind scanned later at home (must work whenever the site is online). A6 portrait 105 x 148 mm, Farsi only, brand/phone/site from `js/config.js`, real QR to `CONFIG.SITE_URL` (currently the GitHub Pages test address; replace before printing). In `targets/banner.mind` as target 4. Animation: pieces start scattered and resolve into place; then three buttons: save contact (vCard built on the phone), contact (phone or Telegram per `CONFIG.CONTACT_PRIMARY`), «کارت خودتان را هم امتحان کنید».
- **Own-card flow** (spec step 4) is built: `js/owncard.js` (camera, framing, capture, deterministic choice), `js/constellations.js` (15 hand-coded constellations, Persian names to verify), `js/sky-anim.js` (2D canvas particles, adaptive count, poster). Entry points: camera-screen pill, under every result card, after the card animation, `?mode=card`. Personal replay link `?c=a.<index>.<hue>.<lum>` (base 36, all data in the link); remembered in localStorage (`expoar.constellation.v1`) so the intro offers «صورت فلکی شما». Nothing is uploaded. Wording: "assigned" (نسبت داده شد), never "read"/"analysed".
- **Preload:** after the intro shows, the AR libraries, `targets/banner.mind` and the document modules download in the background (skipped with Save-Data).
- **AR text size:** short labels/callouts (Docs 2–4) are on-screen HTML labels at 15/13 px pinned to page points (`ar.js` label layer: kept inside the screen, hidden rather than overlapped; scenes declare `labels` + `labelAlpha(t)`). Doc 1's clean table stays on the paper with 7–9 mm text (~13–17 px when the A4 fills a 390 px screen) and grows/shrinks (0.75–1.6x) to fill the screen after the pieces land; in landscape it asks to hold the phone upright. Do not shrink text below these sizes; shorten or show fewer labels instead.
- **Booth menu** (5 taps on the logo) also plays our card's animation on screen without a camera (`openCardDemo` in app.js), then the three card buttons.
- **Black-and-white printing is fine:** grey versions of all five documents were recognised (0 wrong, 0 missed) and tracked (Doc 4, card) in tests.
- **Sky server (spec step 5): not started; wait for the client.**

# Business card, round 5 (client's vision; overrides the Doc 5 description above)
- **Front = scattered chaos, back = QR only.** The back's QR opens `SITE_URL?from=card` -> a landing screen («اسکن روی کارت» / «کارت ویزیت خودتان را امتحان کنید»). The front is the AR target.
- **Two variants, the client will choose one later** (both are in `targets/banner.mind` for now; remove the other from `TARGET_ORDER`, `docs/index.js`, strings and the booth menu once chosen):
  - **doc5 "scattered pieces":** the brand's own pieces (logo dots/bars, name words, tagline words, icons, constellation stars, gold shards) printed scattered and rotated among stars, nebulas and colour shards. Animation: the chaos calms, the pieces lift and fly (curved paths, star trails, dust galaxy) to their places; logo bloom + shockwave; shards snap; finale glint.
  - **doc6 "out of the sky":** the front is only a night sky (Milky Way, nebulas, spiked stars), nothing distinguishable. Animation: the printed stars glow, particles of light rise from them (`STARS` in `doc6.layout.js`) and form every shape (targets sampled from the atlas), each shape turns crisp on arrival; same bloom/shockwave/finale.
- **On the assembled card:** logo, name, «از پراکندگی تا نظم», what we do, and three **tappable links pinned on the card** (phone `tel:`, Telegram `t.me/`, website) via the ar.js label layer (`href` + `center` labels); below: «ذخیرهٔ مخاطب» (vCard) and «کارت خودتان را هم امتحان کنید». Where there is no AR (booth demo, contact card) the links are buttons.
- **Pipeline:** `tools/print/doc5.print.js` (`buildCard`, variants 'pieces'/'sky'; modes front/back/ordered/atlas) -> `make-print` writes `print/docN.pdf` (2 pages: front, back), `print/docN.png`, `print/docN-back.png`, `img/docN.jpg` (front, the target), `img/docN-ordered.jpg`, `img/docN-atlas.png`, `js/docs/docN.layout.js` (ELEMENTS with ord/scat/atlas, STARS). Shared effects: `js/docs/card-fx.js`. Rebuild: `npm run print:card` (doc5) or `node tools/make-print.mjs doc6`, then `npm run targets`.
- Tracking points: doc5 42, doc6 42; confusion test with all six documents (colour and black-and-white): 0 wrong, 0 missed.
- Booth menu (5 taps on logo) has a demo for each card variant.

# Round 6 (client feedback; overrides the above where they differ)
- **Contact rows are part of the card artwork** (gold-outlined chips with the phone, Telegram, website, drawn inside the card at card scale; element kind `row`, group `rows`, `noFront`, so the printed front is unchanged). In AR they slide out of their icons; then **invisible tap areas** (`hit` labels in `ar.js`: a rectangle in page units, projected to a screen box, class `.ar-hit`) sit exactly over them. The big HTML link pins are gone.
- **Both card animations share one engine,** `js/docs/card-scene.js` (`createCardScene`, variant `pieces` for doc5 / `sky` for doc6; `doc5.scene.js`, `doc6.scene.js` are thin wrappers). doc6 now really flies every piece: each launches from a printed bright star (`STARS`) as a point of light with a comet trail, growing and turning on its way to its place; same bloom, shockwave, constellation lines, dust galaxy and finale as doc5.
- ~~**Own card = the visitor's actual card is taken apart and rebuilt**~~ (replaced in round 7) (the client found the constellation version unimpressive: any photo gave the same result). `js/card-rebuild.js`: levels/saturation clean-up, background colour from the edges, everything that stands out from it grouped into pieces (connected blobs, letters joined into words; fallback to 5x3 tiles when fewer than 4 pieces), background filled in under the pieces (plate). Animation ~9.4 s: sweep, gold outlines around the pieces, burst into a galaxy of the card's colours while the pieces drift and turn around the screen, the galaxy flows back into the plate inside a gold frame, pieces land largest-first with flashes and gold lines joining them, finale glint, brand mark. Buttons: save image (1080x1350 poster of the clean card), replay, another card, back to scanning. The card photo (JPEG, ~60 KB) is kept only in this phone's localStorage (`expoar.mycard.v1`) so the intro offers «کارت شما»; nothing is uploaded. The personal `?c=` link and the 15 named constellations were removed (old files in `tools/build/retired/`); old `?c=` links open the capture screen. Wording: «کارت شما، دوباره چیده شد» (never "read"/"analysed").

# Round 7 (client feedback; overrides the own-card part of round 6)
- The "take apart and rebuild" own card was rejected (start = end, no payoff). Previews of a constellation, a hologram and a mix were made; **the client chose the constellation, no hologram.**
- **Own card = a constellation of the card's own design** (`js/card-stars.js`; helpers in `js/card-util.js`). Image processing only: levels clean-up, background colour from the edges, Otsu threshold -> ink mask (outer 3 % ignored), up to ~5200 stars sampled on the ink (edges favoured), each in the pixel's hue made star-bright (grey/black/dark ink -> warm white). Timeline (10.5 s): light sweep right-to-left lights the stars and the paper drifts away; burst into a tilted two-armed galaxy that spins; stars spiral back into the exact design; faint light-drawn design under them; bright anchor stars on the biggest parts joined by gold lines (minimum spanning tree); star-dotted frame; glint; «کارت شما، در آسمان»; brand mark. Slow phones draw every 2nd/3rd star (frame-time check). Save image = the finished constellation 1080x1350 («کارت من، در آسمان»).
- Retired (in `tools/build/retired/`): `card-rebuild.js`, `card-holo.js`, `card-mix.js`, the preview harness. Each star part has a layer `depth` kept in the data (from the mix preview), unused now.
