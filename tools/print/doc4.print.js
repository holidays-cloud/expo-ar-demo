// Draws Document 4: a printed supplier invoice (top) and a yellow carbon-copy delivery slip
// (bottom) with handwritten received quantities. Data from js/docs/doc4.data.js.
import { el, rng, stroke, loop, handLine, border, printedText, cornerMarks, fa, faMoney, qrBlock } from './lib.js';
import { PAGE, ITEMS, TOTAL, SLIP_ORDER, RECEIVED, INVOICE, SLIP } from '../../js/docs/doc4.data.js';

const DARK = '#1e2a36';
const PAPER = '#fbfaf6';
const BLUE = '#1f3b8c';

export function build(svg) {
  const R = rng(4410);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  border(svg, W, H, R, { color: '#8e96a4' });
  cornerMarks(svg, W, H, ['tri', 'ring', 'bars', 'diamond'], DARK, PAPER);

  // ---- invoice header ---------------------------------------------------------
  const I = INVOICE;
  printedText(svg, 'فاکتور فروش', 192, 25, { size: 7.4, weight: 900, color: DARK });
  el('rect', { x: 166, y: 29, width: 26, height: 7, rx: 3.5, fill: DARK }, svg);
  printedText(svg, 'شمارهٔ ۲۱۸۴', 179, 33.8, { size: 3.2, weight: 800, color: PAPER, anchor: 'middle' });
  printedText(svg, 'تاریخ ۱۸ آبان ۱۴۰۵', 162, 33.8, { size: 3.3, weight: 600, color: '#4b5565' });
  printedText(svg, 'خریدار: انبار شمارهٔ ۲', 192, 42.5, { size: 3.4, weight: 700, color: DARK });
  // fictional supplier mark: square with a bold letter + name
  el('rect', { x: 20, y: 15, width: 17, height: 17, rx: 3, fill: '#2f6f8f' }, svg);
  el('circle', { cx: 28.5, cy: 23.5, r: 5.6, fill: 'none', stroke: PAPER, 'stroke-width': 1.6 }, svg);
  printedText(svg, 'ت', 28.5, 26, { size: 6, weight: 900, color: PAPER, anchor: 'middle' });
  printedText(svg, 'شرکت نمونهٔ تأمین کالا', 84, 22, { size: 3.8, weight: 800, color: DARK });
  printedText(svg, 'فروش لوازم بسته‌بندی و انبار', 84, 28.5, { size: 2.8, weight: 500, color: '#5b6272' });

  // ---- invoice table ------------------------------------------------------------
  const C = I.cols;
  const heads = { n: 'ردیف', name: 'شرح کالا', qty: 'تعداد', unit: 'واحد', price: 'فی (تومان)', sum: 'مبلغ (تومان)' };
  el('rect', { x: I.x1, y: I.headerY, width: I.x2 - I.x1, height: 8, fill: DARK }, svg);
  for (const [k, [a, b]] of Object.entries(C)) printedText(svg, heads[k], k === 'name' ? b - 2 : (a + b) / 2, I.headerY + 5.4, { size: 3, weight: 800, color: PAPER, anchor: k === 'name' ? 'start' : 'middle' });
  ITEMS.forEach((it, i) => {
    const y = I.headerY + 8 + i * I.rowH, cy = y + I.rowH / 2 + 1.2;
    if (i % 2 === 1) el('rect', { x: I.x1, y, width: I.x2 - I.x1, height: I.rowH, fill: '#e9ecef' }, svg);
    printedText(svg, fa(i + 1), (C.n[0] + C.n[1]) / 2, cy, { size: 3.2, weight: 600, anchor: 'middle' });
    printedText(svg, it.name, C.name[1] - 2, cy, { size: 3.4, weight: 600 });
    icon(svg, it.id, C.name[0] + 6, y + I.rowH / 2);
    printedText(svg, fa(it.qty), (C.qty[0] + C.qty[1]) / 2, cy, { size: 3.6, weight: 800, anchor: 'middle' });
    printedText(svg, it.unit, (C.unit[0] + C.unit[1]) / 2, cy, { size: 3.2, anchor: 'middle' });
    printedText(svg, faMoney(it.price), (C.price[0] + C.price[1]) / 2, cy, { size: 3.2, anchor: 'middle' });
    printedText(svg, faMoney(it.qty * it.price), (C.sum[0] + C.sum[1]) / 2, cy, { size: 3.3, weight: 700, anchor: 'middle' });
  });
  const tableBottom = I.headerY + 8 + ITEMS.length * I.rowH;
  el('rect', { x: I.x1, y: I.headerY, width: I.x2 - I.x1, height: tableBottom - I.headerY, fill: 'none', stroke: DARK, 'stroke-width': 0.6 }, svg);
  Object.values(C).forEach(([a]) => { if (a > I.x1) el('line', { x1: a, x2: a, y1: I.headerY + 8, y2: tableBottom, stroke: '#b7bec8', 'stroke-width': 0.3 }, svg); });
  // total box
  el('rect', { x: I.x1, y: tableBottom + 3, width: 76, height: 10, rx: 1, fill: DARK }, svg);
  printedText(svg, 'جمع کل:', I.x1 + 74, tableBottom + 9.6, { size: 3.4, weight: 800, color: PAPER });
  printedText(svg, `${faMoney(TOTAL)} تومان`, I.x1 + 30, tableBottom + 9.6, { size: 3.6, weight: 900, color: PAPER, anchor: 'middle' });
  printedText(svg, 'شرایط پرداخت: پس از تحویل و تأیید انبار', 192, tableBottom + 9.6, { size: 2.9, weight: 500, color: '#5b6272' });
  // supplier stamp (blue) + signature
  const sg = el('g', { transform: `rotate(10 150 ${tableBottom + 24})`, opacity: 0.8 }, svg);
  el('rect', { x: 128, y: tableBottom + 16, width: 44, height: 16, rx: 3, fill: 'none', stroke: '#2b4fa8', 'stroke-width': 1.3 }, sg);
  printedText(sg, 'تأمین کالا · فروش', 150, tableBottom + 23, { size: 3.2, weight: 900, color: '#2b4fa8', anchor: 'middle' });
  printedText(sg, 'مهر و امضا', 150, tableBottom + 29, { size: 2.4, weight: 700, color: '#2b4fa8', anchor: 'middle' });
  stroke(svg, [[60, tableBottom + 30], [66, tableBottom + 22], [70, tableBottom + 31], [76, tableBottom + 21], [82, tableBottom + 29], [92, tableBottom + 26]], R, { color: BLUE, width: 0.6 });
  qrBlock(svg, 100, tableBottom + 16, 22, R, DARK, PAPER);
  printedText(svg, 'کد رهگیری', 111, tableBottom + 41.5, { size: 2.4, weight: 700, color: '#5b6272', anchor: 'middle' });
  // coffee ring on the invoice
  const ring = el('g', { opacity: 0.5 }, svg);
  loop(ring, 178, 98, 12.5, 12, R, { color: '#7a4a1e', width: 1.6, opacity: 1 });
  // red "unpaid" stamp near the header
  const up = el('g', { transform: 'rotate(-8 62 41)', opacity: 0.92 }, svg);
  el('rect', { x: 42, y: 35, width: 40, height: 12, rx: 1.5, fill: 'none', stroke: '#b0281f', 'stroke-width': 1.8 }, up);
  printedText(up, 'پرداخت نشده', 62, 43.2, { size: 5, weight: 900, color: '#b0281f', anchor: 'middle' });
  // red handwritten reminder under the table
  handLine(svg, { id: 'inv_note', x: 96, y: tableBottom + 34, size: 6.4, rot: -3, ink: '#a5281f', segs: [{ t: 'قبل از پرداخت چک شود', underline: true }] }, R).removeAttribute('data-piece');
  el('line', { x1: I.x1, x2: I.x2, y1: 150, y2: 150, stroke: '#9aa0ad', 'stroke-width': 0.4, 'stroke-dasharray': '2 1.5' }, svg);

  // ---- delivery slip (yellow carbon copy) ------------------------------------------
  const S = SLIP;
  el('rect', { x: S.x + 1.6, y: S.y + 2, width: S.w, height: S.h, fill: '#000', opacity: 0.16 }, svg); // shadow
  el('rect', { x: S.x, y: S.y, width: S.w, height: S.h, fill: '#eebd4f' }, svg);
  // carrier's truck pictogram
  const tk = el('g', { transform: `translate(${S.x + 92} ${S.y + 8})` }, svg);
  el('rect', { x: 0, y: 0, width: 16, height: 10, rx: 1, fill: '#3b2f12' }, tk);
  el('path', { d: 'M16 3 h5 l3 3.5 V10 H16 Z', fill: '#3b2f12' }, tk);
  el('rect', { x: 17.5, y: 4, width: 3.2, height: 2.6, fill: '#eebd4f' }, tk);
  [4.5, 19].forEach((x) => { el('circle', { cx: x, cy: 11, r: 2.6, fill: '#3b2f12' }, tk); el('circle', { cx: x, cy: 11, r: 1, fill: '#eebd4f' }, tk); });
  // strip of tape holding the slip
  el('rect', { x: S.x + S.w - 44, y: S.y - 4, width: 22, height: 8, fill: '#9aa3ae', opacity: 0.9, transform: `rotate(-6 ${S.x + S.w - 33} ${S.y})` }, svg);
  // staple
  el('rect', { x: S.x + S.w - 30, y: S.y - 2, width: 14, height: 1.6, rx: 0.8, fill: '#6b7280' }, svg);
  printedText(svg, 'حوالهٔ تحویل کالا', S.x + S.w - 6, S.y + 13, { size: 6, weight: 900, color: '#3b2f12' });
  printedText(svg, 'نسخهٔ انبار', S.x + S.w - 6, S.y + 20, { size: 3, weight: 700, color: '#6b5a2a' });
  el('rect', { x: S.x + 6, y: S.y + 6, width: 32, height: 10, rx: 1, fill: '#3b2f12' }, svg);
  printedText(svg, 'شمارهٔ ۵۵۰۷', S.x + 22, S.y + 12.6, { size: 3.4, weight: 800, color: '#eebd4f', anchor: 'middle' });
  printedText(svg, 'تاریخ تحویل:', S.x + S.w - 6, S.y + 27.5, { size: 3, weight: 600, color: '#3b2f12' });
  handLine(svg, { id: 'slip_date', x: S.x + S.w - 26, y: S.y + 27.5, size: 4.8, rot: -1, ink: BLUE, segs: [{ t: '۱۹ آبان' }] }, R).removeAttribute('data-piece');
  printedText(svg, 'راننده:', S.x + 70, S.y + 27.5, { size: 3, weight: 600, color: '#3b2f12' });
  handLine(svg, { id: 'slip_driver', x: S.x + 58, y: S.y + 27.5, size: 4.8, rot: 1.5, ink: BLUE, segs: [{ t: 'آقای ک.' }] }, R).removeAttribute('data-piece');

  const SC = S.cols;
  const sheads = { n: 'ردیف', name: 'شرح کالا', qty: 'تعداد تحویلی', note: 'ملاحظات' };
  el('rect', { x: SC.note[0], y: S.headerY, width: SC.n[1] - SC.note[0], height: 8, fill: '#3b2f12' }, svg);
  for (const [k, [a, b]] of Object.entries(SC)) printedText(svg, sheads[k], k === 'name' ? b - 2 : (a + b) / 2, S.headerY + 5.4, { size: 3, weight: 800, color: '#eebd4f', anchor: k === 'name' ? 'start' : 'middle' });
  SLIP_ORDER.forEach((id, j) => {
    const it = ITEMS.find((x) => x.id === id);
    const y = S.headerY + 8 + j * S.rowH, cy = y + S.rowH / 2 + 1.3;
    el('line', { x1: SC.note[0], x2: SC.n[1], y1: y + S.rowH, y2: y + S.rowH, stroke: '#8a7a45', 'stroke-width': 0.3 }, svg);
    printedText(svg, fa(j + 1), (SC.n[0] + SC.n[1]) / 2, cy, { size: 3.2, weight: 600, color: '#3b2f12', anchor: 'middle' });
    printedText(svg, `${it.name} (${it.unit})`, SC.name[1] - 2, cy, { size: 3.3, weight: 600, color: '#3b2f12' });
    // handwritten received quantity + note
    handLine(svg, { id: 'rq_' + id, x: (SC.qty[0] + SC.qty[1]) / 2, y: cy + 0.8, size: 7, rot: (R() - 0.5) * 6, ink: BLUE, align: 'middle', segs: [{ t: fa(RECEIVED[id]) }] }, R).removeAttribute('data-piece');
    if (id === 'carton') handLine(svg, { id: 'rn', x: SC.note[1] - 4, y: cy + 0.4, size: 4.6, rot: -2, ink: BLUE, segs: [{ t: 'یک بسته جدا میاد' }] }, R).removeAttribute('data-piece');
    else stroke(svg, [[SC.note[1] - 12 - j * 3, cy - 1.4], [SC.note[1] - 9.5 - j * 3, cy + 1.2], [SC.note[1] - 4 - j * 3, cy - 3.6]], R, { color: BLUE, width: 1.1 });
  });
  const sBottom = S.headerY + 8 + SLIP_ORDER.length * S.rowH;
  el('rect', { x: SC.note[0], y: S.headerY, width: SC.n[1] - SC.note[0], height: sBottom - S.headerY, fill: 'none', stroke: '#3b2f12', 'stroke-width': 0.6 }, svg);
  Object.values(SC).forEach(([a]) => { if (a > SC.note[0]) el('line', { x1: a, x2: a, y1: S.headerY + 8, y2: sBottom, stroke: '#8a7a45', 'stroke-width': 0.3 }, svg); });
  // blue loop around the carton row's quantity (someone noticed)
  { const j = SLIP_ORDER.indexOf('carton'); const cy = S.headerY + 8 + j * S.rowH + S.rowH / 2; loop(svg, (SC.qty[0] + SC.qty[1]) / 2, cy, 9, 5.2, R, { color: BLUE, width: 0.7 }); }
  // round "received" stamp (red) over the lower table
  const st = el('g', { transform: `rotate(-12 64 ${sBottom - 4})`, opacity: 0.95 }, svg);
  el('circle', { cx: 64, cy: sBottom - 4, r: 13, fill: 'none', stroke: '#b0281f', 'stroke-width': 2.4 }, st);
  el('circle', { cx: 64, cy: sBottom - 4, r: 10, fill: 'none', stroke: '#b0281f', 'stroke-width': 0.6 }, st);
  printedText(st, 'دریافت شد', 64, sBottom - 2.8, { size: 4, weight: 900, color: '#b0281f', anchor: 'middle' });
  printedText(st, 'انبار ۲', 64, sBottom + 3.4, { size: 2.4, weight: 700, color: '#b0281f', anchor: 'middle' });
  // paper clip at the slip's top-left corner
  el('path', { d: `M${S.x + 46} ${S.y + 20} V${S.y - 6} a4 4 0 0 1 8 0 V${S.y + 18} a2.6 2.6 0 0 1 -5.2 0 V${S.y - 2}`, fill: 'none', stroke: '#4b5563', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
  // signatures
  printedText(svg, 'تحویل‌دهنده', S.x + S.w - 10, sBottom + 9, { size: 3, weight: 700, color: '#3b2f12' });
  printedText(svg, 'تحویل‌گیرنده', S.x + 60, sBottom + 9, { size: 3, weight: 700, color: '#3b2f12' });
  stroke(svg, [[S.x + S.w - 50, sBottom + 18], [S.x + S.w - 44, sBottom + 11], [S.x + S.w - 40, sBottom + 18], [S.x + S.w - 33, sBottom + 12], [S.x + S.w - 26, sBottom + 16]], R, { color: BLUE, width: 1.3 });
  stroke(svg, [[S.x + 14, sBottom + 17], [S.x + 22, sBottom + 12], [S.x + 26, sBottom + 18], [S.x + 34, sBottom + 11], [S.x + 44, sBottom + 15]], R, { color: BLUE, width: 1.3 });

  printedText(svg, 'نمونهٔ نمایشی — همهٔ نام‌ها و ارقام ساختگی است', 189, 285.6, { size: 2.6, color: '#5b6272' });
}

// Bold pictogram per product (each one different, which also helps tracking).
function icon(svg, id, cx, cy) {
  const g = el('g', { transform: `translate(${cx} ${cy})` }, svg);
  const f = { fill: DARK };
  if (id === 'pallet') { el('rect', { x: -4, y: -1.6, width: 8, height: 1.4, ...f }, g); el('rect', { x: -4, y: 1, width: 8, height: 1.4, ...f }, g); [-4, -0.6, 2.8].forEach((x) => el('rect', { x, y: -0.4, width: 1.2, height: 1.6, ...f }, g)); }
  if (id === 'carton') { el('rect', { x: -3.4, y: -2.6, width: 6.8, height: 5.2, ...f }, g); el('rect', { x: -0.5, y: -2.6, width: 1, height: 5.2, fill: PAPER }, g); }
  if (id === 'tape') { el('circle', { r: 3.2, ...f }, g); el('circle', { r: 1.4, fill: PAPER }, g); }
  if (id === 'stretch') { el('rect', { x: -4, y: -2.2, width: 8, height: 4.4, rx: 2.2, ...f }, g); el('rect', { x: 2.4, y: -1, width: 3, height: 2, fill: PAPER }, g); }
  if (id === 'gloves') el('path', { d: 'M-2.6 3 V-1 l-1-2.4 1.2-0.4 1 1.8 V-3.4 h1.2 V-0.6 V-3.6 h1.2 V-0.4 V-3 h1.2 V3 Z', ...f }, g);
  if (id === 'labels') { el('path', { d: 'M-3.6 -2.4 H2 L4 0 L2 2.4 H-3.6 Z', ...f }, g); el('circle', { cx: 1.6, cy: 0, r: 0.8, fill: PAPER }, g); }
}
