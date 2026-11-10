// Draws Document 1 (handwritten order page + shift table) as an SVG in millimetres.
// Content and coordinates come from js/docs/doc1.data.js (shared with the app).
//
// Designed for image tracking as well as for looking real: MindAR follows the page on a
// ~128 px wide copy of it, where fine handwriting turns to grey. So the page also carries
// bold, high-contrast shapes at a large scale (dark header band, corner marks, section tabs,
// a sticky note, a stamp, a coffee ring, a heavy grid), spread over the whole page and
// none of them repeating. Check with: node tools/inspect-target.mjs targets/doc1.mind
import { el, rng, stroke, loop, handLine, border, printedText, r2 } from './lib.js';
import { PAGE, HAND, PAPER_GRID, LEAVE_ARROW } from '../../js/docs/doc1.data.js';

const DARK = '#232c3d';
const BLUE = '#1f3b8c';
const PAPER = '#fbf8f1';

export function build(svg) {
  const R = rng(1405);
  const { w: W, h: H } = PAGE;

  // Paper
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  border(svg, W, H, R);
  cornerMarks(svg);
  // two punched binder holes
  [96, 196].forEach((y) => { el('circle', { cx: 14, cy: y, r: 3.2, fill: '#3a3f4a' }, svg); el('circle', { cx: 14, cy: y, r: 3.2, fill: 'none', stroke: '#c9c3b5', 'stroke-width': 0.6 }, svg); });

  // ---- Printed form header: dark band with the (fictional) business emblem -------
  el('rect', { x: 72, y: 13, width: 124, height: 26, rx: 2.2, fill: DARK }, svg);
  const em = el('g', { transform: 'translate(183.5 26)' }, svg);
  const hex = (r) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${r2(Math.cos(a) * r)},${r2(Math.sin(a) * r)}`; }).join(' ');
  el('polygon', { points: hex(9), fill: 'none', stroke: PAPER, 'stroke-width': 1 }, em);
  el('polygon', { points: hex(6.2), fill: PAPER }, em);
  [-2.4, 0, 2.4].forEach((y, i) => el('rect', { x: -3.4 + i * 0.6, y: y - 0.55, width: 6.8 - i * 1.6, height: 1.1, fill: DARK }, em));
  printedText(svg, 'برگ سفارش و برنامهٔ شیفت هفتگی', 170, 25.5, { size: 6, weight: 800, color: PAPER });
  printedText(svg, 'فرم داخلی انبار و پرسنل  ·  نسخهٔ ۲', 170, 33, { size: 3.1, weight: 500, color: '#b9c0cc' });
  // form fields
  printedText(svg, 'شماره:', 64, 23, { size: 3.6, weight: 600, color: '#4a5060' });
  printedText(svg, 'تاریخ:', 64, 33.5, { size: 3.6, weight: 600, color: '#4a5060' });
  [23.8, 34.3].forEach((y) => el('line', { x1: 20, x2: 52, y1: y + 0.6, y2: y + 0.6, stroke: '#7d8494', 'stroke-width': 0.35, 'stroke-dasharray': '0.8 0.8' }, svg));
  el('line', { x1: 14, x2: 196, y1: 42, y2: 42, stroke: DARK, 'stroke-width': 0.9 }, svg);

  // ---- Section A: order items (ruled lines) --------------------------------
  sectionTab(svg, 'اقلام سفارش', 'بخش ۱', 49.5);
  for (let y = 60; y <= 140; y += 10) el('line', { x1: 15, x2: 195, y1: y + 0.8, y2: y + 0.8, stroke: '#94abd2', 'stroke-width': 0.25 }, svg);
  el('line', { x1: 185, x2: 185, y1: 53, y2: 142, stroke: '#cf7f7f', 'stroke-width': 0.4 }, svg);
  for (let i = 0; i < 8; i++) printedText(svg, '۱۲۳۴۵۶۷۸'[i], 191, 60 + i * 10, { size: 2.8, weight: 600, color: '#7d8494', anchor: 'middle' });

  // a quick sketch of a carton next to the order list
  const cube = { color: BLUE, width: 0.75, amp: 0.18 };
  stroke(svg, [[22, 64], [42, 64], [42, 80], [22, 80], [22, 64]], R, cube);
  stroke(svg, [[22, 64], [29, 57], [49, 57], [42, 64]], R, cube);
  stroke(svg, [[49, 57], [49, 73], [42, 80]], R, cube);
  for (let i = 0; i < 5; i++) stroke(svg, [[43 + i * 1.3, 64 - i * 1.3 + 2], [43 + i * 1.3, 78 - i * 1.3]], R, { color: BLUE, width: 0.45, amp: 0.1 });
  handLine(svg, { id: 'doodle_x12', x: 66, y: 74, size: 6, rot: -6, ink: BLUE, segs: [{ t: '×۱۲' }] }, R).removeAttribute('data-piece');

  // sticky note (orange) with a strip of tape
  const note = el('g', { transform: 'rotate(-5 40 109)' }, svg);
  el('rect', { x: 19.6, y: 90.6, width: 42, height: 38, fill: '#000', opacity: 0.18, rx: 0.6 }, note); // shadow
  el('rect', { x: 18, y: 89, width: 42, height: 38, fill: '#f39a4f', rx: 0.4 }, note);
  el('path', { d: 'M18 127 L60 127 L60 121 Q52 126 18 127 Z', fill: '#d9772c' }, note); // curl
  el('rect', { x: 31, y: 85.5, width: 17, height: 7, fill: '#cfd3d8', opacity: 0.85, transform: 'rotate(4 39.5 89)' }, note);
  [['موجودی انبار', 99.5, 4.6], ['۳ کارتن', 108.5, 5.6], ['۱ تونر!', 117.5, 5.6]].forEach(([t, y, s]) => {
    const tx = el('text', { x: 56, y, 'font-family': 'HandFa', 'font-weight': 700, 'font-size': s, fill: '#1d2333', direction: 'rtl', 'unicode-bidi': 'embed', 'text-anchor': 'start' }, note);
    tx.textContent = t;
  });
  stroke(note, [[56, 101.5], [27, 101]], R, { color: '#1d2333', width: 0.5, amp: 0.2 });

  // ---- Section B: shift table (hand-drawn grid) ---------------------------
  sectionTab(svg, 'برنامهٔ شیفت', 'بخش ۲', 149.5);
  const G = PAPER_GRID, pen = { color: '#1d2230', width: 0.85, amp: 0.3 };
  // pencil shading on the header row and label column
  el('rect', { x: G.x1, y: G.rows[0], width: G.x2 - G.x1, height: G.rows[1] - G.rows[0], fill: '#1d2230', opacity: 0.09 }, svg);
  el('rect', { x: G.x2 - G.labelW, y: G.rows[1], width: G.labelW, height: G.rows[3] - G.rows[1], fill: '#1d2230', opacity: 0.06 }, svg);
  G.rows.forEach((y) => stroke(svg, [[G.x2 + 1.5, y + (R() - 0.5)], [G.x1 - 1.5, y + (R() - 0.5)]], R, pen));
  const colW = (G.x2 - G.labelW - G.x1) / 6;
  const xs = [G.x2, G.x2 - G.labelW, ...Array.from({ length: 6 }, (_, k) => G.x2 - G.labelW - colW * (k + 1))];
  xs.forEach((x) => stroke(svg, [[x + (R() - 0.5) * 0.8, G.rows[0] - 1.2], [x + (R() - 0.5) * 0.8, G.rows[3] + 1.4]], R, pen));
  // heavy pencil hatch in the corner cell
  for (let i = 0; i < 7; i++) stroke(svg, [[G.x2 - 1.5 - i * 3.2, G.rows[1] - 1], [G.x2 - 5.5 - i * 3.2, G.rows[0] + 1]], R, { color: '#3d4250', width: 0.6, amp: 0.15, opacity: 0.8 });

  // Arrow from the red note to Tuesday's column
  const [ax, ay] = LEAVE_ARROW.from, [bx, by] = LEAVE_ARROW.to;
  const red = { color: '#a5281f', width: 0.8, amp: 0.25 };
  stroke(svg, [[ax, ay], [ax - 2, ay - 8], [bx + 1, by + 14], [bx, by]], R, red);
  stroke(svg, [[bx - 2.6, by + 3.4], [bx, by], [bx + 3, by + 2.8]], R, red);

  // ---- Section C: notes ----------------------------------------------------
  sectionTab(svg, 'یادداشت', 'بخش ۳', 230.5);
  for (let y = 244; y <= 274; y += 10.5) el('line', { x1: 15, x2: 195, y1: y + 0.8, y2: y + 0.8, stroke: '#94abd2', 'stroke-width': 0.25 }, svg);

  // coffee-cup ring
  const ring = el('g', { opacity: 0.55 }, svg);
  loop(ring, 36, 233, 14.5, 14, R, { color: '#7a4a1e', width: 1.8, opacity: 1 });
  loop(ring, 36.6, 233.3, 12.9, 12.5, R, { color: '#7a4a1e', width: 0.6, opacity: 0.8 });

  // doodles: a boxed extension number, a star, a spiral
  const dood = { color: BLUE, width: 0.6, amp: 0.2 };
  stroke(svg, [[22, 259], [56, 258.4], [56.6, 270], [21.6, 270.5], [22, 259]], R, dood);
  for (let i = 0; i < 9; i++) stroke(svg, [[23 + i * 3.6, 269.5], [25.5 + i * 3.6, 260]], R, { color: BLUE, width: 0.35, amp: 0.08, opacity: 0.55 });
  handLine(svg, { id: 'doodle_ext', x: 50, y: 266.8, size: 4.8, rot: -1, ink: BLUE, segs: [{ t: 'داخلی ۲۴' }] }, R).removeAttribute('data-piece');
  const star = Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI * 0.8; return [72, 265].map((c, j) => c + (j ? Math.sin(a) : Math.cos(a)) * 6); });
  stroke(svg, star, R, { ...dood, width: 0.8 });
  const spiral = Array.from({ length: 44 }, (_, i) => { const a = i * 0.45, r = 0.3 + i * 0.14; return [93 + Math.cos(a) * r, 265.5 + Math.sin(a) * r]; });
  stroke(svg, spiral, R, { ...dood, width: 0.7, amp: 0.05 });
  handLine(svg, { id: 'doodle_ok', x: 188, y: 268, size: 4.6, rot: 2, ink: BLUE, segs: [{ t: 'چک شد ✓' }] }, R).removeAttribute('data-piece');

  // rubber stamp
  stamp(svg, 130, 266, R);

  // ---- Handwritten pieces (these lift off in the animation) ----------------
  HAND.forEach((item) => handLine(svg, item, R));

  // ---- Printed footer ------------------------------------------------------
  printedText(svg, 'نمونهٔ نمایشی — همهٔ نام‌ها و ارقام ساختگی است', 189, 282.6, { size: 2.7, color: '#5b6272' });
  el('rect', { x: 20, y: 278.4, width: 17, height: 5.8, rx: 0.8, fill: DARK }, svg);
  printedText(svg, 'فرم ۱۲', 28.5, 282.8, { size: 3.2, weight: 800, color: PAPER, anchor: 'middle' });
  let bx2 = 40; // barcode-like strip: varied widths
  while (bx2 < 75) { const w = 0.35 + Math.floor(R() * 4) * 0.45; el('rect', { x: r2(bx2), y: 278.4, width: r2(w), height: 5.8, fill: DARK }, svg); bx2 += w + 0.4 + R() * 0.9; }
}

// Dark tab behind each section title; the English word sits beside it.
function sectionTab(svg, fa, en, y) { // `en` is now a small Farsi section number
  const t = printedText(svg, fa, 192, y, { size: 4.2, weight: 800, color: PAPER });
  const w = t.getComputedTextLength();
  const tab = el('rect', { x: r2(192 - w - 3), y: y - 4.6, width: r2(w + 6), height: 6.6, rx: 1, fill: DARK }, svg);
  svg.insertBefore(tab, t);
  printedText(svg, en, 192 - w - 6, y - 0.2, { size: 2.9, weight: 700, color: '#5b6272' });
}

// Four different bold corner marks: big, unique shapes at the page extremes keep the
// tracked pose stable.
function cornerMarks(svg) {
  const W = PAGE.w, H = PAGE.h;
  el('path', { d: `M3 3 H17 V7 H7 V17 H3 Z`, fill: DARK }, svg);                                  // top-left: L
  el('path', { d: `M${W - 3} 3 V17 L${W - 17} 3 Z`, fill: DARK }, svg);                            // top-right: triangle
  el('circle', { cx: 10, cy: H - 10, r: 6.5, fill: DARK }, svg);                                  // bottom-left: dot
  el('circle', { cx: 10, cy: H - 10, r: 2.4, fill: PAPER }, svg);
  el('rect', { x: W - 16.5, y: H - 16.5, width: 13.5, height: 13.5, fill: DARK }, svg);            // bottom-right: notched square
  el('rect', { x: W - 16.5, y: H - 16.5, width: 6, height: 6, fill: PAPER }, svg);
}

function stamp(svg, cx, cy, R) {
  const g = el('g', { transform: `rotate(-14 ${cx} ${cy})`, opacity: 0.82 }, svg);
  const c = '#b0281f';
  el('circle', { cx, cy, r: 12, fill: 'none', stroke: c, 'stroke-width': 1.5 }, g);
  el('circle', { cx, cy, r: 9.4, fill: 'none', stroke: c, 'stroke-width': 0.6 }, g);
  el('rect', { x: cx - 13, y: cy - 2.9, width: 26, height: 5.8, fill: PAPER, stroke: c, 'stroke-width': 0.9 }, g);
  printedText(g, 'ثبت شد', cx, cy + 1.3, { size: 3.6, weight: 900, color: c, anchor: 'middle' });
  printedText(g, 'بخش تدارکات', cx, cy - 4.6, { size: 2.2, weight: 700, color: c, anchor: 'middle' });
  printedText(g, '۱۴۰۵', cx, cy + 7.2, { size: 2.4, weight: 700, color: c, anchor: 'middle' });
  // worn ink: a few paper-coloured specks
  for (let i = 0; i < 18; i++) el('circle', { cx: r2(cx + (R() - 0.5) * 24), cy: r2(cy + (R() - 0.5) * 24), r: r2(0.2 + R() * 0.5), fill: PAPER }, g);
}
