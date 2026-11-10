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
- **Four banner documents, not five.** Doc 5 (our business card) is no longer a scan target.
- **No tiles, no explanations.** Intro → one tap opens the camera → the visitor points at any of the four documents and it is recognised. All four are in ONE tracking file (`targets/banner.mind`).
- **No camera-free mode for visitors.** No "play on a still image", no visible "view sample result". Visitors only scan the banner and then see the result.
- **Hidden booth-only samples:** tapping the logo 5 times within 3 s opens a menu of the four sample results (for staff).
- **Camera denied/unavailable:** one plain Farsi screen explaining how to allow the camera, suggesting the in-app-browser fix, and asking the visitor to ask our staff. A retry button.
- **Every result card** keeps a short Farsi line saying it is a demonstration prepared in advance.
- **Steadiness matters:** the overlay must stay locked to the paper (see "Steadiness" below).
- Each document needs ≥ 25 tracking points on the 128 px keyframe and must never be confused with another (both checked; see Tooling).

# Implementation notes (kept up to date by Claude between sessions)

## Status
- Steps 1–3 are built (shell, all four documents with print, animation and result card, one combined camera screen). Waiting for the user's phone test. Next: step 4 (card to constellation).
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
