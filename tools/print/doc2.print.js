// Document 2: official "daily site photo report" («گزارش تصویری روزانهٔ کارگاه»).
// The photo (prepared by tools/make-print.mjs from scans/photo.jpg, cropped per
// PHOTO_CROP in js/docs/doc2.data.js) fills the full width; an official info block,
// signatures and stamp sit below it.
import { el, rng, printedText, formFrame, formHeader, sectionBar, signatureBoxes, roundStamp, sideStrip, edgeTab, qrBlock, stroke, ink } from './lib.js';
import { PAGE, PHOTO, CAPTION, INFO } from '../../js/docs/doc2.data.js';

const DARK = '#1f2a3a';
const PAPER = '#fdfcf8';

export function build(svg, opts = {}) {
  const R = rng(2077);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  formFrame(svg, W, H);
  sideStrip(svg, H, 'گزارش تصویری · دفتر فنی', { y1: 60, y2: 160 });
  edgeTab(svg, 150, 2.6, 38, 5.6, 'پیوست گزارش روزانه');

  formHeader(svg, {
    y: 12, h: 28, company: 'شرکت نمونه', unit: 'دفتر فنی کارگاه', title: 'گزارش تصویری روزانهٔ کارگاه', subtitle: 'پیوست گزارش روزانه',
    fields: ['شماره:', 'تاریخ:'], fieldValues: { 'شماره:': '۰۳', 'تاریخ:': '۱۴۰۵/۰۸/۱۹' },
  });

  // ---- the photo ------------------------------------------------------------------
  const P = PHOTO;
  if (opts.photo) el('image', { href: '/print/assets/doc2-photo.jpg', x: P.x, y: P.y, width: P.w, height: P.h, preserveAspectRatio: 'xMidYMid slice' }, svg);
  else { // placeholder when no photo has been provided yet
    el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, fill: '#d9dde3' }, svg);
    printedText(svg, 'جای عکس (scans/photo.jpg)', P.x + P.w / 2, P.y + P.h / 2, { size: 5, weight: 700, color: '#6b7380', anchor: 'middle' });
  }
  el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, fill: 'none', stroke: DARK, 'stroke-width': 1.4 }, svg);
  printedText(svg, CAPTION, P.x + P.w - 1, P.y + P.h + 5, { size: 3, weight: 600, color: '#4b5565' });
  printedText(svg, 'عکس ۰۳', P.x + 1, P.y + P.h + 5, { size: 3, weight: 800, color: DARK, rtl: true, anchor: 'end' });

  // ---- photo details ----------------------------------------------------------------
  const top = 196;
  sectionBar(svg, top, '۱', 'مشخصات عکس');
  const rowH = 9, colX = [196, 105, 14];
  INFO.forEach(([k, v], i) => {
    const r = Math.floor(i / 2), c = i % 2;
    const x2 = colX[c], x1 = colX[c + 1], y = top + 7 + r * rowH;
    el('rect', { x: x1, y, width: x2 - x1, height: rowH, fill: r % 2 ? '#eceef1' : PAPER, stroke: '#9aa3b0', 'stroke-width': 0.3 }, svg);
    printedText(svg, k, x2 - 2, y + 6, { size: 3, weight: 800, color: DARK });
    printedText(svg, v, x2 - 27, y + 6, { size: 3, weight: 500, color: '#3b4452' });
  });
  el('rect', { x: 14, y: top + 7, width: 182, height: 3 * rowH, fill: 'none', stroke: DARK, 'stroke-width': 1 }, svg);

  // ---- signatures, stamp, QR, footer --------------------------------------------------------
  const box = signatureBoxes(svg, 241, ['تهیه‌کننده', 'ناظر کارگاه'], { h: 26, x1: 70 });
  ink(() => {
    const sig = ([x, y, w]) => stroke(svg, [[x + w * 0.3, y + 19], [x + w * 0.38, y + 11], [x + w * 0.45, y + 19], [x + w * 0.56, y + 10], [x + w * 0.62, y + 17], [x + w * 0.75, y + 14]], R, { color: '#1f3b8c', width: 0.7 });
    sig(box(0)); sig(box(1));
  });
  roundStamp(svg, 92, 256, 10, 'شرکت نمونه', 'دفتر فنی', 'کارگاه بلوک ب', R, { color: '#2c2f86', rot: -14 });
  qrBlock(svg, 16, 242, 24, R, DARK, PAPER);
  printedText(svg, 'کد فرم: ف-فن-۰۰۷ · ویرایش ۱', 194, 283.2, { size: 2.7, weight: 700, color: '#4b5565' });
  printedText(svg, 'نمونهٔ نمایشی — عکس با اجازهٔ صاحب اثر استفاده شده است', 112, 283.2, { size: 2.6, color: '#6b7380', anchor: 'middle' });
  edgeTab(svg, 20, H - 8.2, 30, 5.6, 'صفحهٔ ۱ از ۱');
}
