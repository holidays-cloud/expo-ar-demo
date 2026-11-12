# Expo AR demo

Plain static site (ES modules, no build step) plus Node scripts in `tools/` that produce the print files and the tracking file. The full spec and the later decisions are in `CLAUDE.md`.

## What the visitor sees
1. Intro: title, one line, a button that opens the camera.
2. One camera screen. Pointing at any of the four banner documents plays its animation on the paper. Four dots at the top fill in as documents are done; a filled dot reopens that result.
3. After an animation, a "دیدن نتیجه" button opens the result card, which always says it is a demonstration prepared in advance. "اسکن برگهٔ بعدی" returns to the camera.
4. If the camera is denied or unavailable: one plain screen with how to allow it, what to do inside Telegram/Instagram, and "ask our staff".

5. **Our business card** (A6, two variants to choose from: Doc 5 "scattered pieces", Doc 6 "out of the sky"). Front = scattered night sky (scan it), back = QR only (opens a screen: scan the card or try your own). When scanned, everything assembles into the ordered card; its phone / Telegram / website rows are tappable, plus «ذخیرهٔ مخاطب».
6. **Own card → constellation of its own design:** from the «کارت شما» button on the camera screen, under every result card, after the card animation, or the link `?mode=card` (QR in `print/qr-own-card.png`). The card's logo, name and lines turn into stars, swirl into a galaxy and come back as the card drawn in stars with gold lines. Save image, replay; remembered on the phone only.

**Booth staff only:** tap the logo 5 times within 3 seconds to open the sample results and the business-card animation (no scanning needed).

## Print
`print/doc5.pdf` / `.png` is the business card: **A6 portrait, 105 × 148 mm, 300 DPI**, trim size without bleed (the dark top and gold bands touch the edges: ask the print shop to add 2–3 mm bleed, or tell me and I will export a bleed version). `print/qr-own-card.png` (opens `?mode=card`) and `print/qr-site.png` are separate QR codes for the banner. Before printing the card, set the real address, brand name and phone in `js/config.js`, then `npm run print:card && npm run targets`.

`print/doc1.pdf` … `print/doc4.pdf` (vector) or the `.png` files (2480 × 3508 px, 300 DPI) are A4 portrait. They can be printed larger on the banner if the proportions stay the same. Use matte material. Reprint whenever the artwork changes, because the tracking file must match the print.

## Real handwriting and photo
1. Print `print/templates/1-PRINT-these-blank-forms.pdf` at 100 % (no "fit to page") and fill it in by hand, copying `2-COPY-from-these-examples.pdf`.
2. Photograph each filled page (whole page in view) and save as `scans/doc1.jpg`, `scans/doc3.jpg`, `scans/doc4.jpg`; your workplace photo as `scans/photo.jpg`.
3. `pip install opencv-python-headless`, then `npm run print`, `npm run targets`, `npm run inspect`.

## Rebuild after changing a document
```bash
npm install --ignore-scripts
```
```bash
npm run vendor
```
```bash
npm run print
```
```bash
npm run targets
```
```bash
npm run inspect
```
`inspect` must show at least 25 points on "keyframe 1" for every document.

## Test on a phone
Upload everything except `node_modules/` and `tools/build/` to GitHub Pages (or any HTTPS host). See the step-by-step guide given in the chat, or `npm run serve` for local testing (camera works on `localhost`).

## Steadiness
See the "Steadiness settings" block at the top of `js/ar.js`; each value has a comment explaining its trade-off.
