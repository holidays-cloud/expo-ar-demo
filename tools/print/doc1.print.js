// Document 1: official internal form "purchase request + weekly shift plan", filled in by hand.
// Content and coordinates come from js/docs/doc1.data.js (shared with the app).
//
// Looks like a standard Iranian business form (header box with number/date/attachment,
// dark section bars, ruled tables, signature boxes, stamp, form code) and, for image
// tracking, carries bold high-contrast shapes spread over the page (dark header cell,
// section bars, stamp, barcode, heavy table rules).
import { el, rng, stroke, handLine, printedText, ink, formFrame, formHeader, sectionBar, signatureBoxes, roundStamp, qrBlock, sideStrip, rectStamp, punchHoles, edgeTab } from './lib.js';
import { PAGE, HAND, PAPER_GRID, LEAVE_ARROW, ORDER_TABLE, DAYS, dayCol } from '../../js/docs/doc1.data.js';

const DARK = '#1f2a3a';
const PAPER = '#fdfcf8';
const BLUE = '#1f3b8c';
const FA = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export function build(svg) {
  const R = rng(1405);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  formFrame(svg, W, H);
  // Bold, form-like shapes the camera can follow (check with npm run inspect)
  sideStrip(svg, H, 'فرم ف-ان-۰۱۲');
  punchHoles(svg, W);
  edgeTab(svg, 150, 2.6, 38, 5.6, 'نسخهٔ ۱ · بایگانی');
  edgeTab(svg, 20, H - 8.2, 30, 5.6, 'صفحهٔ ۱ از ۱');

  const headerEnd = formHeader(svg, { y: 12, h: 30, company: 'شرکت نمونه', unit: 'واحد انبار و پشتیبانی', title: 'درخواست خرید و برنامهٔ شیفت', subtitle: 'فرم داخلی · هفتگی', fieldValues: { 'پیوست:': 'ندارد' } });
  rectStamp(svg, 128, headerEnd + 1, 20, 8.5, 'فوری', { rot: -7, solid: true });

  // ---- 1. order table ---------------------------------------------------------------
  const T = ORDER_TABLE, C = T.cols;
  sectionBar(svg, 46, '۱', 'اقلام درخواستی');
  const headY = T.top - 7.5;
  el('rect', { x: 14, y: headY, width: 182, height: 7.5, fill: '#bfc5cd' }, svg);
  const heads = { n: 'ردیف', item: 'شرح کالا', qty: 'مقدار', note: 'ملاحظات' };
  for (const [k, [a, b]] of Object.entries(C)) printedText(svg, heads[k], k === 'item' || k === 'note' ? b - 2 : (a + b) / 2, headY + 5.2, { size: 3, weight: 800, color: DARK, anchor: k === 'item' || k === 'note' ? 'start' : 'middle' });
  const bottom = T.top + T.rows * T.rowH;
  for (let i = 0; i <= T.rows; i++) el('line', { x1: 14, x2: 196, y1: T.top + i * T.rowH, y2: T.top + i * T.rowH, stroke: i === 0 || i === T.rows ? DARK : '#9aa3b0', 'stroke-width': i === 0 || i === T.rows ? 0.7 : 0.3 }, svg);
  [196, 186, 124, 88, 14].forEach((x) => el('line', { x1: x, x2: x, y1: headY, y2: bottom, stroke: DARK, 'stroke-width': x === 196 || x === 14 ? 1.1 : 0.4 }, svg));
  el('line', { x1: 14, x2: 196, y1: headY, y2: headY, stroke: DARK, 'stroke-width': 0.7 }, svg);
  for (let i = 0; i < T.rows; i++) printedText(svg, FA(i + 1), (C.n[0] + C.n[1]) / 2, T.top + i * T.rowH + 6.2, { size: 3.2, weight: 700, color: DARK, anchor: 'middle' });
  printedText(svg, 'توضیحات:', 194, 140.5, { size: 3.2, weight: 800, color: DARK });
  el('line', { x1: 16, x2: 180, y1: 141.5, y2: 141.5, stroke: '#9aa3b0', 'stroke-width': 0.3, 'stroke-dasharray': '0.8 0.8' }, svg);

  // ---- 2. shift table (days and shifts printed, names handwritten) ---------------------
  sectionBar(svg, 147, '۲', 'برنامهٔ شیفت هفته');
  const G = PAPER_GRID;
  el('rect', { x: G.x1, y: G.rows[0], width: G.x2 - G.x1, height: G.rows[1] - G.rows[0], fill: '#bfc5cd' }, svg);
  el('rect', { x: G.x2 - G.labelW, y: G.rows[1], width: G.labelW, height: G.rows[3] - G.rows[1], fill: '#dde0e4' }, svg);
  G.rows.forEach((y, i) => el('line', { x1: G.x1, x2: G.x2, y1: y, y2: y, stroke: DARK, 'stroke-width': i === 0 || i === 3 ? 1.1 : 0.45 }, svg));
  const colW = (G.x2 - G.labelW - G.x1) / 6;
  [G.x2, G.x2 - G.labelW, ...DAYS.map((_, k) => G.x2 - G.labelW - colW * (k + 1))].forEach((x, i) => el('line', { x1: x, x2: x, y1: G.rows[0], y2: G.rows[3], stroke: DARK, 'stroke-width': i === 0 || i === 7 ? 1.1 : 0.45 }, svg));
  DAYS.forEach((d, k) => printedText(svg, d, dayCol(k).cx, G.rows[0] + 6, { size: 3, weight: 800, color: DARK, anchor: 'middle' }));
  printedText(svg, 'شیفت', G.x2 - G.labelW / 2, G.rows[0] + 6, { size: 3, weight: 800, color: DARK, anchor: 'middle' });
  [['صبح', '۸ تا ۱۴', 1], ['عصر', '۱۴ تا ۲۰', 2]].forEach(([n, hrs, r]) => {
    const cy = (G.rows[r] + G.rows[r + 1]) / 2;
    printedText(svg, n, G.x2 - G.labelW / 2, cy, { size: 3.6, weight: 800, color: DARK, anchor: 'middle' });
    printedText(svg, hrs, G.x2 - G.labelW / 2, cy + 5, { size: 2.6, weight: 500, color: '#5b6272', anchor: 'middle' });
  });
  printedText(svg, 'یادداشت سرپرست:', 194, 213.5, { size: 3.2, weight: 800, color: DARK });

  // supervisor's arrow (drawn by hand)
  const [ax, ay] = LEAVE_ARROW.from, [bx, by] = LEAVE_ARROW.to;
  const red = { color: '#a5281f', width: 0.8, amp: 0.25 };
  ink(() => {
    stroke(svg, [[ax, ay], [ax - 6, ay - 8], [bx + 2, by + 14], [bx, by]], R, red);
    stroke(svg, [[bx - 2.6, by + 3.4], [bx, by], [bx + 3, by + 2.8]], R, red);
  });

  // ---- 3. further notes ---------------------------------------------------------------
  sectionBar(svg, 220, '۳', 'توضیحات تکمیلی');
  [238, 248].forEach((y) => el('line', { x1: 16, x2: 194, y1: y, y2: y, stroke: '#9aa3b0', 'stroke-width': 0.3, 'stroke-dasharray': '0.8 0.8' }, svg));

  // ---- signatures, stamp, footer -----------------------------------------------------------
  const box = signatureBoxes(svg, 253, ['درخواست‌کننده', 'سرپرست انبار', 'مدیر واحد'], { h: 23, x1: 38 });
  ink(() => {
    const sig = ([x, y, w]) => stroke(svg, [[x + w * 0.25, y + 17], [x + w * 0.35, y + 10], [x + w * 0.42, y + 17], [x + w * 0.55, y + 9], [x + w * 0.62, y + 15], [x + w * 0.78, y + 12]], R, { color: BLUE, width: 0.7 });
    sig(box(0)); sig(box(1));
  });
  roundStamp(svg, 72, 266, 11, 'شرکت نمونه', 'تأیید شد', 'واحد انبار', R, { rot: -16, color: '#2c2f86' });

  printedText(svg, 'کد فرم: ف-ان-۰۱۲ · ویرایش ۲', 194, 283.2, { size: 2.7, weight: 700, color: '#4b5565' });
  printedText(svg, 'نمونهٔ نمایشی — همهٔ نام‌ها و ارقام ساختگی است', 118, 283.2, { size: 2.6, color: '#6b7380', anchor: 'middle' });
  qrBlock(svg, 13, 255, 22, R, DARK, PAPER);

  // ---- handwriting (left out of the blank form) --------------------------------------------
  HAND.forEach((item) => handLine(svg, item, R));
}
