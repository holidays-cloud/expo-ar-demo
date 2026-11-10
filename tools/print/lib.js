// Browser-side drawing helpers for the print documents (run inside headless Chromium
// by tools/make-print.mjs). Everything is deterministic: same seed, same drawing.
export const NS = 'http://www.w3.org/2000/svg';

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
  const g = el('g', { 'data-piece': item.id, transform: `rotate(${item.rot || 0} ${item.x} ${item.y})` }, svg);
  const gap = item.size * 0.55;
  let cursor = item.x;
  for (const seg of item.segs) {
    const t = el('text', {
      x: r2(cursor), y: item.y, 'font-family': fontFamily, 'font-size': item.size, 'font-weight': item.weight || 700, fill: item.ink,
      direction: 'rtl', 'unicode-bidi': 'embed', 'text-anchor': item.align === 'middle' ? 'middle' : 'start',
    }, g);
    t.textContent = seg.t;
    const w = t.getComputedTextLength();
    const right = item.align === 'middle' ? cursor + w / 2 : cursor;
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
