// Document 5: our business card, A6 portrait (105 x 148 mm), Farsi only.
//
// FRONT (printed, the AR target): a night sky full of chaos - stars, soft colour nebulas,
//   gold shards, and the brand's own pieces (logo dots and lines, name words, tagline words,
//   contact icons, constellation stars) scattered at odd angles. Beautiful, but it makes no
//   sense until it is scanned. Lots of small, bold, non-repeating shapes = strong tracking.
// BACK (printed): only a QR code that opens the site (CONFIG.SITE_URL + ?from=card).
// ORDERED (never printed, used by the AR animation): the same sky made calm, with the
//   empty places where every piece lands.
// ATLAS (never printed): every piece drawn upright on a transparent sheet; the animation
//   cuts the flying sprites from it.
// The geometry of every piece (ordered place, scattered place, atlas cell) is computed here
// and written to js/docs/doc5.layout.js by tools/make-print.mjs.
import { el, rng, r2 } from './lib.js';
import { PAGE, ORDER, ATLAS_SIZE } from '../../js/docs/doc5.data.js';
import { CONFIG } from '../../js/config.js';

const NAVY1 = '#0a1222', NAVY2 = '#17243b', GOLD = '#d9b871', GOLD2 = '#f3e3b8', WHITE = '#f4f6fa';
const FONT = 'Vazirmatn';

export function build(svg, opts = {}) { return buildCard(svg, { ...opts, variant: 'pieces' }); }

// variant 'pieces' (doc5): brand pieces printed scattered on the front.
// variant 'sky' (doc6): the front is only sky; nothing on it can be told apart, and the
//   animation forms everything out of its stars (their positions are exported).
export function buildCard(svg, opts = {}) {
  const mode = opts.mode || 'front';
  const E = defineElements(svg);
  placeScattered(E);
  if (mode === 'atlas') return drawAtlas(svg, E);
  if (mode === 'back') return drawBack(svg, opts.qr);
  if (opts.variant === 'sky' && mode === 'front') {
    const stars = drawPureSky(svg);
    window.__doc5 = { elements: E.map(({ draw, ...rest }) => rest), links: ORDER.links, stars };
    return;
  }
  drawSky(svg, mode === 'front');
  if (mode === 'front') for (const e of E) drawAt(svg, e, e.scat, true);
  else drawOrderedExtras(svg, E);
  window.__doc5 = { elements: E.map(({ draw, ...rest }) => rest), links: ORDER.links };
}

// ---- the pieces ---------------------------------------------------------------------------
function measure(svg, text, size, weight) {
  const t = el('text', { 'font-family': FONT, 'font-size': size, 'font-weight': weight, direction: 'rtl' }, svg);
  t.textContent = text;
  const w = t.getComputedTextLength();
  t.remove();
  return w;
}

function defineElements(svg) {
  const E = [];
  const { logo } = ORDER;
  const pts = logo.pts.map(([x, y, r]) => [logo.x + x * logo.k, logo.y + y * logo.k, r * logo.k]);
  // constellation stars around the logo (fly first, then lines are drawn between them)
  ORDER.stars.forEach(([x, y, r], i) => E.push({ id: 'st' + i, kind: 'star', group: 'stars', r, ord: { x, y }, w: r * 6 + 1, h: r * 6 + 1 }));
  // logo: two bars and three dots
  [[0, 1], [1, 2]].forEach(([a, b], i) => {
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const w = Math.abs(len * Math.cos(ang * Math.PI / 180)) + 3, h = Math.abs(len * Math.sin(ang * Math.PI / 180)) + 3;
    E.push({ id: 'bar' + i, kind: 'bar', group: 'logo', len, ang, ord: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, w, h });
  });
  pts.forEach(([x, y, r], i) => E.push({ id: 'dot' + i, kind: 'dot', group: 'logo', r, hole: i === 1, ord: { x, y }, w: r * 3.4, h: r * 3.4 }));
  // brand name, word by word (right to left)
  const words = CONFIG.BRAND_NAME_FA.trim().split(/\s+/);
  const NS = ORDER.name.size, gap = NS * 0.32;
  const ws = words.map((w) => measure(svg, w, NS, 900));
  let cursor = PAGE.w / 2 + (ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1)) / 2;
  words.forEach((w, i) => { E.push({ id: 'nm' + i, kind: 'word', group: 'name', text: w, size: NS, weight: 900, color: WHITE, ord: { x: cursor - ws[i] / 2, y: ORDER.name.y }, w: ws[i] + 2, h: NS * 1.5 }); cursor -= ws[i] + gap; });
  // gold divider made of shards
  for (let i = 0; i < ORDER.divider.n; i++) {
    const x = ORDER.divider.x1 + (ORDER.divider.x2 - ORDER.divider.x1) * (i / (ORDER.divider.n - 1));
    E.push({ id: 'sh' + i, kind: 'shard', group: 'divider', ord: { x, y: ORDER.divider.y }, w: 4.2, h: 2.4 });
  }
  // tagline, word by word
  const tw = ORDER.tagline.text.split(' '), TS = ORDER.tagline.size, tg = TS * 0.3;
  const tws = tw.map((w) => measure(svg, w, TS, 700));
  cursor = PAGE.w / 2 + (tws.reduce((a, b) => a + b, 0) + tg * (tw.length - 1)) / 2;
  tw.forEach((w, i) => { E.push({ id: 'tg' + i, kind: 'word', group: 'tagline', text: w, size: TS, weight: 700, color: GOLD, ord: { x: cursor - tws[i] / 2, y: ORDER.tagline.y }, w: tws[i] + 2, h: TS * 1.5 }); cursor -= tws[i] + tg; });
  // what the company does (one piece)
  const SS = ORDER.sub.size, sw = measure(svg, CONFIG.BRAND_TAGLINE_FA, SS, 500);
  E.push({ id: 'sub', kind: 'word', group: 'sub', text: CONFIG.BRAND_TAGLINE_FA, size: SS, weight: 500, color: '#aab6c8', ord: { x: PAGE.w / 2, y: ORDER.sub.y }, w: sw + 2, h: SS * 1.6 });
  // contact icons (rows; the tappable links are added on screen by the app)
  ORDER.links.forEach((l) => E.push({ id: 'ic_' + l.id, kind: 'icon', group: 'icons', icon: l.id, ord: { x: ORDER.iconX, y: l.y }, w: 11, h: 11 }));
  return E;
}

// Scattered places: seeded, spread over the whole card, rotated, scaled, not piled up.
function placeScattered(E) {
  const R = rng(5151);
  const placed = [];
  for (const e of E) {
    let best = null;
    for (let k = 0; k < 80; k++) {
      const s = e.kind === 'word' ? 0.8 + R() * 0.45 : 0.75 + R() * 0.7;
      const half = Math.max(e.w, e.h) * s / 2;
      const x = 6 + half * 0.4 + R() * (PAGE.w - 12 - half * 0.8), y = 8 + half * 0.4 + R() * (PAGE.h - 16 - half * 0.8);
      const rot = (R() - 0.5) * (e.kind === 'word' ? 80 : e.kind === 'icon' ? 70 : 140);
      const clear = Math.min(...placed.map((p) => Math.hypot(p.x - x, p.y - y) - (p.half + half) * 0.75), 99);
      if (!best || clear > best.clear) best = { x, y, rot, s, clear, half };
      if (clear > 2) break;
    }
    e.scat = { x: r2(best.x), y: r2(best.y), rot: r2(best.rot), s: r2(best.s) };
    placed.push({ x: best.x, y: best.y, half: best.half });
  }
}

function drawAt(svg, e, pose, piece) {
  const g = el('g', { transform: `translate(${pose.x} ${pose.y}) rotate(${pose.rot || 0}) scale(${pose.s || 1})` }, svg);
  if (piece) g.setAttribute('data-piece', e.id);
  drawPiece(g, e);
}

function drawPiece(g, e) {
  if (e.kind === 'star') {
    el('circle', { r: e.r * 2.8, fill: 'url(#glowGold)', opacity: 0.85 }, g);
    el('circle', { r: e.r, fill: GOLD2 }, g);
  } else if (e.kind === 'bar') {
    el('rect', { x: -e.len / 2, y: -0.8, width: e.len, height: 1.6, rx: 0.8, fill: GOLD, transform: `rotate(${e.ang})` }, g);
  } else if (e.kind === 'dot') {
    el('circle', { r: e.r * 1.6, fill: 'url(#glowGold)', opacity: 0.6 }, g);
    el('circle', { r: e.r, fill: GOLD }, g);
    if (e.hole) el('circle', { r: e.r * 0.36, fill: NAVY1 }, g);
  } else if (e.kind === 'word') {
    const t = el('text', { x: 0, y: e.size * 0.36, 'font-family': FONT, 'font-size': e.size, 'font-weight': e.weight, fill: e.color, direction: 'rtl', 'text-anchor': 'middle' }, g);
    t.textContent = e.text;
  } else if (e.kind === 'shard') {
    el('path', { d: 'M-1.9 0 L0 -0.9 L1.9 0 L0 0.9 Z', fill: GOLD }, g);
  } else if (e.kind === 'icon') {
    el('circle', { r: 4.7, fill: '#1c2a44', stroke: GOLD, 'stroke-width': 0.55 }, g);
    if (e.icon === 'phone') el('path', { d: 'M-2.2 -2.6 q-0.8 0.8 0 2.4 q1.4 2.6 3.6 3.8 q1.4 0.6 2.2 -0.3 l0.4 -0.6 l-1.8 -1.5 l-0.9 0.8 q-1.5 -0.8 -2.4 -2.4 l0.8 -0.9 l-1.4 -1.8 Z', fill: WHITE }, g);
    if (e.icon === 'telegram') el('path', { d: 'M-2.8 0.2 L2.9 -2.4 L1.6 2.8 L-0.2 1.2 L2 -1.2 L-0.9 0.9 Z', fill: WHITE }, g);
    if (e.icon === 'web') { el('circle', { r: 2.6, fill: 'none', stroke: WHITE, 'stroke-width': 0.5 }, g); el('ellipse', { rx: 1.1, ry: 2.6, fill: 'none', stroke: WHITE, 'stroke-width': 0.45 }, g); el('path', { d: 'M-2.6 0 H2.6 M-2.2 -1.3 H2.2 M-2.2 1.3 H2.2', stroke: WHITE, 'stroke-width': 0.4 }, g); }
  }
}

// ---- backgrounds ------------------------------------------------------------------------------
function defs(svg) {
  const d = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0.35, y2: 1 }, d);
  el('stop', { offset: 0, 'stop-color': NAVY1 }, lg); el('stop', { offset: 1, 'stop-color': NAVY2 }, lg);
  const glow = (id, c) => { const g = el('radialGradient', { id }, d); el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': 1 }, g); el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': 0 }, g); };
  glow('glowGold', GOLD); glow('nebTeal', '#2f8fa3'); glow('nebViolet', '#7a5aa6'); glow('nebRose', '#c06a7a'); glow('nebGold', '#d9b871'); glow('glowWhite', '#ffffff');
  return d;
}

function drawSky(svg, chaos) {
  const R = rng(chaos ? 7070 : 8080);
  defs(svg);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sky)' }, svg);
  // nebulas: strong and colourful on the chaotic front, faint on the ordered card
  const k = chaos ? 1 : 0.45;
  [['nebTeal', 22, 38, 30, 0.42], ['nebViolet', 84, 96, 34, 0.38], ['nebRose', 26, 124, 24, 0.32], ['nebGold', 86, 26, 20, 0.22], ['nebTeal', 70, 140, 18, 0.25]]
    .forEach(([id, x, y, r, o]) => el('ellipse', { cx: x, cy: y, rx: r, ry: r * 0.8, fill: `url(#${id})`, opacity: o * k }, svg));
  // background stars (varied size and colour, never repeating)
  const n = chaos ? 170 : 70;
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, big = R() < (chaos ? 0.1 : 0.05);
    const r = big ? 0.7 + R() * 0.6 : 0.18 + R() * 0.38;
    const c = R() < 0.7 ? WHITE : R() < 0.5 ? GOLD2 : '#a9c8ff';
    if (big) el('circle', { cx: r2(x), cy: r2(y), r: r2(r * 3), fill: 'url(#glowWhite)', opacity: 0.35 }, svg);
    el('circle', { cx: r2(x), cy: r2(y), r: r2(r), fill: c, opacity: chaos ? 0.95 : 0.7 }, svg);
  }
  if (!chaos) return;
  // chaos only: broken constellation lines and colourful shards that make no sense
  for (let i = 0; i < 22; i++) {
    const x = 6 + R() * (W - 12), y = 6 + R() * (H - 12), a = R() * Math.PI, l = 4 + R() * 9;
    el('line', { x1: r2(x), y1: r2(y), x2: r2(x + Math.cos(a) * l), y2: r2(y + Math.sin(a) * l), stroke: R() < 0.6 ? GOLD : '#9fb8e8', 'stroke-width': 0.35 + R() * 0.3, opacity: 0.75, 'stroke-linecap': 'round' }, svg);
  }
  const cols = ['#3fb6c9', '#a07ad6', '#e08c9c', '#d9b871', '#7fd1a8'];
  for (let i = 0; i < 34; i++) {
    const x = 5 + R() * (W - 10), y = 5 + R() * (H - 10), s = 0.8 + R() * 1.8, rot = R() * 360;
    const shape = R() < 0.5 ? `M${-s} 0 L0 ${-s * 0.5} L${s} 0 L0 ${s * 0.5} Z` : `M${-s * 0.7} ${s * 0.5} L0 ${-s * 0.7} L${s * 0.7} ${s * 0.5} Z`;
    el('path', { d: shape, fill: cols[i % cols.length], opacity: 0.85, transform: `translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})` }, svg);
  }
}

// Variant 'sky' front: a deep night sky - Milky Way band, nebulas, bright stars with fine
// light spikes - and nothing else. Returns the visible stars [x, y, r] (mm) so the animation
// can make its particles rise from them. Bright spiked stars give strong tracking points.
function drawPureSky(svg) {
  const R = rng(9191);
  const d = defs(svg);
  const { w: W, h: H } = PAGE;
  const lg = el('linearGradient', { id: 'sky2', x1: 0, y1: 0, x2: 0.4, y2: 1 }, d);
  el('stop', { offset: 0, 'stop-color': '#070d1c' }, lg); el('stop', { offset: 0.55, 'stop-color': '#111a33' }, lg); el('stop', { offset: 1, 'stop-color': '#1a1f3d' }, lg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sky2)' }, svg);
  // Milky Way: a soft diagonal band
  const band = el('g', { transform: `rotate(-58 ${W / 2} ${H / 2})` }, svg);
  el('ellipse', { cx: W / 2, cy: H / 2, rx: 95, ry: 17, fill: 'url(#glowWhite)', opacity: 0.16 }, band);
  el('ellipse', { cx: W / 2 + 6, cy: H / 2, rx: 70, ry: 8, fill: 'url(#nebGold)', opacity: 0.14 }, band);
  [['nebTeal', 20, 30, 30, 0.4], ['nebViolet', 86, 104, 34, 0.38], ['nebRose', 30, 128, 22, 0.3], ['nebViolet', 18, 78, 16, 0.22], ['nebTeal', 88, 20, 18, 0.24]]
    .forEach(([id, x, y, r, o]) => el('ellipse', { cx: x, cy: y, rx: r, ry: r * 0.8, fill: `url(#${id})`, opacity: o }, svg));
  const stars = [];
  const along = () => { // a point near the band
    const t = R() * 2 - 1, off = (R() + R() + R() - 1.5) * 9;
    const a = -58 * Math.PI / 180;
    return [W / 2 + Math.cos(a) * t * 90 - Math.sin(a) * off, H / 2 + Math.sin(a) * t * 90 + Math.cos(a) * off];
  };
  // dust of the band (tiny)
  for (let i = 0; i < 520; i++) { const [x, y] = along(); if (x < 0 || y < 0 || x > W || y > H) continue; el('circle', { cx: r2(x), cy: r2(y), r: r2(0.1 + R() * 0.2), fill: '#e8eefc', opacity: r2(0.35 + R() * 0.45) }, svg); }
  // medium stars everywhere
  for (let i = 0; i < 160; i++) {
    const x = 2 + R() * (W - 4), y = 2 + R() * (H - 4), r = 0.28 + R() * 0.42;
    const c = R() < 0.7 ? WHITE : R() < 0.5 ? GOLD2 : '#a9c8ff';
    el('circle', { cx: r2(x), cy: r2(y), r: r2(r), fill: c, opacity: 0.92 }, svg);
    stars.push([r2(x), r2(y), r2(r)]);
  }
  // bright stars with four-point light spikes
  for (let i = 0; i < 30; i++) {
    const x = 6 + R() * (W - 12), y = 6 + R() * (H - 12), r = 0.75 + R() * 0.75, L = 2.5 + R() * 4.5;
    const c = R() < 0.55 ? WHITE : GOLD2, rot = R() < 0.5 ? 0 : 45;
    el('circle', { cx: r2(x), cy: r2(y), r: r2(r * 3.2), fill: 'url(#glowWhite)', opacity: 0.45 }, svg);
    const g = el('g', { transform: `translate(${r2(x)} ${r2(y)}) rotate(${rot})`, opacity: 0.9 }, svg);
    el('path', { d: `M${-L} 0 L0 ${-r * 0.22} L${L} 0 L0 ${r * 0.22} Z M0 ${-L} L${r * 0.22} 0 L0 ${L} L${-r * 0.22} 0 Z`, fill: c }, g);
    el('circle', { r: r2(r), fill: c }, g);
    stars.push([r2(x), r2(y), r2(r)]);
  }
  return stars;
}

// The calm card: guide lines for the contact rows and a faint ring where the logo forms.
function drawOrderedExtras(svg) {
  const { logo } = ORDER;
  el('circle', { cx: logo.x, cy: logo.y, r: 22, fill: 'url(#nebGold)', opacity: 0.18 }, svg);
  ORDER.links.forEach((l) => el('line', { x1: 14, x2: ORDER.iconX - 8, y1: l.y + 4.2, y2: l.y + 4.2, stroke: GOLD, 'stroke-width': 0.25, opacity: 0.45, 'stroke-dasharray': '0.6 1.2' }, svg));
  el('path', { d: `M${PAGE.w - 14} ${PAGE.h - 8} h10 M${PAGE.w - 9} ${PAGE.h - 13} v10`, stroke: GOLD, 'stroke-width': 0.4, opacity: 0.6 }, svg);
}

// ---- atlas: every piece upright on a transparent sheet ------------------------------------
function drawAtlas(svg, E) {
  const [AW, AH] = ATLAS_SIZE;
  svg.setAttribute('viewBox', `0 0 ${AW} ${AH}`);
  svg.setAttribute('width', `${AW}mm`); svg.setAttribute('height', `${AH}mm`);
  defs(svg);
  let x = 1, y = 1, rowH = 0;
  for (const e of E) {
    if (x + e.w > AW - 1) { x = 1; y += rowH + 1.5; rowH = 0; }
    if (y + e.h > AH - 1) throw new Error('atlas too small');
    e.atlas = [r2(x), r2(y), r2(e.w), r2(e.h)];
    drawAt(svg, e, { x: x + e.w / 2, y: y + e.h / 2 }, false);
    x += e.w + 1.5; rowH = Math.max(rowH, e.h);
  }
  window.__doc5 = { elements: E.map(({ draw, ...rest }) => rest), links: ORDER.links };
}

// ---- back: only the QR code -------------------------------------------------------------------
function drawBack(svg, qr) {
  const { w: W, h: H } = PAGE;
  defs(svg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sky)' }, svg);
  const s = 62, box = 74, x = (W - s) / 2, y = (H - s) / 2;
  el('rect', { x: (W - box) / 2, y: (H - box) / 2, width: box, height: box, rx: 6, fill: '#ffffff' }, svg);
  if (qr) {
    const n = qr.size, c = s / n;
    let d = '';
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (qr.data[j * n + i]) d += `M${r2(x + i * c)} ${r2(y + j * c)}h${r2(c + 0.02)}v${r2(c + 0.02)}h${r2(-c - 0.02)}Z`;
    el('path', { d, fill: NAVY1 }, svg);
  }
  window.__doc5 = null;
}
