// Browser-side drawing helpers for the print documents (run inside headless Chromium
// by tools/make-print.mjs). Everything is deterministic: same seed, same drawing.
export const NS = 'http://www.w3.org/2000/svg';

// Blank-form mode: when true, everything a person writes or draws by pen is left out, so the
// sheet can be printed and filled in by hand (see tools/make-print.mjs --template).
export const MODE = { template: false, collecting: null, readable: false };
/**
 * Pen work (doodles, ticks, signatures...). In blank-form mode it is still drawn and then
 * removed, so the random numbers used by everything else stay identical between the blank
 * form and the filled example (otherwise the printed "hand-drawn" grid would differ).
 */
export function ink(fn) {
  if (!MODE.template) return fn();
  const outer = MODE.collecting;
  MODE.collecting = [];
  fn();
  MODE.collecting.forEach((e) => e.remove());
  MODE.collecting = outer;
}

export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  if (MODE.collecting) MODE.collecting.push(e);
  return e;
}

export const r2 = (n) => Math.round(n * 100) / 100;

// A slightly shaky hand-drawn stroke through the given points.
export function wobble(points, R, amp = 0.35, step = 4) {
  const pts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n, off = (j === 0 || j === n) ? 0 : (R() - 0.5) * 2 * amp;
      pts.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
    }
  }
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${r2(pts[i][0])} ${r2(pts[i][1])} ${r2(mx)} ${r2(my)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${r2(last[0])} ${r2(last[1])}`;
  return d;
}

export function stroke(parent, points, R, { color = '#2a2f3a', width = 0.45, amp = 0.35, opacity = 0.9 } = {}) {
  return el('path', { d: wobble(points, R, amp), fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity }, parent);
}

// A loose hand-drawn ellipse (does not close perfectly, like a real pen loop).
export function loop(parent, cx, cy, rx, ry, R, opts = {}) {
  const pts = [];
  const start = R() * Math.PI * 2, turns = 1.12;
  for (let i = 0; i <= 28; i++) {
    const a = start + (i / 28) * Math.PI * 2 * turns;
    const k = 1 + (R() - 0.5) * 0.08;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return stroke(parent, pts, R, { amp: 0.1, ...opts });
}

// Handwritten line made of segments written right-to-left.
export function handLine(svg, item, R, fontFamily = 'HandFa') {
  if (MODE.template) { // blank form: the person writes this by hand (see ink())
    let g; ink(() => { g = drawHandLine(svg, item, R, fontFamily); });
    return g;
  }
  return drawHandLine(svg, item, R, fontFamily);
}
function drawHandLine(svg, item, R, fontFamily) {
  // readable example sheet: same positions, plain Vazirmatn so the writer can read it easily
  if (MODE.readable) { fontFamily = 'Vazirmatn'; item = { ...item, size: item.size * 0.8, weight: 500 }; }
  const g = el('g', { 'data-piece': item.id, transform: `rotate(${item.rot || 0} ${item.x} ${item.y})` }, svg);
  const gap = item.size * 0.55;
  let cursor = item.x;
  for (const seg of item.segs) {
    if (seg.x !== undefined) cursor = seg.x; // jump to a table column
    const align = seg.align || item.align;
    const t = el('text', {
      x: r2(cursor), y: item.y, 'font-family': fontFamily, 'font-size': item.size, 'font-weight': item.weight || 700, fill: item.ink,
      direction: 'rtl', 'unicode-bidi': 'embed', 'text-anchor': align === 'middle' ? 'middle' : 'start',
    }, g);
    t.textContent = seg.t;
    const w = t.getComputedTextLength();
    const right = align === 'middle' ? cursor + w / 2 : cursor;
    const left = right - w;
    const pen = { color: item.ink, width: item.size * 0.11 };
    if (seg.strike) {
      stroke(g, [[right + 0.8, item.y - item.size * 0.28], [left - 0.8, item.y - item.size * 0.36]], R, { ...pen, amp: 0.25 });
      stroke(g, [[right + 0.4, item.y - item.size * 0.12], [left - 0.6, item.y - item.size * 0.22]], R, { ...pen, amp: 0.25 });
    }
    if (seg.underline) {
      stroke(g, [[right + 0.5, item.y + item.size * 0.38], [left - 0.5, item.y + item.size * 0.32]], R, { ...pen, amp: 0.2 });
      stroke(g, [[right - 1, item.y + item.size * 0.58], [left + 1, item.y + item.size * 0.54]], R, { ...pen, amp: 0.2 });
    }
    if (seg.circle) loop(g, (left + right) / 2, item.y - item.size * 0.2, w / 2 + 2, item.size * 0.62, R, pen);
    cursor = left - gap;
  }
  return g;
}

// Subtle, non-repeating border band (varied motifs help image tracking; a strictly
// repeating pattern would confuse it).
export function border(svg, W, H, R, { inset = 5, band = 5, color = '#7d8494' } = {}) {
  const g = el('g', { opacity: 0.85 }, svg);
  el('rect', { x: inset, y: inset, width: W - 2 * inset, height: H - 2 * inset, fill: 'none', stroke: color, 'stroke-width': 0.35 }, g);
  el('rect', { x: inset + band, y: inset + band, width: W - 2 * (inset + band), height: H - 2 * (inset + band), fill: 'none', stroke: color, 'stroke-width': 0.25 }, g);
  const c = inset + band / 2;
  const place = (x, y) => {
    const k = Math.floor(R() * 5), s = 0.7 + R() * 0.7, rot = Math.floor(R() * 4) * 22.5;
    const m = el('g', { transform: `translate(${r2(x)} ${r2(y)}) rotate(${rot})` }, g);
    if (k === 0) el('circle', { r: s * 0.6, fill: color }, m);
    else if (k === 1) el('rect', { x: -s, y: -s, width: 2 * s, height: 2 * s, fill: 'none', stroke: color, 'stroke-width': 0.3, transform: 'rotate(45)' }, m);
    else if (k === 2) { el('path', { d: `M${-s} 0H${s}M0 ${-s}V${s}`, stroke: color, 'stroke-width': 0.35 }, m); }
    else if (k === 3) el('rect', { x: -s * 0.7, y: -s * 0.7, width: 1.4 * s, height: 1.4 * s, fill: color }, m);
    else el('path', { d: `M0 ${-s}L${s} ${s * 0.8}H${-s}Z`, fill: 'none', stroke: color, 'stroke-width': 0.3 }, m);
  };
  for (let x = c + 5; x < W - c - 3; x += 4.2 + R() * 2.4) { place(x, c); place(x, H - c); }
  for (let y = c + 5; y < H - c - 3; y += 4.2 + R() * 2.4) { place(c, y); place(W - c, y); }
  return g;
}

export function printedText(parent, text, x, y, { size = 4, weight = 400, color = '#2b2f38', anchor = 'start', rtl = true, family = 'Vazirmatn', spacing } = {}) {
  const t = el('text', { x, y, 'font-family': family, 'font-size': size, 'font-weight': weight, fill: color, direction: rtl ? 'rtl' : 'ltr', 'unicode-bidi': 'embed', 'text-anchor': anchor, 'letter-spacing': spacing }, parent);
  t.textContent = text;
  return t;
}

// Bold corner marks. Each document uses a different combination so the four pages never
// share their strongest features. kinds = [topLeft, topRight, bottomLeft, bottomRight].
export function cornerMarks(svg, W, H, kinds, color = '#232c3d', paper = '#fbf8f1') {
  const S = 14, m = 3;
  const spots = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
  kinds.forEach((kind, i) => {
    const [x, y, sx, sy] = spots[i];
    const cx = x + sx * S / 2, cy = y + sy * S / 2;
    const g = el('g', {}, svg);
    if (kind === 'L') el('path', { d: `M${x} ${y} h${sx * S} v${sy * 4} h${-sx * (S - 4)} v${sy * (S - 4)} h${-sx * 4} Z`, fill: color }, g);
    else if (kind === 'tri') el('path', { d: `M${x} ${y} h${sx * S} L${x} ${y + sy * S} Z`, fill: color }, g);
    else if (kind === 'dot') { el('circle', { cx, cy, r: 6.5, fill: color }, g); el('circle', { cx, cy, r: 2.4, fill: paper }, g); }
    else if (kind === 'notch') { el('rect', { x: Math.min(x, x + sx * S), y: Math.min(y, y + sy * S), width: S, height: S, fill: color }, g); el('rect', { x: Math.min(x, x + sx * 6), y: Math.min(y, y + sy * 6), width: 6, height: 6, fill: paper }, g); }
    else if (kind === 'plus') el('path', { d: `M${cx - 2.2} ${cy - 7} h4.4 v4.8 h4.8 v4.4 h-4.8 v4.8 h-4.4 v-4.8 h-4.8 v-4.4 h4.8 Z`, fill: color }, g);
    else if (kind === 'ring') el('circle', { cx, cy, r: 5.6, fill: 'none', stroke: color, 'stroke-width': 2.6 }, g);
    else if (kind === 'diamond') el('path', { d: `M${cx} ${cy - 7} L${cx + 7} ${cy} L${cx} ${cy + 7} L${cx - 7} ${cy} Z`, fill: color }, g);
    else if (kind === 'bars') [0, 1, 2].forEach((k) => el('rect', { x: Math.min(x, x + sx * S), y: Math.min(y, y + sy * S) + k * 5, width: S - k * 4, height: 3.2, fill: color, transform: sx < 0 ? `translate(${k * 4} 0)` : undefined }, g));
    else if (kind === 'half') el('path', { d: `M${cx - 7} ${cy} A7 7 0 0 1 ${cx + 7} ${cy} Z`, fill: color, transform: `rotate(${sy < 0 ? 180 : 0} ${cx} ${cy})` }, g);
  });
}

/** Persian digits + thousands separator for printed numbers. */
export const fa = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
export const faMoney = (n) => fa(n.toLocaleString('en-US').replace(/,/g, '٬'));

/** A QR-code-like block (random modules + three finder squares). Purely decorative,
 *  encodes nothing; gives very distinctive features for tracking. */
export function qrBlock(svg, x, y, size, R, color = '#1e2a36', paper = '#fbfaf6') {
  const n = 21, c = size / n;
  el('rect', { x, y, width: size, height: size, fill: paper }, svg);
  const finder = (fx, fy) => { el('rect', { x: x + fx * c, y: y + fy * c, width: 7 * c, height: 7 * c, fill: color }, svg); el('rect', { x: x + (fx + 1) * c, y: y + (fy + 1) * c, width: 5 * c, height: 5 * c, fill: paper }, svg); el('rect', { x: x + (fx + 2) * c, y: y + (fy + 2) * c, width: 3 * c, height: 3 * c, fill: color }, svg); };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const inFinder = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
    if (!inFinder && R() < 0.48) el('rect', { x: r2(x + i * c), y: r2(y + j * c), width: r2(c + 0.02), height: r2(c + 0.02), fill: color }, svg);
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}

// ---- Official-form building blocks (Iranian business-form style) --------------------
const FORM_DARK = '#1f2a3a';
const FORM_PAPER = '#fdfcf8';

/** Thin double page frame used on official forms. */
export function formFrame(svg, W, H) {
  el('rect', { x: 8, y: 8, width: W - 16, height: H - 16, fill: 'none', stroke: FORM_DARK, 'stroke-width': 0.8 }, svg);
  el('rect', { x: 9.6, y: 9.6, width: W - 19.2, height: H - 19.2, fill: 'none', stroke: FORM_DARK, 'stroke-width': 0.25 }, svg);
}

/** Fictional company emblem (not our brand). */
export function emblem(svg, cx, cy, r, color = FORM_DARK, paper = FORM_PAPER) {
  const g = el('g', { transform: `translate(${cx} ${cy})` }, svg);
  const hex = (rr) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${r2(Math.cos(a) * rr)},${r2(Math.sin(a) * rr)}`; }).join(' ');
  el('polygon', { points: hex(r), fill: color }, g);
  el('polygon', { points: hex(r * 0.72), fill: 'none', stroke: paper, 'stroke-width': r * 0.09 }, g);
  [-0.26, 0, 0.26].forEach((y, i) => el('rect', { x: -r * (0.36 - i * 0.07), y: r * (y - 0.06), width: r * (0.72 - i * 0.14), height: r * 0.12, fill: paper }, g));
}

/**
 * Header box: company (right) | dark title cell (middle) | number/date/attachment (left).
 * Returns the y where the header ends.
 */
export function formHeader(svg, { y = 12, h = 30, company, unit, title, subtitle, fields = ['شماره:', 'تاریخ:', 'پیوست:'], fieldValues = {} }) {
  const x1 = 14, x2 = 196, cRight = 150, cLeft = 64;
  el('rect', { x: x1, y, width: x2 - x1, height: h, fill: FORM_PAPER, stroke: FORM_DARK, 'stroke-width': 0.9 }, svg);
  el('rect', { x: cLeft, y, width: cRight - cLeft, height: h, fill: FORM_DARK }, svg);
  emblem(svg, 186, y + h / 2 - 2, 7);
  // company name and unit shrink to fit between the emblem and the dark title cell
  const fit = (t, maxW) => { const w = t.getComputedTextLength(); if (w > maxW) t.setAttribute('font-size', String(parseFloat(t.getAttribute('font-size')) * maxW / w)); };
  fit(printedText(svg, company, 176, y + h / 2 - 1.5, { size: 3.8, weight: 800, color: FORM_DARK }), 176 - cRight - 2);
  fit(printedText(svg, unit, 176, y + h / 2 + 4.5, { size: 2.7, weight: 500, color: '#4b5565' }), 176 - cRight - 2);
  printedText(svg, title, (cLeft + cRight) / 2, y + h / 2 + (subtitle ? 0 : 2), { size: 5.4, weight: 900, color: FORM_PAPER, anchor: 'middle' });
  if (subtitle) printedText(svg, subtitle, (cLeft + cRight) / 2, y + h / 2 + 6.5, { size: 2.9, weight: 500, color: '#c3cad6', anchor: 'middle' });
  fields.forEach((f, i) => {
    const fy = y + 9.5 + i * 8.5;
    printedText(svg, f, cLeft - 2, fy, { size: 3.2, weight: 700, color: FORM_DARK });
    if (fieldValues[f]) printedText(svg, fieldValues[f], cLeft - 15, fy, { size: 3.2, weight: 500, color: '#3b4452' });
    else el('line', { x1: x1 + 4, x2: cLeft - 15, y1: fy + 0.8, y2: fy + 0.8, stroke: '#8d95a3', 'stroke-width': 0.3, 'stroke-dasharray': '0.8 0.8' }, svg);
  });
  return y + h;
}

/** Dark section bar with a number badge and title. */
export function sectionBar(svg, y, num, title, { x1 = 14, x2 = 196, h = 7 } = {}) {
  el('rect', { x: x1, y, width: x2 - x1, height: h, fill: FORM_DARK }, svg);
  el('rect', { x: x2 - 9, y, width: 9, height: h, fill: '#c9a45c' }, svg);
  printedText(svg, num, x2 - 4.5, y + h / 2 + 1.3, { size: 3.6, weight: 900, color: FORM_DARK, anchor: 'middle' });
  printedText(svg, title, x2 - 12, y + h / 2 + 1.3, { size: 3.6, weight: 800, color: FORM_PAPER });
}

/** Signature boxes with role on top and "name and signature" at the bottom. */
export function signatureBoxes(svg, y, roles, { x1 = 14, x2 = 196, h = 24 } = {}) {
  const w = (x2 - x1) / roles.length;
  roles.forEach((role, i) => {
    const bx = x2 - w * (i + 1);
    el('rect', { x: bx, y, width: w, height: h, fill: 'none', stroke: FORM_DARK, 'stroke-width': 0.6 }, svg);
    el('rect', { x: bx, y, width: w, height: 6, fill: FORM_DARK }, svg);
    printedText(svg, role, bx + w / 2, y + 4.3, { size: 3, weight: 800, color: FORM_PAPER, anchor: 'middle' });
    printedText(svg, 'نام و امضا', bx + w / 2, y + h - 2, { size: 2.4, weight: 500, color: '#6b7380', anchor: 'middle' });
  });
  return (i) => [x2 - w * (i + 1), y, w, h];
}

/** Round rubber stamp (printed; on real paperwork it would be stamped by hand). */
export function roundStamp(svg, cx, cy, r, top, middle, bottom, R, { color = '#b0281f', rot = -14 } = {}) {
  const g = el('g', { transform: `rotate(${rot} ${cx} ${cy})`, opacity: 0.85 }, svg);
  el('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': r * 0.11 }, g);
  el('circle', { cx, cy, r: r * 0.78, fill: 'none', stroke: color, 'stroke-width': r * 0.04 }, g);
  el('rect', { x: cx - r * 1.08, y: cy - r * 0.24, width: r * 2.16, height: r * 0.48, fill: FORM_PAPER, stroke: color, 'stroke-width': r * 0.07 }, g);
  printedText(g, middle, cx, cy + r * 0.11, { size: r * 0.3, weight: 900, color, anchor: 'middle' });
  printedText(g, top, cx, cy - r * 0.4, { size: r * 0.18, weight: 700, color, anchor: 'middle' });
  printedText(g, bottom, cx, cy + r * 0.58, { size: r * 0.2, weight: 700, color, anchor: 'middle' });
  for (let i = 0; i < 16; i++) el('circle', { cx: r2(cx + (R() - 0.5) * r * 2), cy: r2(cy + (R() - 0.5) * r * 2), r: r2(0.2 + R() * 0.45), fill: FORM_PAPER }, g);
}

/** Barcode strip (decorative). */
export function barcode(svg, x, y, w, h, R, color = FORM_DARK) {
  let bx = x;
  while (bx < x + w) { const bw = 0.35 + Math.floor(R() * 4) * 0.4; if (bx + bw > x + w) break; el('rect', { x: r2(bx), y, width: r2(bw), height: h, fill: color }, svg); bx += bw + 0.35 + R() * 0.8; }
}

/** Dark vertical strip in the left margin with the form code (as on printed form pads). */
export function sideStrip(svg, H, code, { x = 2.6, w = 4.6, y1 = 70, y2 = 228 } = {}) {
  el('rect', { x, y: y1, width: w, height: y2 - y1, fill: FORM_DARK }, svg);
  const cy = (y1 + y2) / 2;
  const t = printedText(svg, code, x + w / 2 + 1.1, cy, { size: 3, weight: 800, color: FORM_PAPER, anchor: 'middle' });
  t.setAttribute('transform', `rotate(-90 ${x + w / 2 + 1.1} ${cy})`);
  // uneven light notches make the strip easy to tell apart from any other edge
  [[9, 2.2], [24, 4], [cy - y1 + 26, 2.6], [y2 - y1 - 30, 5], [y2 - y1 - 12, 2.2]].forEach(([o, hh]) => el('rect', { x, y: y1 + o, width: w, height: hh, fill: '#c9a45c' }, svg));
}

/** Rectangular rubber stamp (e.g. «فوری»). */
export function rectStamp(svg, cx, cy, w, h, label, { color = '#b0281f', rot = -8, solid = false } = {}) {
  const g = el('g', { transform: `rotate(${rot} ${cx} ${cy})`, opacity: 0.92 }, svg);
  if (solid) {
    el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 1.4, fill: color }, g);
    printedText(g, label, cx, cy + h * 0.17, { size: h * 0.5, weight: 900, color: FORM_PAPER, anchor: 'middle' });
    return;
  }
  el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 1.4, fill: 'none', stroke: color, 'stroke-width': 1.6 }, g);
  el('rect', { x: cx - w / 2 + 1.6, y: cy - h / 2 + 1.6, width: w - 3.2, height: h - 3.2, rx: 0.8, fill: 'none', stroke: color, 'stroke-width': 0.5 }, g);
  printedText(g, label, cx, cy + h * 0.17, { size: h * 0.48, weight: 900, color, anchor: 'middle' });
}

/** Two punched binder holes (right margin). */
export function punchHoles(svg, W, ys = [100, 197]) {
  ys.forEach((y) => { el('circle', { cx: W - 4.6, cy: y, r: 2.8, fill: '#3a3f4a' }, svg); el('circle', { cx: W - 4.6, cy: y, r: 2.8, fill: 'none', stroke: '#c9c3b5', 'stroke-width': 0.5 }, svg); });
}

/** Small dark tab on the page edge, e.g. «نسخهٔ ۱ · بایگانی» (copy label on form pads). */
export function edgeTab(svg, x, y, w, h, label) {
  el('rect', { x, y, width: w, height: h, rx: 0.8, fill: FORM_DARK }, svg);
  printedText(svg, label, x + w / 2, y + h / 2 + 1.05, { size: h * 0.5, weight: 800, color: FORM_PAPER, anchor: 'middle' });
}
