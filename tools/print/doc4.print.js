// Document 4: official sales invoice («صورتحساب فروش کالا», printed) on top, and the
// warehouse's yellow carbon-copy receipt («رسید تحویل کالا به انبار», filled in by hand)
// below. Data from js/docs/doc4.data.js.
import { el, rng, stroke, loop, handLine, printedText, fa, faMoney, qrBlock, ink, formFrame, formHeader, roundStamp, rectStamp, sideStrip, edgeTab } from './lib.js';
import { PAGE, ITEMS, TOTAL, SLIP_ORDER, RECEIVED, INVOICE, SLIP } from '../../js/docs/doc4.data.js';

const DARK = '#1f2a3a';
const PAPER = '#fdfcf8';
const BLUE = '#1f3b8c';
const SLIP_PAPER = '#efc75e';
const SLIP_INK = '#3b2f12';

export function build(svg) {
  const R = rng(4410);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  formFrame(svg, W, H);
  sideStrip(svg, H, 'صورتحساب · نسخهٔ خریدار', { y1: 40, y2: 150 });
  edgeTab(svg, 150, 2.6, 38, 5.6, 'نسخهٔ خریدار');

  // ---- invoice header and parties ---------------------------------------------------------
  const I = INVOICE;
  formHeader(svg, {
    y: 12, h: 28, company: 'تأمین کالای نمونه', unit: 'لوازم بسته‌بندی و انبار', title: 'صورتحساب فروش کالا', subtitle: 'فاکتور رسمی',
    fields: ['شماره:', 'تاریخ:'], fieldValues: { 'شماره:': '۲۱۸۴', 'تاریخ:': '۱۴۰۵/۰۸/۱۸' },
  });
  el('rect', { x: I.x1, y: 43, width: I.x2 - I.x1, height: 13, fill: 'none', stroke: DARK, 'stroke-width': 0.6 }, svg);
  el('line', { x1: 105, x2: 105, y1: 43, y2: 56, stroke: DARK, 'stroke-width': 0.4 }, svg);
  printedText(svg, 'فروشنده: تأمین کالای نمونه', 192, 48.2, { size: 3, weight: 800, color: DARK });
  printedText(svg, 'شمارهٔ اقتصادی: ۰۰۰۰-۰۰۰۰-۱۲۳۴ · تلفن: ۰۰۰-۰۰۰۰۰۰۰', 192, 53.6, { size: 2.5, color: '#4b5565' });
  printedText(svg, 'خریدار: شرکت نمونه · انبار شمارهٔ ۲', 103, 48.2, { size: 3, weight: 800, color: DARK });
  printedText(svg, 'نشانی: شهرک صنعتی نمونه، خیابان یکم', 103, 53.6, { size: 2.5, color: '#4b5565' });
  rectStamp(svg, 32, 36.2, 26, 7, 'پرداخت نشده', { rot: -5 });

  // ---- invoice table -------------------------------------------------------------------------
  const C = I.cols;
  const heads = { n: 'ردیف', code: 'کد کالا', name: 'شرح کالا', qty: 'مقدار', unit: 'واحد', price: 'مبلغ واحد (تومان)', sum: 'مبلغ کل (تومان)' };
  el('rect', { x: I.x1, y: I.headerY, width: I.x2 - I.x1, height: 8, fill: DARK }, svg);
  for (const [k, [a, b]] of Object.entries(C)) printedText(svg, heads[k], k === 'name' ? b - 2 : (a + b) / 2, I.headerY + 5.4, { size: k === 'price' || k === 'sum' ? 2.6 : 2.9, weight: 800, color: PAPER, anchor: k === 'name' ? 'start' : 'middle' });
  ITEMS.forEach((it, i) => {
    const y = I.headerY + 8 + i * I.rowH, cy = y + I.rowH / 2 + 1.2;
    if (i % 2 === 1) el('rect', { x: I.x1, y, width: I.x2 - I.x1, height: I.rowH, fill: '#e3e6ea' }, svg);
    printedText(svg, fa(i + 1), (C.n[0] + C.n[1]) / 2, cy, { size: 3.1, weight: 600, anchor: 'middle' });
    printedText(svg, it.code, (C.code[0] + C.code[1]) / 2, cy, { size: 3, color: '#4b5565', anchor: 'middle' });
    printedText(svg, it.name, C.name[1] - 2, cy, { size: 3.3, weight: 600 });
    printedText(svg, fa(it.qty), (C.qty[0] + C.qty[1]) / 2, cy, { size: 3.5, weight: 800, anchor: 'middle' });
    printedText(svg, it.unit, (C.unit[0] + C.unit[1]) / 2, cy, { size: 3.1, anchor: 'middle' });
    printedText(svg, faMoney(it.price), (C.price[0] + C.price[1]) / 2, cy, { size: 3.1, anchor: 'middle' });
    printedText(svg, faMoney(it.qty * it.price), (C.sum[0] + C.sum[1]) / 2, cy, { size: 3.2, weight: 700, anchor: 'middle' });
  });
  const tableBottom = I.headerY + 8 + ITEMS.length * I.rowH;
  el('rect', { x: I.x1, y: I.headerY, width: I.x2 - I.x1, height: tableBottom - I.headerY, fill: 'none', stroke: DARK, 'stroke-width': 1.1 }, svg);
  Object.values(C).forEach(([a]) => { if (a > I.x1) el('line', { x1: a, x2: a, y1: I.headerY + 8, y2: tableBottom, stroke: '#9aa3b0', 'stroke-width': 0.3 }, svg); });
  // totals
  el('rect', { x: I.x1, y: tableBottom + 2, width: 74, height: 9, rx: 0.8, fill: DARK }, svg);
  printedText(svg, 'جمع کل:', I.x1 + 72, tableBottom + 8, { size: 3.3, weight: 800, color: PAPER });
  printedText(svg, `${faMoney(TOTAL)} تومان`, I.x1 + 30, tableBottom + 8, { size: 3.5, weight: 900, color: PAPER, anchor: 'middle' });
  printedText(svg, 'مبلغ به حروف: ده میلیون و نهصد و سی هزار تومان', 192, tableBottom + 8, { size: 2.9, weight: 600, color: DARK });
  // seller / buyer signature boxes + tax QR
  const sy = tableBottom + 14, sh = 18;
  [[150, 'مهر و امضای فروشنده'], [106, 'مهر و امضای خریدار']].forEach(([x, label]) => {
    el('rect', { x, y: sy, width: 44, height: sh, fill: 'none', stroke: DARK, 'stroke-width': 0.6 }, svg);
    el('rect', { x, y: sy, width: 44, height: 5.4, fill: DARK }, svg);
    printedText(svg, label, x + 22, sy + 3.9, { size: 2.7, weight: 800, color: PAPER, anchor: 'middle' });
  });
  roundStamp(svg, 172, sy + 11.5, 6.8, 'تأمین کالا', 'فروش', 'شرکت نمونه', R, { color: '#2c2f86', rot: 12 });
  ink(() => stroke(svg, [[156, sy + 15], [160, sy + 9], [163, sy + 15], [167, sy + 8], [170, sy + 14], [176, sy + 12]], R, { color: BLUE, width: 0.6 }));
  qrBlock(svg, 64, sy - 1, 19, R, DARK, PAPER);
  printedText(svg, 'کد رهگیری مالیاتی', 73.5, sy + 21.5, { size: 2.3, weight: 700, color: '#4b5565', anchor: 'middle' });
  // the buyer's red reminder (handwritten)
  handLine(svg, { id: 'inv_note', x: 56, y: sy + 9, size: 5, rot: -4, ink: '#a5281f', segs: [{ t: 'قبل از پرداخت', underline: true }] }, R).removeAttribute('data-piece');
  handLine(svg, { id: 'inv_note2', x: 52, y: sy + 16, size: 5, rot: -4, ink: '#a5281f', segs: [{ t: 'چک شود' }] }, R).removeAttribute('data-piece');
  el('line', { x1: 12, x2: 198, y1: 155, y2: 155, stroke: '#9aa0ad', 'stroke-width': 0.4, 'stroke-dasharray': '2 1.5' }, svg);

  // ---- warehouse receipt (yellow carbon copy) ------------------------------------------------
  const S = SLIP, SC = S.cols;
  el('rect', { x: S.x + 1.4, y: S.y + 1.8, width: S.w, height: S.h, fill: '#000', opacity: 0.15 }, svg);
  el('rect', { x: S.x, y: S.y, width: S.w, height: S.h, fill: SLIP_PAPER }, svg);
  el('rect', { x: S.x + 2, y: S.y + 2, width: S.w - 4, height: S.h - 4, fill: 'none', stroke: SLIP_INK, 'stroke-width': 0.5 }, svg);
  el('rect', { x: S.x + S.w - 34, y: S.y - 2, width: 14, height: 1.6, rx: 0.8, fill: '#6b7280' }, svg); // staple
  // header: title cell (dark) + number/date/invoice fields
  el('rect', { x: S.x + 70, y: S.y + 5, width: S.w - 75, height: 14, fill: SLIP_INK }, svg);
  printedText(svg, 'رسید تحویل کالا به انبار', S.x + S.w - 8, S.y + 12.2, { size: 5, weight: 900, color: SLIP_PAPER });
  printedText(svg, 'نسخهٔ انبار · شمارهٔ ۵۵۰۷', S.x + S.w - 8, S.y + 17, { size: 2.7, weight: 600, color: '#e9d79a' });
  edgeTab(svg, S.x + 6, S.y + 6, 24, 6, 'نسخهٔ زرد');
  const field = (label, x, y) => { printedText(svg, label, x, y, { size: 3, weight: 800, color: SLIP_INK }); };
  field('تاریخ تحویل:', S.x + S.w - 6, S.y + 26.5);
  field('شمارهٔ فاکتور:', S.x + 98, S.y + 26.5);
  handLine(svg, { id: 'slip_inv', x: S.x + 75, y: S.y + 27, size: 4.8, rot: -1, ink: BLUE, segs: [{ t: '۲۱۸۴' }] }, R).removeAttribute('data-piece');
  field('نام راننده:', S.x + 52, S.y + 26.5);
  handLine(svg, { id: 'slip_date', x: S.x + S.w - 27, y: S.y + 27, size: 4.8, rot: -1, ink: BLUE, segs: [{ t: '۱۹ آبان' }] }, R).removeAttribute('data-piece');
  handLine(svg, { id: 'slip_driver', x: S.x + 34, y: S.y + 27, size: 4.8, rot: 1.5, ink: BLUE, segs: [{ t: 'آقای ک.' }] }, R).removeAttribute('data-piece');

  const sheads = { n: 'ردیف', name: 'شرح کالا', qty: 'مقدار دریافتی', note: 'ملاحظات' };
  el('rect', { x: SC.note[0], y: S.headerY, width: SC.n[1] - SC.note[0], height: 8, fill: SLIP_INK }, svg);
  for (const [k, [a, b]] of Object.entries(SC)) printedText(svg, sheads[k], k === 'name' ? b - 2 : (a + b) / 2, S.headerY + 5.4, { size: 3, weight: 800, color: SLIP_PAPER, anchor: k === 'name' ? 'start' : 'middle' });
  SLIP_ORDER.forEach((id, j) => {
    const it = ITEMS.find((x) => x.id === id);
    const y = S.headerY + 8 + j * S.rowH, cy = y + S.rowH / 2 + 1.3;
    el('line', { x1: SC.note[0], x2: SC.n[1], y1: y + S.rowH, y2: y + S.rowH, stroke: '#8a7a45', 'stroke-width': 0.3 }, svg);
    printedText(svg, fa(j + 1), (SC.n[0] + SC.n[1]) / 2, cy, { size: 3.2, weight: 600, color: SLIP_INK, anchor: 'middle' });
    // item name written by the storekeeper
    handLine(svg, { id: 'sn_' + id, x: SC.name[1] - 3, y: cy + 0.6, size: 5, rot: (R() - 0.5) * 3, ink: BLUE, segs: [{ t: it.name.replace(/\u200c/g, ' ') }] }, R).removeAttribute('data-piece');
    // handwritten received quantity + remark / tick
    handLine(svg, { id: 'rq_' + id, x: (SC.qty[0] + SC.qty[1]) / 2, y: cy + 0.8, size: 7, rot: (R() - 0.5) * 6, ink: BLUE, align: 'middle', segs: [{ t: fa(RECEIVED[id]) }] }, R).removeAttribute('data-piece');
    if (id === 'carton') handLine(svg, { id: 'rn', x: SC.note[1] - 4, y: cy + 0.4, size: 4.6, rot: -2, ink: BLUE, segs: [{ t: 'یک بسته جدا میاد' }] }, R).removeAttribute('data-piece');
    else ink(() => stroke(svg, [[SC.note[1] - 12 - j * 3, cy - 1.4], [SC.note[1] - 9.5 - j * 3, cy + 1.2], [SC.note[1] - 4 - j * 3, cy - 3.6]], R, { color: BLUE, width: 1.1 }));
  });
  const sBottom = S.headerY + 8 + SLIP_ORDER.length * S.rowH;
  el('rect', { x: SC.note[0], y: S.headerY, width: SC.n[1] - SC.note[0], height: sBottom - S.headerY, fill: 'none', stroke: SLIP_INK, 'stroke-width': 1 }, svg);
  Object.values(SC).forEach(([a]) => { if (a > SC.note[0]) el('line', { x1: a, x2: a, y1: S.headerY + 8, y2: sBottom, stroke: '#8a7a45', 'stroke-width': 0.3 }, svg); });
  { const j = SLIP_ORDER.indexOf('carton'); const cy = S.headerY + 8 + j * S.rowH + S.rowH / 2; ink(() => loop(svg, (SC.qty[0] + SC.qty[1]) / 2, cy, 9, 5.2, R, { color: BLUE, width: 0.7 })); }
  // signature boxes
  [[S.x + S.w - 66, 'تحویل‌دهنده'], [S.x + 6, 'انباردار']].forEach(([x, label]) => {
    el('rect', { x, y: sBottom + 3, width: 60, height: 15, fill: 'none', stroke: SLIP_INK, 'stroke-width': 0.6 }, svg);
    el('rect', { x, y: sBottom + 3, width: 60, height: 5, fill: SLIP_INK }, svg);
    printedText(svg, label, x + 30, sBottom + 6.6, { size: 2.7, weight: 800, color: SLIP_PAPER, anchor: 'middle' });
  });
  ink(() => {
    stroke(svg, [[S.x + S.w - 52, sBottom + 16], [S.x + S.w - 46, sBottom + 10], [S.x + S.w - 42, sBottom + 16], [S.x + S.w - 35, sBottom + 10.5], [S.x + S.w - 26, sBottom + 14]], R, { color: BLUE, width: 1.2 });
    stroke(svg, [[S.x + 18, sBottom + 15.5], [S.x + 26, sBottom + 10.5], [S.x + 30, sBottom + 16], [S.x + 38, sBottom + 10], [S.x + 50, sBottom + 14]], R, { color: BLUE, width: 1.2 });
  });
  roundStamp(svg, 96, sBottom + 9, 9.5, 'انبار شمارهٔ ۲', 'دریافت شد', 'شرکت نمونه', R, { color: '#2c2f86', rot: -12 });

  printedText(svg, 'نمونهٔ نمایشی — همهٔ نام‌ها و ارقام ساختگی است', 105, 285.6, { size: 2.6, color: '#5b6272', anchor: 'middle' });
}
