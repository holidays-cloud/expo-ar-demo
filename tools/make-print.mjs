// Generates the print files and web images for the banner documents.
//   npm run print            (all documents)
//   node tools/make-print.mjs doc1
// Output per document:
//   print/<doc>.png   A4 at 300 DPI (2480 x 3508 px) for the printer
//   print/<doc>.pdf   A4 vector PDF (text stays sharp)
//   print/<doc>.svg   editable source (fonts referenced from ../fonts)
//   img/<doc>.jpg     1240 px wide copy for the still-image mode and AR textures
//   js/docs/<doc>.layout.js   measured positions of each handwritten piece (mm)
// Uses the Chromium + Playwright that are installed on the machine.
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createStaticHandler } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!docs.length) docs.push('doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc6');
// Documents that are filled in by hand get a blank form + a filled example for the writer.
const HANDWRITTEN = ['doc1', 'doc4']; // add 'doc3' to hand-draw the floor plan later
// Doc 2 uses a real photo when scans/photo.jpg exists (prepared here with ImageMagick).
const PHOTO_SRC = join(root, 'scans', 'photo.jpg');

const server = createServer(createStaticHandler(root, { allowTools: true }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
mkdirSync(join(root, 'print'), { recursive: true });
mkdirSync(join(root, 'img'), { recursive: true });
mkdirSync(join(root, 'print', 'templates'), { recursive: true });
mkdirSync(join(root, 'print', 'assets'), { recursive: true });
let photoParam = '';
if (docs.includes('doc2') && existsSync(PHOTO_SRC)) {
  // Crop as set in doc2.data.js (cuts the empty sky), size it for 300 DPI, gentle sharpening.
  const { PHOTO, PHOTO_CROP: C } = await import('../js/docs/doc2.data.js');
  const pw = Math.round(PHOTO.w / 25.4 * 300), ph = Math.round(PHOTO.h / 25.4 * 300);
  execFileSync('convert', [PHOTO_SRC, '-auto-orient', '-crop', `${C.w}x${C.h}+${C.x}+${C.y}`, '+repage', '-filter', 'Lanczos', '-resize', `${pw}x${ph}!`, '-unsharp', '0x1.2+0.6+0.02', '-quality', '90', join(root, 'print', 'assets', 'doc2-photo.jpg')]);
  console.log('doc2: using the photo from scans/photo.jpg');
}
if (docs.includes('doc2') && existsSync(join(root, 'print', 'assets', 'doc2-photo.jpg'))) photoParam = '&photo=1';

// Business card QR (opens the site) + a separate QR for the own-card link (?mode=card)
// that can be printed on the banner. Both addresses come from js/config.js.
{
  const QR = require('qrcode');
  const { CONFIG } = await import('../js/config.js');
  if (docs.includes('doc5') || docs.includes('doc6')) {
    // the card's back opens the site with ?from=card (a screen asking to scan the card or their own)
    const q = QR.create(CONFIG.SITE_URL + (CONFIG.SITE_URL.includes('?') ? '&' : '?') + 'from=card', { errorCorrectionLevel: 'M' });
    writeFileSync(join(root, 'print', 'assets', 'doc5-qr.json'), JSON.stringify({ size: q.modules.size, data: Array.from(q.modules.data) }));
  }
  const cardUrl = CONFIG.SITE_URL + (CONFIG.SITE_URL.includes('?') ? '&' : '?') + 'mode=card';
  await QR.toFile(join(root, 'print', 'qr-own-card.png'), cardUrl, { errorCorrectionLevel: 'M', width: 1200, margin: 4 });
  await QR.toFile(join(root, 'print', 'qr-site.png'), CONFIG.SITE_URL, { errorCorrectionLevel: 'M', width: 1200, margin: 4 });
}

try {
  for (const doc of docs) {
    const { PAGE } = await import(`../js/docs/${doc}.data.js`);
    const PW = Math.round(PAGE.w / 25.4 * 300), PH = Math.round(PAGE.h / 25.4 * 300); // 300 DPI
    const WW = 1240, WH = Math.round(WW * PAGE.h / PAGE.w);                            // web copy
    const render = async (width, height, template = false, readable = false, mode = '') => {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
      page.on('pageerror', (e) => console.error('[page error]', e.message));
      await page.goto(`${base}/tools/print/render.html?doc=${doc}${template ? '&template=1' : ''}${readable ? '&readable=1' : ''}${doc === 'doc2' ? photoParam : ''}${mode ? '&mode=' + mode : ''}`);
      await page.waitForFunction(() => window.__result, null, { timeout: 30000 });
      return page;
    };
    // 300 DPI print PNG
    let page = await render(PW, PH);
    const { pieces, svg } = await page.evaluate(() => window.__result);
    const front = (await page.evaluate(() => window.__doc5)) || {};
    const tmpPng = join(root, 'print', `${doc}.tmp.png`);
    await page.screenshot({ path: tmpPng, fullPage: false });
    execFileSync('convert', [tmpPng, '-units', 'PixelsPerInch', '-density', '300', join(root, 'print', `${doc}.png`)]);
    execFileSync('rm', [tmpPng]);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: join(root, 'print', `${doc}.pdf`), width: `${PAGE.w}mm`, height: `${PAGE.h}mm`, printBackground: true, pageRanges: '1' });
    await page.close();

    // Web image
    page = await render(WW, WH);
    await page.screenshot({ path: join(root, 'img', `${doc}.jpg`), type: 'jpeg', quality: 84 });
    await page.close();
    if (doc === 'doc5' || doc === 'doc6') {
      // back of the card (QR only): PNG + second page of the PDF
      page = await render(PW, PH, false, false, 'back');
      const tmpB = join(root, 'print', `${doc}-back.tmp.png`);
      await page.screenshot({ path: tmpB });
      execFileSync('convert', [tmpB, '-units', 'PixelsPerInch', '-density', '300', join(root, 'print', `${doc}-back.png`)]);
      execFileSync('rm', [tmpB]);
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: join(root, 'print', `${doc}-back.pdf`), width: `${PAGE.w}mm`, height: `${PAGE.h}mm`, printBackground: true, pageRanges: '1' });
      await page.close();
      execFileSync('mv', [join(root, 'print', `${doc}.pdf`), join(root, 'print', `${doc}-front.pdf`)]);
      execFileSync('pdfunite', [join(root, 'print', `${doc}-front.pdf`), join(root, 'print', `${doc}-back.pdf`), join(root, 'print', `${doc}.pdf`)]);
      execFileSync('rm', [join(root, 'print', `${doc}-front.pdf`), join(root, 'print', `${doc}-back.pdf`)]);
      // calm "ordered" card (where the pieces land), used by the animation
      page = await render(WW, WH, false, false, 'ordered');
      await page.screenshot({ path: join(root, 'img', `${doc}-ordered.jpg`), type: 'jpeg', quality: 88 });
      await page.close();
      // atlas: every piece upright on a transparent sheet (12 px per mm) + the layout
      const { ATLAS_SIZE } = await import(`../js/docs/${doc}.data.js`);
      page = await render(ATLAS_SIZE[0] * 12, ATLAS_SIZE[1] * 12, false, false, 'atlas');
      await page.screenshot({ path: join(root, 'img', `${doc}-atlas.png`), omitBackground: true });
      const lay = await page.evaluate(() => window.__doc5);
      await page.close();
      writeFileSync(join(root, 'js', 'docs', `${doc}.layout.js`),
        `// GENERATED by tools/make-print.mjs from tools/print/doc5.print.js. Do not edit by hand.\n` +
        `// Every piece of the card: ord = place on the ordered card, scat = place on the printed\n` +
        `// (scattered) front {x, y, rot (deg), s}, atlas = cell [x, y, w, h] in img/doc5-atlas.png (mm).\n` +
        `export const ATLAS_MM = ${JSON.stringify(ATLAS_SIZE)};\n` +
        `export const ELEMENTS = ${JSON.stringify(lay.elements)};\n` +
        `export const STARS = ${JSON.stringify(front.stars || [])};\n`);
      console.log(`${doc}: back (QR only), ordered card, atlas of ${lay.elements.length} pieces, ${(front.stars || []).length} stars`);
      continue;
    }

    const fontStyle = `<style>@font-face{font-family:'Vazirmatn';src:url('../fonts/Vazirmatn-wght.woff2') format('woff2');font-weight:100 900}@font-face{font-family:'HandFa';src:url('../fonts/ArefRuqaa-Regular.woff2') format('woff2');font-weight:400}@font-face{font-family:'HandFa';src:url('../fonts/ArefRuqaa-Bold.woff2') format('woff2');font-weight:700}</style>`;
    writeFileSync(join(root, 'print', `${doc}.svg`), svg.replace(/(<svg[^>]*>)/, `$1${fontStyle}`));
    writeFileSync(join(root, 'js', 'docs', `${doc}.layout.js`),
      `// GENERATED by tools/make-print.mjs. Do not edit by hand.\n` +
      `// Bounding boxes [x, y, w, h] in mm of each handwritten piece on the printed page.\n` +
      `export const PIECES = {\n${Object.entries(pieces).map(([k, v]) => `  ${k}: [${v.join(", ")}],`).join("\n")}\n};\n`);
    console.log(`${doc}: print/${doc}.png, .pdf, .svg, img/${doc}.jpg, ${Object.keys(pieces).length} pieces measured`);

    if (HANDWRITTEN.includes(doc)) {
      // Example to copy: the filled version with the handwriting in plain Vazirmatn (easy to read).
      page = await render(PW, PH, false, true);
      await page.screenshot({ path: join(root, 'print', 'templates', `${doc}-example.png`) });
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: join(root, 'print', 'templates', `${doc}-example.pdf`), width: '210mm', height: '297mm', printBackground: true, pageRanges: '1' });
      await page.close();
      writeFileSync(join(root, 'print', 'templates', `${doc}-fields.json`), JSON.stringify(pieces));
      page = await render(PW, PH, true);
      const tmp = join(root, 'print', 'templates', `${doc}.tmp.png`);
      await page.screenshot({ path: tmp });
      execFileSync('convert', [tmp, '-units', 'PixelsPerInch', '-density', '300', join(root, 'print', 'templates', `${doc}-blank.png`)]);
      execFileSync('rm', [tmp]);
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: join(root, 'print', 'templates', `${doc}-blank.pdf`), width: '210mm', height: '297mm', printBackground: true, pageRanges: '1' });
      await page.close();
      console.log(`${doc}: print/templates/${doc}-blank.pdf (to fill in by hand) and ${doc}-example.pdf (what to write)`);
    }
  }
  // One file with the three blank forms (to print and fill in) and one with the examples.
  const t = (n) => join(root, 'print', 'templates', n);
  // Always rebuilt from the per-document files, even when only one document was re-rendered.
  const have = HANDWRITTEN.filter((d) => existsSync(t(`${d}-blank.pdf`)) && existsSync(t(`${d}-example.pdf`)));
  if (have.length) {
    execFileSync('pdfunite', [...have.map((d) => t(`${d}-blank.pdf`)), t('1-PRINT-these-blank-forms.pdf')]);
    execFileSync('pdfunite', [...have.map((d) => t(`${d}-example.pdf`)), t('2-COPY-from-these-examples.pdf')]);
  }
} finally {
  await browser.close();
  server.close();
}
