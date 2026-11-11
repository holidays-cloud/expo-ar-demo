// Document 5: our business card, A6 portrait (105 x 148 mm), Farsi only.
// Brand name / tagline / phone / QR address come from js/config.js (placeholders).
// Built for close-range tracking (15-30 cm): bold, high-contrast, non-repeating shapes
// (dark top with an irregular star field, slanted edge, icon discs, QR finder squares,
// gold corner shapes). Each element sits in a data-piece group so the animation can lift it.
import { el, rng, printedText, r2, ink } from './lib.js';
import { PAGE } from '../../js/docs/doc5.data.js';
import { CONFIG } from '../../js/config.js';

const NAVY = '#141c27';
const GOLD = '#d9b871';
const PAPER = '#fdfcf8';
const INK = '#18202b';

export function build(svg, opts = {}) {
  const R = rng(5150);
  const { w: W, h: H } = PAGE;
  el('rect', { x: 0, y: 0, width: W, height: H, fill: PAPER }, svg);

  // ---- dark top with a slanted lower edge ----------------------------------------------
  el('path', { d: `M0 0 H${W} V61 L0 73 Z`, fill: NAVY }, svg);
  el('path', { d: `M0 73 L${W} 61 V64.5 L0 76.5 Z`, fill: GOLD }, svg); // gold edge band
  // star field: scattered on the left, becoming ordered towards the right (the idea of the brand)
  const stars = [];
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const x = 6 + t * 93 + (R() - 0.5) * 14 * (1 - t);
    const y = 8 + (R() - 0.5) * 6 + (1 - t) * (R() * 44) + t * (10 + 3 * Math.sin(t * 9));
    stars.push([x, y]);
  }
  stars.forEach(([x, y], i) => el('circle', { cx: r2(x), cy: r2(y), r: r2(0.45 + ((i * 7) % 5) * 0.28), fill: i % 4 === 0 ? GOLD : '#e9edf3', opacity: 0.9 }, svg));
  // a small constellation drawn on the right (lines between some stars)
  const cons = [[74, 48], [83, 41], [94, 45], [98, 33], [88, 27]];
  el('path', { d: 'M' + cons.map((p) => p.join(' ')).join(' L'), fill: 'none', stroke: GOLD, 'stroke-width': 0.45, opacity: 0.85 }, svg);
  cons.forEach(([x, y], i) => el('circle', { cx: x, cy: y, r: i === 2 ? 1.5 : 1.05, fill: GOLD }, svg));
  // gold corner triangle (top-left) - unique shape for tracking
  el('path', { d: 'M0 0 H15 L0 15 Z', fill: GOLD }, svg);

  // ---- brand block ---------------------------------------------------------------------------
  piece(svg, 'logo', (g) => {
    const cx = 52.5, cy = 24;
    el('path', { d: `M${cx - 12} ${cy + 7} L${cx} ${cy - 8} L${cx + 12} ${cy + 3}`, fill: 'none', stroke: GOLD, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    [[cx - 12, cy + 7, 3.1], [cx, cy - 8, 3.6], [cx + 12, cy + 3, 3.1]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: GOLD }, g));
    el('circle', { cx, cy: cy - 8, r: 1.3, fill: NAVY }, g);
  });
  piece(svg, 'name', (g) => printedText(g, CONFIG.BRAND_NAME_FA, 52.5, 44, { size: 8.2, weight: 900, color: PAPER, anchor: 'middle' }));
  piece(svg, 'tagline', (g) => printedText(g, 'از پراکندگی تا نظم', 52.5, 51.5, { size: 4.6, weight: 700, color: GOLD, anchor: 'middle' }));
  piece(svg, 'sub', (g) => printedText(g, CONFIG.BRAND_TAGLINE_FA, 52.5, 57.5, { size: 3.2, weight: 500, color: '#b9c2cf', anchor: 'middle' }));

  // ---- contact rows with dark icon discs -----------------------------------------------------
  const row = (id, y, icon, text, sub) => piece(svg, id, (g) => {
    el('circle', { cx: 92, cy: y, r: 4.4, fill: NAVY }, g);
    icon(g, 92, y);
    printedText(g, text, 85, y + (sub ? -0.6 : 1.5), { size: sub ? 4.2 : 4.6, weight: 800, color: INK });
    if (sub) printedText(g, sub, 85, y + 4.4, { size: 2.9, weight: 500, color: '#5b6272' });
  });
  row('row1', 86, iconPhone, CONFIG.PHONE_DISPLAY_FA, 'تلفن');
  row('row2', 98, iconChat, 'تلگرام و وب‌سایت', 'کد پایین کارت را اسکن کنید');
  row('row3', 110, iconSpark, 'این کارت زنده است!', 'روی سایت، دوربین را روی آن بگیرید');

  // ---- QR code (opens the site) ------------------------------------------------------------------
  piece(svg, 'qr', (g) => {
    const x = 8, y = 113, s = 30;
    el('rect', { x: x - 2, y: y - 2, width: s + 4, height: s + 4, rx: 1.5, fill: PAPER, stroke: NAVY, 'stroke-width': 0.8 }, g);
    if (opts.qr) {
      const n = opts.qr.size, c = s / n;
      let d = '';
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (opts.qr.data[j * n + i]) d += `M${r2(x + i * c)} ${r2(y + j * c)}h${r2(c + 0.01)}v${r2(c + 0.01)}h${r2(-c - 0.01)}Z`;
      el('path', { d, fill: NAVY }, g);
    } else printedText(g, 'QR', x + s / 2, y + s / 2, { size: 6, weight: 900, color: NAVY, rtl: false, anchor: 'middle' });
  });
  piece(svg, 'scan', (g) => {
    el('rect', { x: 46, y: 121, width: 51, height: 12, rx: 6, fill: NAVY }, g);
    printedText(g, 'اسکن کنید و ببینید', 71.5, 128.6, { size: 4.2, weight: 800, color: PAPER, anchor: 'middle' });
    el('path', { d: 'M45 127 l-5 -3.4 v6.8 Z', fill: NAVY }, g);
  });

  // ---- bottom: gold bar + quarter disc (more unique shapes) ------------------------------------
  el('rect', { x: 46, y: 141, width: W - 46, height: 7, fill: GOLD }, svg);
  el('path', { d: `M${W} ${H - 13} A13 13 0 0 0 ${W - 13} ${H} H${W} Z`, fill: NAVY }, svg);
  printedText(svg, 'نمونهٔ نمایشی', 68, 145.8, { size: 2.6, weight: 700, color: NAVY, anchor: 'middle' });
}

// In blank mode (MODE.template) the piece is left out: that render is the card's
// background, used by the animation to hide the real elements before they fly in.
function piece(svg, id, draw) {
  const g = el('g', { 'data-piece': id }, svg);
  ink(() => draw(g));
  return g;
}

function iconPhone(g, cx, cy) {
  el('path', { d: `M${cx - 2.2} ${cy - 2.6} q-0.8 0.8 0 2.4 q1.4 2.6 3.6 3.8 q1.4 0.6 2.2 -0.3 l0.4 -0.6 l-1.8 -1.5 l-0.9 0.8 q-1.5 -0.8 -2.4 -2.4 l0.8 -0.9 l-1.4 -1.8 Z`, fill: PAPER }, g);
}
function iconChat(g, cx, cy) {
  el('path', { d: `M${cx - 2.8} ${cy + 0.2} L${cx + 2.9} ${cy - 2.4} L${cx + 1.6} ${cy + 2.8} L${cx - 0.2} ${cy + 1.2} L${cx + 2} ${cy - 1.2} L${cx - 0.9} ${cy + 0.9} Z`, fill: PAPER }, g);
}
function iconSpark(g, cx, cy) {
  el('path', { d: `M${cx} ${cy - 3} L${cx + 0.9} ${cy - 0.9} L${cx + 3} ${cy} L${cx + 0.9} ${cy + 0.9} L${cx} ${cy + 3} L${cx - 0.9} ${cy + 0.9} L${cx - 3} ${cy} L${cx - 0.9} ${cy - 0.9} Z`, fill: GOLD }, g);
}
