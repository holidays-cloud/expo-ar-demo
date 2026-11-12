// Own card: the visitor's card becomes a constellation of its own design.
// The ink of the card (logo, name, lines; everything that stands out from its background)
// is sampled into a few thousand stars. They burst into a swirling 3D nebula, then fly back
// and hold the exact shape of the card's design in light; bright anchor stars on each part
// are joined by gold lines. Image processing only: the card's text is never read.
//
// Timeline (s): 0.6 light sweep, stars light up on the ink, paper drifts away | 1.9 burst into
// a spinning galaxy | 5.0 stars fly back into the design | 6.9 anchors + gold lines | 7.4 dotted
// frame | 8.0 glint | 8.4 title | 8.8 brand mark.
// createCardStars(photo, opts) -> { render(g, W, H, t, o) }   (pure function of t)
// playCardStars(container, opts) -> { stop(), poster() }       (the on-screen player)
import { cleanUp, drawBrand, roundRect } from './card-util.js';

const FONT = 'Vazirmatn, Tahoma, sans-serif';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const phase = (t, a, d) => clamp01((t - a) / d);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const DURATION = 10.5;
/** Keeps the pixel's hue, makes it bright like a star (black/grey ink -> warm white). */
function starColour(r, g, b) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, s = mx === 0 ? 0 : (mx - mn) / mx;
  if (s < 0.25 || mx < 0.35) return [255, 244, 222]; // grey, black and very dark ink: warm white
  const k = 255 / Math.max(r, g, b);
  return [r, g, b].map((v) => Math.round(Math.min(255, v * k * 0.75 + 70)));
}

function inkMask(clean) {
  const ww = 320, wh = Math.round(320 * clean.height / clean.width), N = ww * wh;
  const c = canvas(ww, wh), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(clean, 0, 0, ww, wh);
  const px = g.getImageData(0, 0, ww, wh).data;
  const ring = [[], [], []], bw = Math.round(ww * 0.05);
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    if (x >= bw && x < ww - bw && y >= bw && y < wh - bw) continue;
    const o = (y * ww + x) * 4; ring[0].push(px[o]); ring[1].push(px[o + 1]); ring[2].push(px[o + 2]);
  }
  const bg = ring.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });
  const dist = new Uint8Array(N), hist = new Uint32Array(256);
  for (let i = 0; i < N; i++) { const o = i * 4, dr = px[o] - bg[0], dg = px[o + 1] - bg[1], db = px[o + 2] - bg[2]; const v = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) * 0.75)); dist[i] = v; hist[v]++; }
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sB = 0, wB = 0, best = 0, thr = 40;
  for (let v = 0; v < 256; v++) { wB += hist[v]; if (!wB) continue; const wF = N - wB; if (!wF) break; sB += v * hist[v]; const mB = sB / wB, mF = (sum - sB) / wF, bt = wB * wF * (mB - mF) * (mB - mF); if (bt > best) { best = bt; thr = v; } }
  thr = Math.max(26, Math.min(110, thr));
  const mask = new Uint8Array(N);
  const m = Math.round(ww * 0.03); // the photo's own edges (desk, card border) are not ink
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x; mask[i] = x >= m && x < ww - m && y >= m && y < wh - m && dist[i] > thr ? 1 : 0; }
  return { ww, wh, mask, px, bg };
}

export function createCardStars(photo, opts = {}) {
  const clean = cleanUp(photo);
  const { ww, wh, mask, px } = inkMask(clean);
  const N = ww * wh, aspect = ww / wh;
  const R = mulberry(9001);

  // ---- stars on the ink: edges weighted more, at most one star per cell ----
  const edge = (i) => { const x = i % ww; return (x > 0 && !mask[i - 1]) || (x < ww - 1 && !mask[i + 1]) || (i >= ww && !mask[i - ww]) || (i + ww < N && !mask[i + ww]); };
  const idx = []; for (let i = 0; i < N; i++) if (mask[i]) idx.push(i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const MAXS = opts.maxStars || 5200, taken = new Uint8Array(N), stars = [];
  for (const i of idx) {
    if (stars.length >= MAXS) break;
    if (taken[i] || R() > (edge(i) ? 0.95 : 0.55)) continue;
    const x = i % ww, y = (i - x) / ww;
    taken[i] = 1; if (x + 1 < ww) taken[i + 1] = 1; if (i + ww < N) taken[i + ww] = 1;
    const o = i * 4;
    const col = starColour(px[o], px[o + 1], px[o + 2]); // the card's colour, made star-bright
    const ang = R() * 6.28, rad = Math.pow(R(), 0.7) * 1.0, arm = Math.floor(R() * 2) * Math.PI;
    stars.push({ i, u: (x + 0.5) / ww - 0.5, v: (y + 0.5) / wh - 0.5, col, sz: 0.7 + R() * 0.7, tw: R() * 6.28,
      // nebula: a two-armed spiral galaxy seen at an angle
      neb: [Math.cos(ang * 0.25 + arm + rad * 4) * rad * 0.62 + (R() - 0.5) * 0.08, (R() - 0.5) * 0.1 * (1.2 - rad), Math.sin(ang * 0.25 + arm + rad * 4) * rad * 0.62 + (R() - 0.5) * 0.08], delay: R() * 0.9 });
  }
  // background flecks (the card's paper colour), they drift away and become faint sky
  const flecks = [];
  for (let k = 0; k < 900; k++) { const x = Math.floor(R() * ww), y = Math.floor(R() * wh), o = (y * ww + x) * 4; if (mask[y * ww + x]) continue; flecks.push({ u: x / ww - 0.5, v: y / wh - 0.5, col: `rgb(${px[o]},${px[o + 1]},${px[o + 2]})`, dir: R() * 6.28, sp: 0.4 + R() * 1.2 }); }

  // ---- anchors: big stars on each part (blobs of the dilated ink) joined by gold lines ----
  const dil = new Uint8Array(N);
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) if (mask[y * ww + x]) for (let yy = Math.max(0, y - 2); yy <= Math.min(wh - 1, y + 2); yy++) for (let xx = Math.max(0, x - 5); xx <= Math.min(ww - 1, x + 5); xx++) dil[yy * ww + xx] = 1;
  const lab = new Int32Array(N), blobs = [], stack = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!dil[i] || lab[i]) continue;
    const id = blobs.length + 1; let sp = 0, cnt = 0, x0 = ww, x1 = 0, y0 = wh, y1 = 0; stack[sp++] = i; lab[i] = id;
    while (sp) { const j = stack[--sp], x = j % ww, y = (j - x) / ww; cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [x > 0 ? j - 1 : -1, x < ww - 1 ? j + 1 : -1, j - ww, j + ww]) if (q >= 0 && q < N && dil[q] && !lab[q]) { lab[q] = id; stack[sp++] = q; } }
    blobs.push({ cnt, x0, x1, y0, y1 });
  }
  blobs.forEach((b, k) => (b.id = k + 1));
  const big = blobs.filter((b) => b.cnt > N * 0.002).sort((a, b) => b.cnt - a.cnt).slice(0, 12);
  // layer depth per part, for 3D views: the biggest part (usually the logo or name) in front
  const rankOf = new Map(blobs.slice().sort((a, b) => b.cnt - a.cnt).map((b, r) => [b.id, r]));
  const nb = Math.min(blobs.length, 10);
  for (const st of stars) { const r = rankOf.get(lab[st.i]); st.depth = r === undefined ? 0 : 0.16 * Math.max(0, 1 - r / Math.max(1, nb - 1)); }
  const anchors = [];
  for (const b of big) {
    const cy = (b.y0 + b.y1) / 2, w = b.x1 - b.x0, h = b.y1 - b.y0;
    const pts = w > h * 2.5 ? [[b.x0, cy], [b.x1, cy]] : [[(b.x0 + b.x1) / 2, cy]];
    for (const [x, y] of pts) anchors.push({ u: x / ww - 0.5, v: y / wh - 0.5 });
  }
  const links = []; // minimum spanning tree (Prim)
  if (anchors.length > 1) {
    const inT = [0], left = anchors.map((a, i) => i).slice(1);
    while (left.length) {
      let bd = 1e9, bi = 0, bj = 0;
      for (const i of inT) for (let k = 0; k < left.length; k++) { const a = anchors[i], b = anchors[left[k]]; const d = Math.hypot(a.u - b.u, (a.v - b.v) / aspect); if (d < bd) { bd = d; bi = i; bj = k; } }
      links.push([bi, left[bj]]); inT.push(left[bj]); left.splice(bj, 1);
    }
  }

  // ---- sprites ----
  const dots = new Map();
  const dot = (c) => { const key = c.join(','); if (!dots.has(key)) { const s = canvas(16, 16), g = s.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, `rgba(255,255,255,1)`); gr.addColorStop(0.18, `rgba(${key},1)`); gr.addColorStop(0.4, `rgba(${key},0.35)`); gr.addColorStop(1, `rgba(${key},0)`); g.fillStyle = gr; g.fillRect(0, 0, 16, 16); dots.set(key, s); } return dots.get(key); };
  for (const s of stars) { s.col = s.col.map((v) => Math.round(v / 24) * 24); s.img = dot(s.col); }
  const glow = canvas(64, 64);
  { const g = glow.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.15, 'rgba(255,232,180,0.85)'); gr.addColorStop(0.5, 'rgba(217,184,113,0.2)'); gr.addColorStop(1, 'rgba(217,184,113,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  // the design drawn in soft light (shown faintly under the stars once they are home)
  const lightInk = canvas(ww, wh);
  { const lg = lightInk.getContext('2d'), li = lg.createImageData(ww, wh);
    for (let i = 0; i < N; i++) if (mask[i]) { const c = starColour(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); li.data[i * 4] = c[0]; li.data[i * 4 + 1] = c[1]; li.data[i * 4 + 2] = c[2]; li.data[i * 4 + 3] = 255; }
    lg.putImageData(li, 0, 0); }
  const sky = mulberry(5); const bgStars = Array.from({ length: 160 }, () => [sky(), sky(), sky() < 0.9 ? 0.7 : 1.3, sky() * 6.28]);

  function render(g, W, H, t, o = {}) {
    const step = o.step || 1; // draw every n-th star on slow phones
    const land = W > H * 1.1;
    const cw = land ? Math.min(W * 0.5, H * 0.66 * aspect) : Math.min(W * 0.9, H * 0.42 * aspect), ch = cw / aspect;
    const cx = land ? W * 0.3 : W / 2, cy = land ? H / 2 : H * 0.36;
    const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, '#04070f'); bgr.addColorStop(1, '#0f1a30');
    g.fillStyle = bgr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8d2e6';
    for (const s of bgStars) { g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.3 + s[3]); g.fillRect(s[0] * W, s[1] * H, s[2], s[2]); }
    g.globalAlpha = 1;

    // the photo, swept away from right to left
    const sweep = phase(t, 0.6, 1.0); // 0..1 across the card
    const photoA = 1 - phase(t, 1.4, 0.4);
    if (photoA > 0) {
      g.save(); roundRect(g, cx - cw / 2, cy - ch / 2, cw, ch, cw * 0.03); g.clip();
      g.globalAlpha = photoA; g.drawImage(clean, cx - cw / 2, cy - ch / 2, cw, ch);
      // already-swept part darkens into night
      const sx = cx + cw / 2 - cw * sweep;
      g.globalAlpha = photoA * 0.92; g.fillStyle = '#05080f'; g.fillRect(sx, cy - ch / 2, cx + cw / 2 - sx, ch);
      g.restore();
      if (sweep > 0 && sweep < 1) { const sx2 = cx + cw / 2 - cw * sweep, gr = g.createLinearGradient(sx2 - 14, 0, sx2 + 14, 0); gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.5, 'rgba(255,236,190,0.9)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(sx2 - 14, cy - ch / 2 - 6, 28, ch + 12); }
    }
    // paper flecks drift away
    const fl = phase(t, 1.0, 2.2);
    if (fl > 0 && fl < 1) {
      for (const f of flecks) {
        const ign = phase(t, 0.6 + (0.5 - f.u) * 1.0, 0.25); if (ign <= 0) continue;
        const d = easeOut(fl) * f.sp * cw * 0.6;
        g.globalAlpha = ign * (1 - fl) * 0.7; g.fillStyle = f.col;
        g.fillRect(cx + f.u * cw + Math.cos(f.dir) * d, cy + f.v * ch + Math.sin(f.dir) * d + d * 0.3, 1.6, 1.6);
      }
      g.globalAlpha = 1;
    }

    // 3D view of the stars: nebula phase rotates; the design faces the viewer at the end
    const burst = ease(phase(t, 1.9, 1.1));
    const spin = (t - 1.9) * 0.55;
    const yaw = burst * Math.sin(spin) * 0.9 * (1 - phase(t, 5.4, 1.4));
    const pitch = burst * (0.62 + 0.15 * Math.sin(spin * 0.7)) * (1 - phase(t, 5.4, 1.4)); // tilted so the galaxy disc shows
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), spc = Math.sin(pitch);
    const camD = 2.4;
    g.globalCompositeOperation = 'lighter';
    for (let si = 0; si < stars.length; si += step) {
      const s = stars[si];
      const ign = phase(t, 0.6 + (0.5 - s.u) * 1.0, 0.2); if (ign <= 0) continue;
      const back = ease(phase(t, 5.0 + s.delay, 1.3)); // back into the design
      const k = burst * (1 - back);
      // nebula position swirls around the vertical axis
      const a = spin * (0.6 + 0.4 * Math.abs(s.neb[1])), ca = Math.cos(a), sa = Math.sin(a);
      const nx = s.neb[0] * ca - s.neb[2] * sa, nz = s.neb[0] * sa + s.neb[2] * ca, ny = s.neb[1];
      let x = s.u + (nx - s.u) * k, y = (s.v / aspect) + (ny * 0.7 - s.v / aspect) * k, z = nz * k;
      // spiral on the way back
      if (back > 0 && back < 1) { const sw = Math.sin(back * Math.PI) * 0.12; x += Math.cos(s.tw + back * 6) * sw; y += Math.sin(s.tw + back * 6) * sw; }
      // rotate (yaw, pitch) and project
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      const y2 = y * cp - z1 * spc, z2 = y * spc + z1 * cp;
      const p = camD / (camD - z2);
      const sxp = cx + x1 * cw * p, syp = cy + y2 * cw * p;
      const tw = 0.75 + 0.25 * Math.sin(t * 3 + s.tw);
      const settle = phase(t, 6.6, 0.8);
      const size = s.sz * p * (1.1 + 0.5 * k) * (cw / 340) * (1 - 0.15 * settle);
      g.globalAlpha = ign * tw * (0.75 + 0.25 * k);
      g.drawImage(s.img, sxp - size * 2, syp - size * 2, size * 4, size * 4);
    }
    const ink = phase(t, 6.2, 1.0);
    if (ink > 0) { g.globalAlpha = 0.55 * ink; g.imageSmoothingEnabled = true; g.drawImage(lightInk, cx - cw / 2, cy - ch / 2, cw, ch); }
    // anchors and gold lines
    const la = phase(t, 6.9, 0.4);
    if (la > 0) {
      const pos = (a) => [cx + a.u * cw, cy + a.v * ch];
      links.forEach(([i, j], n) => {
        const s = easeOut(phase(t, 6.9 + n * 0.09, 0.35)); if (s <= 0) return;
        const [ax, ay] = pos(anchors[i]), [bx, by] = pos(anchors[j]);
        g.globalAlpha = 0.65; g.strokeStyle = 'rgba(217,184,113,1)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (bx - ax) * s, ay + (by - ay) * s); g.stroke();
      });
      anchors.forEach((a, n) => { const s = phase(t, 6.9 + n * 0.07, 0.3); if (s <= 0) return; const [x, y] = pos(a); const r = (16 + 6 * Math.sin(t * 2.5 + n)) * (cw / 340) * s; g.globalAlpha = 0.9; g.drawImage(glow, x - r, y - r, r * 2, r * 2); });
    }
    // star-dotted card edge
    const fr = phase(t, 7.4, 1.0);
    if (fr > 0) {
      const per = 2 * (cw + ch), n = 90;
      for (let i = 0; i < n * fr; i++) {
        let d = (i / n) * per, x, y;
        if (d < cw) { x = cx + cw / 2 - d; y = cy - ch / 2; } else if ((d -= cw) < ch) { x = cx - cw / 2; y = cy - ch / 2 + d; } else if ((d -= ch) < cw) { x = cx - cw / 2 + d; y = cy + ch / 2; } else { d -= cw; x = cx + cw / 2; y = cy + ch / 2 - d; }
        g.globalAlpha = 0.5; g.drawImage(glow, x - 3, y - 3, 6, 6);
      }
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // finale glint
    const gl = phase(t, 8.0, 0.9);
    if (gl > 0 && gl < 1) { const x = cx + cw * (0.7 - 1.4 * gl), gr = g.createLinearGradient(x - cw * 0.12, 0, x + cw * 0.12, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(cx - cw / 2, cy - ch / 2, cw, ch); g.globalCompositeOperation = 'source-over'; }
    // words
    const ta = phase(t, 8.4, 0.7);
    if (ta > 0) {
      g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.direction = 'rtl'; g.fillStyle = '#c9d2dd'; g.font = `600 ${Math.round(cw / 22)}px ${FONT}`;
      g.fillText(o.title || opts.title || 'کارت شما، در آسمان', cx, cy - ch / 2 - cw * 0.06); g.restore();
    }
    const k2 = land ? Math.min(W, H) / 110 : Math.min(W, H) / 150;
    drawBrand(g, land ? W * 0.77 : W / 2, land ? H * 0.2 : cy + ch / 2 + 46 * k2 / 2.6, k2, opts.brandName || 'نام برند', 'از پراکندگی تا نظم', phase(t, 8.8, 0.7));
  }
  return { render, starCount: stars.length, anchorCount: anchors.length, data: { clean, stars, flecks, anchors, links, lightInk, glow, aspect, bgStars } };
}

/** Plays the animation full-screen in `container`; onDone after DURATION. */
export function playCardStars(container, opts) {
  const anim = createCardStars(opts.photo, opts);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas'); cv.className = 'sky-layer'; container.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0;
  const resize = () => { W = container.clientWidth || innerWidth; H = container.clientHeight || innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
  resize(); window.addEventListener('resize', resize);
  // slow phone? draw fewer stars (checked in ~1 s windows while the galaxy spins)
  let step = 1, slow = 0, n = 0, last = performance.now(), raf = 0, stopped = false, done = false;
  const t0 = last;
  const frame = (now) => {
    if (stopped) return;
    const dt = now - last; last = now;
    const t = typeof window.__OC_T === 'number' ? window.__OC_T : (now - t0) / 1000; // __OC_T: test hook only
    if (t > 1 && t < 7) { n++; if (dt > 28) slow++; if (n >= 30) { if (slow > 12 && step < 3) step++; n = slow = 0; } }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    anim.render(g, W, H, Math.min(t, 30), { step });
    if (!done && t >= DURATION) { done = true; opts.onDone && opts.onDone(); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); container.replaceChildren(); },
    /** The picture to save: the finished constellation, 1080x1350. */
    poster() {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
      const pg = c.getContext('2d'); pg.setTransform(2, 0, 0, 2, 0, 0);
      anim.render(pg, 540, 675, DURATION + 1, { title: opts.posterTitle });
      return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
    },
    get stars() { return anim.starCount; },
  };
}
