// Draws Document 3: an architectural floor plan with printed dimensions (1:100).
// Rooms and dimensions come from js/docs/doc3.data.js.
// Heavy filled walls, axis bubbles, a north arrow and a scale bar give strong,
// non-repeating shapes for tracking.
import { el, rng, border, printedText, cornerMarks, fa, qrBlock } from './lib.js';
import { PAGE, ORIGIN, MM_PER_M, BUILDING, ROOMS, TITLE_BLOCK, toPaper } from '../../js/docs/doc3.data.js';

const DARK = '#1f2633';
const PAPER = '#fbfaf6';
const M = MM_PER_M;

export function build(svg) {
  const R = rng(3301);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);
  border(svg, W, H, R, { color: '#8b93a3' });
  cornerMarks(svg, W, H, ['plus', 'dot', 'notch', 'L'], DARK, PAPER);

  // ---- header ---------------------------------------------------------------
  printedText(svg, 'نقشهٔ معماری', 190, 21, { size: 5.6, weight: 800, color: DARK });
  el('rect', { x: 20, y: 14, width: 22, height: 9, rx: 1, fill: DARK }, svg);
  printedText(svg, 'ن-۰۱', 31, 20.2, { size: 3.8, weight: 800, color: PAPER, anchor: 'middle' });

  const ox = ORIGIN.x, oy = ORIGIN.y, BW = BUILDING.w * M, BH = BUILDING.h * M;

  // ---- axis bubbles (top) --------------------------------------------------------
  [[0, '۱'], [10, '۲'], [16, '۳']].forEach(([m, label]) => {
    const x = ox + m * M;
    el('line', { x1: x, x2: x, y1: 31, y2: oy, stroke: '#7d8494', 'stroke-width': 0.25, 'stroke-dasharray': '3 1 0.6 1' }, svg);
    el('circle', { cx: x, cy: 28, r: 3.6, fill: PAPER, stroke: DARK, 'stroke-width': 0.6 }, svg);
    printedText(svg, label, x, 29.4, { size: 3.4, weight: 800, color: DARK, anchor: 'middle' });
  });

  // ---- room floors: light tint per room, plus furniture --------------------------
  const tints = ['#eef0f3', '#f3efe6', '#ffffff', '#eef3ef', '#f1eef3', '#f3f1ea', '#edf2f5'];
  ROOMS.forEach((r, i) => el('rect', { x: r.rect[0], y: r.rect[1], width: r.rect[2], height: r.rect[3], fill: tints[i] }, svg));
  // store: shelving strips along walls (hatched)
  const shelf = (x, y, w, h) => {
    el('rect', { x, y, width: w, height: h, fill: '#d9dde4', stroke: DARK, 'stroke-width': 0.35 }, svg);
    const n = Math.floor(Math.max(w, h) / 2.5);
    for (let k = 1; k < n; k++) w > h ? el('line', { x1: x + k * 2.5, x2: x + k * 2.5, y1: y, y2: y + h, stroke: DARK, 'stroke-width': 0.2 }, svg) : el('line', { x1: x, x2: x + w, y1: y + k * 2.5, y2: y + k * 2.5, stroke: DARK, 'stroke-width': 0.2 }, svg);
  };
  const [sx, sy, sw, sh] = toPaper([10, 0, 6, 8]);
  shelf(sx + 2, sy + 2, 6, sh - 4); shelf(sx + sw - 8, sy + 2, 6, sh - 4); shelf(sx + 12, sy + sh - 8, sw - 24, 6);
  // hall: two workbenches and a machine
  const [hx, hy] = toPaper([0, 0, 10, 8]);
  [[hx + 10, hy + 14], [hx + 10, hy + 40]].forEach(([x, y]) => { el('rect', { x, y, width: 40, height: 9, fill: '#cfd5de', stroke: DARK, 'stroke-width': 0.4 }, svg); el('line', { x1: x, x2: x + 40, y1: y + 4.5, y2: y + 4.5, stroke: DARK, 'stroke-width': 0.2 }, svg); });
  el('rect', { x: hx + 66, y: hy + 16, width: 22, height: 18, fill: '#b9c1cd', stroke: DARK, 'stroke-width': 0.5 }, svg);
  el('circle', { cx: hx + 77, cy: hy + 25, r: 5, fill: 'none', stroke: DARK, 'stroke-width': 0.5 }, svg);
  el('path', { d: `M${hx + 66} ${hy + 16} L${hx + 88} ${hy + 34} M${hx + 88} ${hy + 16} L${hx + 66} ${hy + 34}`, stroke: DARK, 'stroke-width': 0.25 }, svg);
  // office: desk + chair
  const [fx, fy] = toPaper([0, 10, 6, 5]);
  el('rect', { x: fx + 31, y: fy + 8, width: 26, height: 10, fill: '#d8cdb8', stroke: DARK, 'stroke-width': 0.4 }, svg);
  el('circle', { cx: fx + 44, cy: fy + 22, r: 3.4, fill: '#fff', stroke: DARK, 'stroke-width': 0.4 }, svg);
  el('rect', { x: fx + 4, y: fy + 40, width: 16, height: 7, fill: '#e6e0d2', stroke: DARK, 'stroke-width': 0.35 }, svg);
  // meeting: table + 6 chairs
  const [mx, my] = toPaper([6, 10, 5, 5]);
  el('rect', { x: mx + 13, y: my + 15, width: 24, height: 20, rx: 2, fill: '#d8cdb8', stroke: DARK, 'stroke-width': 0.4 }, svg);
  [[mx + 18, my + 12], [mx + 25, my + 12], [mx + 32, my + 12], [mx + 18, my + 38], [mx + 25, my + 38], [mx + 32, my + 38]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 2.2, fill: '#fff', stroke: DARK, 'stroke-width': 0.35 }, svg));
  // kitchen: L counter with sink
  const [kx, ky, kw] = toPaper([11, 10, 5, 3]);
  el('path', { d: `M${kx + 2} ${ky + 2} H${kx + kw - 2} V${ky + 20} H${kx + kw - 8} V${ky + 8} H${kx + 2} Z`, fill: '#cfd5de', stroke: DARK, 'stroke-width': 0.4 }, svg);
  el('rect', { x: kx + 20, y: ky + 3, width: 9, height: 4, rx: 1, fill: '#fff', stroke: DARK, 'stroke-width': 0.3 }, svg);
  // wc: toilet + basin
  const [wx, wy] = toPaper([11, 13, 5, 2]);
  el('ellipse', { cx: wx + 41, cy: wy + 10, rx: 3, ry: 4.2, fill: '#fff', stroke: DARK, 'stroke-width': 0.35 }, svg);
  el('rect', { x: wx + 44, y: wy + 7, width: 4, height: 6, fill: '#fff', stroke: DARK, 'stroke-width': 0.35 }, svg);
  el('ellipse', { cx: wx + 6, cy: wy + 5, rx: 3, ry: 2.2, fill: '#fff', stroke: DARK, 'stroke-width': 0.35 }, svg);

  // ---- walls: outer filled band, inner partitions --------------------------------
  const T = 2.6, t = 1.2;
  el('path', { d: `M${ox - T} ${oy - T} h${BW + 2 * T} v${BH + 2 * T} h${-(BW + 2 * T)} Z M${ox} ${oy} v${BH} h${BW} v${-BH} Z`, fill: DARK, 'fill-rule': 'evenodd' }, svg);
  const wallH = (xm1, xm2, ym) => el('rect', { x: ox + xm1 * M, y: oy + ym * M - t / 2, width: (xm2 - xm1) * M, height: t, fill: DARK }, svg);
  const wallV = (xm, ym1, ym2) => el('rect', { x: ox + xm * M - t / 2, y: oy + ym1 * M, width: t, height: (ym2 - ym1) * M, fill: DARK }, svg);
  wallH(0, 16, 8); wallH(0, 16, 10); wallV(10, 0, 8); wallV(6, 10, 15); wallV(11, 10, 15); wallH(11, 16, 13);

  // doors: gap in a wall + swing arc. [x(m), y(m), width(m), orientation, swing direction]
  const doors = [[4, 8, 1, 'h', 1], [12, 8, 1, 'h', -1], [2, 10, 0.9, 'h', 1], [8, 10, 0.9, 'h', 1], [13, 10, 0.9, 'h', 1], [14.4, 13, 0.8, 'h', 1]];
  doors.forEach(([xm, ym, wm, , dir]) => {
    const x = ox + xm * M, y = oy + ym * M, w = wm * M;
    el('rect', { x, y: y - T / 2 - 0.2, width: w, height: T + 0.4, fill: PAPER }, svg);
    el('line', { x1: x, y1: y, x2: x, y2: y + dir * w, stroke: DARK, 'stroke-width': 0.5 }, svg);
    el('path', { d: `M${x} ${y + dir * w} A${w} ${w} 0 0 ${dir > 0 ? 0 : 1} ${x + w} ${y}`, fill: 'none', stroke: DARK, 'stroke-width': 0.3, 'stroke-dasharray': '1 0.6' }, svg);
  });
  // main entrance (double door in the outer left wall of the corridor)
  el('rect', { x: ox - T - 0.2, y: oy + 8.2 * M, width: T + 0.4, height: 1.6 * M, fill: PAPER }, svg);
  el('path', { d: `M${ox} ${oy + 8.2 * M} l-8 0 M${ox} ${oy + 9.8 * M} l-8 0`, stroke: DARK, 'stroke-width': 0.5 }, svg);
  el('path', { d: `M${ox - 8} ${oy + 8.2 * M} A8 8 0 0 0 ${ox} ${oy + 9 * M}`, fill: 'none', stroke: DARK, 'stroke-width': 0.3 }, svg);
  el('path', { d: `M${ox - 8} ${oy + 9.8 * M} A8 8 0 0 1 ${ox} ${oy + 9 * M}`, fill: 'none', stroke: DARK, 'stroke-width': 0.3 }, svg);
  printedText(svg, 'ورودی', ox - 9, oy + 9 * M + 1.2, { size: 2.8, weight: 700, color: DARK, anchor: 'end' });
  // loading door (store, top outer wall)
  el('rect', { x: ox + 12 * M, y: oy - T - 0.2, width: 3 * M, height: T + 0.4, fill: PAPER }, svg);
  el('rect', { x: ox + 12 * M, y: oy - 1, width: 3 * M, height: 1.6, fill: 'none', stroke: DARK, 'stroke-width': 0.4, 'stroke-dasharray': '1.5 0.8' }, svg);
  // windows: thin triple line inside the outer band
  const win = (x, y, w, h) => { el('rect', { x, y, width: w, height: h, fill: PAPER, stroke: DARK, 'stroke-width': 0.3 }, svg); w > h ? el('line', { x1: x, x2: x + w, y1: y + h / 2, y2: y + h / 2, stroke: DARK, 'stroke-width': 0.3 }, svg) : el('line', { x1: x + w / 2, x2: x + w / 2, y1: y, y2: y + h, stroke: DARK, 'stroke-width': 0.3 }, svg); };
  win(ox + 2 * M, oy - T, 2 * M, T); win(ox + 6 * M, oy - T, 2 * M, T);
  win(ox - T, oy + 11 * M, T, 3 * M); win(ox + 7 * M, oy + BH, 3 * M, T); win(ox + BW, oy + 2 * M, T, 4 * M);

  // ---- room labels (name + printed dimensions) ------------------------------------
  ROOMS.forEach((r) => {
    const [x, y, w, h] = r.rect;
    const cx = x + w / 2, cy = y + h / 2;
    const dims = `${fa(r.m[2])} × ${fa(r.m[3])} متر`;
    if (r.id === 'wc') { // small room: two compact lines between the basin and the toilet
      printedText(svg, r.name, cx - 2, cy - 0.4, { size: 3.4, weight: 800, color: DARK, anchor: 'middle' });
      printedText(svg, dims, cx - 2, cy + 4.4, { size: 2.6, weight: 500, color: '#4a5263', anchor: 'middle' });
    } else if (h < 25) { // corridor: one line
      printedText(svg, `${r.name}   ${dims}`, cx, cy + 1.2, { size: 3.2, weight: 700, color: DARK, anchor: 'middle' });
    } else {
      const ly = r.id === 'hall' ? y + h - 14 : r.id === 'store' ? y + h - 16 : r.id === 'office' ? y + 33 : cy;
      printedText(svg, r.name, cx, ly, { size: 4, weight: 800, color: DARK, anchor: 'middle' });
      printedText(svg, dims, cx, ly + 5.2, { size: 3, weight: 500, color: '#4a5263', anchor: 'middle' });
    }
  });

  // ---- room number badges (dark), placed in a free corner of each room ------------
  const badgeAt = { hall: [6, 6], store: [24, 52], corridor: [118, 10], office: [8, 26], meeting: [8, 6], kitchen: [8, 25], wc: [17, 10] };
  ROOMS.forEach((r, i) => {
    const [bx, by] = badgeAt[r.id];
    const x = r.rect[0] + bx, y = r.rect[1] + by;
    el('circle', { cx: x, cy: y, r: 3.4, fill: DARK }, svg);
    printedText(svg, fa(101 + i), x, y + 1.1, { size: 2.4, weight: 800, color: PAPER, anchor: 'middle' });
  });
  // section markers A–A (left and right of the plan): half-filled circles with arrows
  const sec = (x, y, flip) => {
    el('circle', { cx: x, cy: y, r: 5, fill: PAPER, stroke: DARK, 'stroke-width': 0.8 }, svg);
    el('path', { d: `M${x - 5} ${y} A5 5 0 0 ${flip ? 0 : 1} ${x + 5} ${y} Z`, fill: DARK }, svg);
    el('path', { d: `M${x} ${y + (flip ? -5 : 5)} l-3 ${flip ? -4 : 4} h6 Z`, fill: DARK }, svg);
    printedText(svg, 'الف', x, y + (flip ? 3.4 : -1.4), { size: 2.6, weight: 800, color: flip ? DARK : PAPER, anchor: 'middle' });
  };
  sec(ox - 5, oy + 4 * M, false); sec(ox + BW + 5, oy + 4 * M, true);

  // ---- dimension lines --------------------------------------------------------
  const dimH = (y, xs) => { // xs in metres along the top/bottom
    el('line', { x1: ox + xs[0] * M, x2: ox + xs[xs.length - 1] * M, y1: y, y2: y, stroke: DARK, 'stroke-width': 0.3 }, svg);
    xs.forEach((m) => { const x = ox + m * M; el('line', { x1: x - 1.4, y1: y + 1.4, x2: x + 1.4, y2: y - 1.4, stroke: DARK, 'stroke-width': 0.6 }, svg); el('line', { x1: x, x2: x, y1: y - 2.5, y2: y + 2.5, stroke: DARK, 'stroke-width': 0.25 }, svg); });
    for (let i = 0; i < xs.length - 1; i++) printedText(svg, fa((xs[i + 1] - xs[i]).toFixed(2)).replace('.', '٫'), ox + (xs[i] + xs[i + 1]) / 2 * M, y - 1.4, { size: 3, weight: 700, color: DARK, anchor: 'middle' });
  };
  const dimV = (x, ys) => {
    el('line', { x1: x, x2: x, y1: oy + ys[0] * M, y2: oy + ys[ys.length - 1] * M, stroke: DARK, 'stroke-width': 0.3 }, svg);
    ys.forEach((m) => { const y = oy + m * M; el('line', { x1: x - 1.4, y1: y + 1.4, x2: x + 1.4, y2: y - 1.4, stroke: DARK, 'stroke-width': 0.6 }, svg); el('line', { x1: x - 2.5, x2: x + 2.5, y1: y, y2: y, stroke: DARK, 'stroke-width': 0.25 }, svg); });
    for (let i = 0; i < ys.length - 1; i++) {
      const cy = oy + (ys[i] + ys[i + 1]) / 2 * M;
      const tt = printedText(svg, fa((ys[i + 1] - ys[i]).toFixed(2)).replace('.', '٫'), x - 1.4, cy, { size: 3, weight: 700, color: DARK, anchor: 'middle' });
      tt.setAttribute('transform', `rotate(-90 ${x - 1.4} ${cy})`);
    }
  };
  dimH(oy - 8, [0, 10, 16]);
  dimH(oy + BH + 9, [0, 16]);
  dimV(ox - 13, [0, 8, 10, 15]);
  dimV(ox + BW + 9, [0, 8, 10, 13, 15]);

  // ---- title block -------------------------------------------------------------------
  const [tx, ty, tw, th] = TITLE_BLOCK;
  el('rect', { x: tx, y: ty, width: tw, height: th, fill: PAPER, stroke: DARK, 'stroke-width': 0.9 }, svg);
  el('rect', { x: tx + tw - 70, y: ty, width: 70, height: 14, fill: DARK }, svg);
  printedText(svg, 'واحد نمونه · طبقهٔ همکف', tx + tw - 4, ty + 9, { size: 4, weight: 800, color: PAPER });
  const cells = [['مقیاس', '۱:۱۰۰'], ['تاریخ', 'آبان ۱۴۰۵'], ['برگ', '۱ از ۱'], ['زیربنای کل', 'در جدول اتاق‌ها']];
  cells.forEach(([k, v], i) => {
    const cx = tx + tw - 4 - (i % 2) * 36, cy = ty + 22 + Math.floor(i / 2) * 11;
    printedText(svg, k, cx, cy, { size: 2.6, weight: 500, color: '#5b6272' });
    printedText(svg, v, cx, cy + 4.6, { size: 3.2, weight: 800, color: DARK });
  });
  el('line', { x1: tx + tw - 74, x2: tx + tw - 74, y1: ty, y2: ty + th, stroke: DARK, 'stroke-width': 0.5 }, svg);
  // scale bar 0..5 m
  const sbx = tx + 36, sby = ty + 34;
  for (let k = 0; k < 5; k++) el('rect', { x: sbx + k * M, y: sby, width: M, height: 3, fill: k % 2 ? PAPER : DARK, stroke: DARK, 'stroke-width': 0.4 }, svg);
  [0, 1, 2, 5].forEach((k) => printedText(svg, fa(k), sbx + k * M, sby + 8, { size: 2.6, weight: 700, color: DARK, anchor: 'middle' }));
  printedText(svg, 'متر', sbx + 50, sby - 1.4, { size: 2.6, weight: 700, color: DARK, anchor: 'end' });
  qrBlock(svg, tx + 79, ty + 18, 22, R, DARK, PAPER);
  // north arrow
  const nx = tx + 20, ny = ty + 22;
  el('circle', { cx: nx, cy: ny, r: 11, fill: 'none', stroke: DARK, 'stroke-width': 0.7 }, svg);
  el('path', { d: `M${nx} ${ny - 10} L${nx + 5} ${ny + 6} L${nx} ${ny + 2} Z`, fill: DARK }, svg);
  el('path', { d: `M${nx} ${ny - 10} L${nx - 5} ${ny + 6} L${nx} ${ny + 2} Z`, fill: PAPER, stroke: DARK, 'stroke-width': 0.5 }, svg);
  printedText(svg, 'شمال', nx, ny + 17, { size: 2.8, weight: 800, color: DARK, anchor: 'middle' });

  printedText(svg, 'نمونهٔ نمایشی — نقشه و ابعاد ساختگی است', 189, 285.4, { size: 2.6, color: '#5b6272' });
}
