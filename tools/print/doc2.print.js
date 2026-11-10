// Draws Document 2: a printed "photo" of a workspace (flat illustration) with caption.
// Positions of the labelled spots come from js/docs/doc2.data.js.
// Big, varied, high-contrast shapes everywhere (needed for tracking at ~128 px).
import { el, rng, stroke, handLine, border, printedText, cornerMarks, r2 } from './lib.js';
import { PAGE, PHOTO, HORIZON, CAPTION } from '../../js/docs/doc2.data.js';

const DARK = '#232c3d';
const PAPER = '#fbf8f1';

export function build(svg) {
  const R = rng(2077);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  border(svg, W, H, R, { color: '#8b8f99' });
  cornerMarks(svg, W, H, ['ring', 'bars', 'diamond', 'half'], DARK, PAPER);

  // ---- header ---------------------------------------------------------------
  printedText(svg, 'گزارش تصویری روزانه', 190, 23, { size: 6, weight: 800, color: DARK });
  el('rect', { x: 20, y: 15.5, width: 24, height: 9, rx: 1.2, fill: DARK }, svg);
  printedText(svg, 'عکس ۰۳', 32, 21.6, { size: 3.6, weight: 800, color: PAPER, anchor: 'middle' });
  el('line', { x1: 50, x2: 112, y1: 21, y2: 21, stroke: '#9aa0ad', 'stroke-width': 0.4, 'stroke-dasharray': '1 1.2' }, svg);

  // ---- the photo ------------------------------------------------------------
  const P = PHOTO;
  const clipId = 'photoClip';
  const defs = el('defs', {}, svg);
  const cp = el('clipPath', { id: clipId }, defs);
  el('rect', { x: P.x, y: P.y, width: P.w, height: P.h }, cp);
  const ph = el('g', { 'clip-path': `url(#${clipId})` }, svg);

  // wall + floor
  el('rect', { x: P.x, y: P.y, width: P.w, height: HORIZON - P.y, fill: '#ddd5c4' }, ph);
  el('rect', { x: P.x, y: HORIZON, width: P.w, height: P.y + P.h - HORIZON, fill: '#a59d8e' }, ph);
  el('rect', { x: P.x, y: HORIZON - 3, width: P.w, height: 3, fill: '#8f8676' }, ph); // skirting
  // floor tiles in perspective
  const vx = 104, vy = 112;
  const fc = el('clipPath', { id: 'floorClip' }, defs);
  el('rect', { x: P.x, y: HORIZON, width: P.w, height: P.y + P.h - HORIZON }, fc);
  const floor = el('g', { 'clip-path': 'url(#floorClip)' }, ph);
  for (let x = -120; x <= 330; x += 17) el('line', { x1: vx, y1: vy, x2: x, y2: 300, stroke: '#8a8273', 'stroke-width': 0.5 }, floor);
  [156, 164, 175, 190, 210].forEach((y) => el('line', { x1: P.x, x2: P.x + P.w, y1: y, y2: y, stroke: '#8a8273', 'stroke-width': 0.5 }, ph));
  // ceiling lights
  [[40, 34], [120, 34]].forEach(([x, y]) => { el('rect', { x, y, width: 36, height: 4, fill: DARK }, ph); el('rect', { x: x + 2, y: y + 4, width: 32, height: 1.6, fill: '#f4f1e6' }, ph); });

  // window
  el('rect', { x: 26, y: 46, width: 44, height: 44, fill: DARK }, ph);
  el('rect', { x: 28.5, y: 48.5, width: 18.2, height: 18.2, fill: '#9fc3e0' }, ph);
  el('rect', { x: 49.3, y: 48.5, width: 18.2, height: 18.2, fill: '#b8d4ea' }, ph);
  el('rect', { x: 28.5, y: 69.3, width: 18.2, height: 18.2, fill: '#b8d4ea' }, ph);
  el('rect', { x: 49.3, y: 69.3, width: 18.2, height: 18.2, fill: '#9fc3e0' }, ph);
  el('path', { d: 'M30 64 L44 52 M51 84 L64 72', stroke: '#e8f1f8', 'stroke-width': 1.2 }, ph);

  // wall clock (about 9:40)
  el('circle', { cx: 92, cy: 55, r: 8, fill: '#f7f4ec', stroke: DARK, 'stroke-width': 1.6 }, ph);
  el('line', { x1: 92, y1: 55, x2: 87.5, y2: 53.2, stroke: DARK, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, ph);
  el('line', { x1: 92, y1: 55, x2: 87.6, y2: 50.5, stroke: DARK, 'stroke-width': 0.7, 'stroke-linecap': 'round' }, ph);

  // whiteboard with scribbles
  el('rect', { x: 76, y: 68, width: 40, height: 30, fill: '#ffffff', stroke: '#6b7280', 'stroke-width': 1.4 }, ph);
  el('rect', { x: 80, y: 98, width: 32, height: 1.6, fill: '#6b7280' }, ph);
  stroke(ph, [[112, 74], [86, 74]], R, { color: '#1f3b8c', width: 0.7 });
  stroke(ph, [[112, 80], [92, 80]], R, { color: '#1f3b8c', width: 0.7 });
  stroke(ph, [[112, 86], [80, 86]], R, { color: '#b0281f', width: 0.7 });
  stroke(ph, [[108, 92], [96, 92]], R, { color: '#1f3b8c', width: 0.7 });
  el('circle', { cx: 83, cy: 92, r: 2.4, fill: 'none', stroke: '#2f8a5b', 'stroke-width': 0.7 }, ph);

  // fire extinguisher on the wall
  el('rect', { x: 101, y: 104, width: 12, height: 3, fill: DARK }, ph);
  el('rect', { x: 103, y: 112, width: 8, height: 24, rx: 3, fill: '#c0262d' }, ph);
  el('rect', { x: 104.5, y: 108, width: 5, height: 5, fill: '#2b2f38' }, ph);
  el('path', { d: 'M109.5 110 q5 2 4 10', fill: 'none', stroke: '#2b2f38', 'stroke-width': 1 }, ph);
  el('rect', { x: 103, y: 120, width: 8, height: 5, fill: '#f4f1e6' }, ph);

  // packing desk with monitor, papers, lamp
  el('rect', { x: 20, y: 128, width: 60, height: 4, fill: '#6b4a2b' }, ph);
  el('rect', { x: 23, y: 132, width: 3, height: 22, fill: '#4b3420' }, ph);
  el('rect', { x: 74, y: 132, width: 3, height: 22, fill: '#4b3420' }, ph);
  el('rect', { x: 52, y: 132, width: 22, height: 14, fill: '#7a5636' }, ph); // drawers
  el('line', { x1: 52, x2: 74, y1: 139, y2: 139, stroke: '#4b3420', 'stroke-width': 0.6 }, ph);
  el('rect', { x: 30, y: 112, width: 22, height: 14, rx: 1, fill: DARK }, ph); // monitor
  el('rect', { x: 32, y: 114, width: 18, height: 10, fill: '#5d7ea6' }, ph);
  el('rect', { x: 39, y: 126, width: 4, height: 2, fill: DARK }, ph);
  el('rect', { x: 56, y: 121, width: 14, height: 7, fill: '#c19a66', stroke: '#8d6236', 'stroke-width': 0.5 }, ph); // parcel
  el('rect', { x: 60, y: 123, width: 6, height: 3, fill: '#fff' }, ph);
  el('path', { d: 'M75 128 L72 116 L78 113', fill: 'none', stroke: DARK, 'stroke-width': 1 }, ph); // lamp
  el('path', { d: 'M76 111 L82 114 L79 117 Z', fill: DARK }, ph);

  // shelving unit with boxes (right)
  const sx1 = 122, sx2 = 188, levels = [64, 88, 112, 136, 158];
  el('rect', { x: sx1, y: 52, width: 2.6, height: 108, fill: '#2b3140' }, ph);
  el('rect', { x: sx2 - 2.6, y: 52, width: 2.6, height: 108, fill: '#2b3140' }, ph);
  const browns = ['#b98a55', '#a0703f', '#c9a06a', '#8d6236', '#d1b07c'];
  levels.forEach((y, li) => {
    el('rect', { x: sx1, y, width: sx2 - sx1, height: 2.2, fill: '#3a4152' }, ph);
    if (li === 0) return;
    const top = levels[li - 1] + 2.2;
    let x = sx1 + 3.5;
    while (x < sx2 - 8) {
      const w = 7 + R() * 9, h = Math.min(y - top - 1, 9 + R() * 12);
      if (x + w > sx2 - 3.5) break;
      el('rect', { x: r2(x), y: r2(y - h), width: r2(w), height: r2(h), fill: browns[Math.floor(R() * browns.length)], stroke: '#5e4123', 'stroke-width': 0.4 }, ph);
      if (w > 9) el('rect', { x: r2(x + w * 0.25), y: r2(y - h * 0.65), width: r2(w * 0.5), height: r2(h * 0.25), fill: '#f4f1e6' }, ph);
      x += w + 0.8 + R() * 1.5;
    }
  });
  // shelf sign
  el('rect', { x: 146, y: 54, width: 18, height: 8, rx: 1, fill: '#e3b23c' }, ph);
  printedText(ph, 'الف', 155, 59.6, { size: 4.2, weight: 900, color: DARK, anchor: 'middle' });

  // pallet with stacked cartons (centre)
  el('rect', { x: 80, y: 196, width: 42, height: 3, fill: '#8d6236' }, ph);
  el('rect', { x: 80, y: 199, width: 42, height: 3, fill: '#6b4a2b' }, ph);
  [82, 98.5, 115].forEach((x) => el('rect', { x, y: 199, width: 5, height: 3, fill: '#4b3420' }, ph));
  const stack = [[80, 182, 14, 14], [94, 182, 14, 14], [108, 182, 14, 14], [80, 168, 14, 14], [94, 168, 14, 14], [108, 168, 14, 14], [83, 154, 14, 14], [97, 154, 14, 14]];
  stack.forEach(([x, y, w, h], i) => {
    el('rect', { x, y, width: w, height: h, fill: browns[i % browns.length], stroke: '#5e4123', 'stroke-width': 0.5 }, ph);
    el('line', { x1: x + w / 2, x2: x + w / 2, y1: y, y2: y + h, stroke: '#e6d3ad', 'stroke-width': 1 }, ph);
  });
  el('rect', { x: 111, y: 155, width: 9, height: 13, fill: '#f4f1e6', stroke: '#5e4123', 'stroke-width': 0.5, transform: 'rotate(8 115 161)' }, ph); // loose carton

  // hand truck
  el('path', { d: 'M64 160 L68 206 M64 160 L60 158 M68 206 L80 206', fill: 'none', stroke: '#2b3140', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, ph);
  el('circle', { cx: 68, cy: 207, r: 3.6, fill: '#1c2029' }, ph);
  el('circle', { cx: 68, cy: 207, r: 1.2, fill: '#a59d8e' }, ph);

  // cartons left in the aisle (the follow-up point)
  [[128, 198, 16, 16, -6], [146, 194, 18, 20, 4], [163, 202, 14, 12, -3]].forEach(([x, y, w, h, rot], i) => {
    el('rect', { x, y, width: w, height: h, fill: browns[(i + 2) % browns.length], stroke: '#5e4123', 'stroke-width': 0.5, transform: `rotate(${rot} ${x + w / 2} ${y + h / 2})` }, ph);
    el('line', { x1: x, x2: x + w, y1: y + h / 2, y2: y + h / 2, stroke: '#e6d3ad', 'stroke-width': 1.1, transform: `rotate(${rot} ${x + w / 2} ${y + h / 2})` }, ph);
  });
  // hazard tape along the walkway edge
  const tape = el('g', {}, ph);
  el('rect', { x: P.x, y: 219, width: 108, height: 5, fill: '#e3b23c' }, tape);
  for (let x = P.x - 4; x < P.x + 108; x += 6) el('path', { d: `M${x} 224 L${x + 3} 219 L${x + 6} 219 L${x + 3} 224 Z`, fill: DARK }, tape);

  // photo frame on top
  el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, fill: 'none', stroke: DARK, 'stroke-width': 2.2 }, svg);

  // ---- caption strip ---------------------------------------------------------
  printedText(svg, CAPTION.title, 194, 241, { size: 4.6, weight: 800, color: DARK });
  printedText(svg, CAPTION.when, 194, 248.5, { size: 3.3, weight: 500, color: '#5b6272' });
  handLine(svg, { id: 'cap_note', x: 194, y: 262, size: 5.6, rot: -2, ink: '#1f3b8c', segs: [{ t: 'کارتن ها جلوی راهرو مونده؟' }] }, R).removeAttribute('data-piece');
  stroke(svg, [[150, 265], [160, 271], [170, 268]], R, { color: '#1f3b8c', width: 0.6 });
  // three detail thumbnails: gauge, barcode tag, padlock
  const thumbs = [[18, 236], [46, 236], [74, 236]];
  thumbs.forEach(([x, y], i) => {
    el('rect', { x, y, width: 25, height: 28, fill: i === 1 ? '#f4f1e6' : '#d8d2c4', stroke: DARK, 'stroke-width': 1.2 }, svg);
    const cx = x + 12.5, cy = y + 13;
    if (i === 0) { el('circle', { cx, cy, r: 8, fill: '#fff', stroke: DARK, 'stroke-width': 1.2 }, svg); el('line', { x1: cx, y1: cy, x2: cx + 5, y2: cy - 4, stroke: '#c0262d', 'stroke-width': 1.2 }, svg); el('path', { d: `M${cx - 6} ${cy + 3} A7 7 0 0 1 ${cx + 6} ${cy + 3}`, fill: 'none', stroke: '#2f8a5b', 'stroke-width': 1.6 }, svg); }
    if (i === 1) { let bx = x + 4; while (bx < x + 21) { const w = 0.4 + Math.floor(R() * 3) * 0.5; el('rect', { x: r2(bx), y: y + 6, width: r2(w), height: 14, fill: DARK }, svg); bx += w + 0.5 + R() * 0.6; } }
    if (i === 2) { el('path', { d: `M${cx - 4} ${cy - 1} v-4 a4 4 0 0 1 8 0 v4`, fill: 'none', stroke: DARK, 'stroke-width': 1.6 }, svg); el('rect', { x: cx - 6.5, y: cy - 1, width: 13, height: 10, rx: 1.2, fill: '#e3b23c', stroke: DARK, 'stroke-width': 1 }, svg); }
    printedText(svg, ['فشار', 'برچسب', 'قفل'][i], cx, y + 26, { size: 2.6, weight: 700, color: DARK, anchor: 'middle' });
  });
  printedText(svg, 'نمونهٔ نمایشی — تصویر و محتوا ساختگی است', 189, 282.6, { size: 2.7, color: '#5b6272' });
}
