// Own-card flow, part 2: the card photo breaks into particles, scatters, settles into the
// assigned constellation, then the brand mark forms with «از پراکندگی تا نظم».
// Plain 2D canvas (no three.js). Runs entirely on the phone.
//
// playConstellation(container, opts) -> { stop(), poster() -> Promise<Blob> }
//   opts.photo   canvas of the captured card (null when replaying from a link)
//   opts.index, opts.hue, opts.lum   the assignment (see owncard.js)
//   opts.brandName, opts.text {assigned, tagline}
//   opts.onDone()  called when the final picture is complete
import { CONSTELLATIONS } from './constellations.js';
import { CARD_ASPECT } from './owncard.js';

const GOLD = [217, 184, 113];
const STAR = [255, 246, 224];
const DUST = [190, 205, 230];
const FONT = 'Vazirmatn, Tahoma, sans-serif';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const phase = (t, a, d) => clamp01((t - a) / d);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Timeline (seconds)
const T = { photoOut: 0.3, scatter: 0.9, settle: 2.3, name: 4.5, brand: 5.3, done: 7.0 };

/** Screen layout for the current size (CSS px). Works in portrait and landscape. */
function layout(W, H) {
  const land = W > H * 1.1;
  if (land) {
    const s = Math.min(W * 0.4, H * 0.6);
    return { land, box: { x: W * 0.28 - s / 2, y: H * 0.08, s }, nameY: H * 0.08 + s + 30, logo: { x: W * 0.74, y: H * 0.13, k: Math.min(W, H) / 300 }, brandY: H * 0.13 + 50, card: { x: W / 2, y: H * 0.42, w: Math.min(W * 0.5, 520) } };
  }
  // portrait: constellation, name, brand mark, all above the two rows of buttons (~150 px)
  const s = Math.min(W * 0.66, H * 0.34);
  const top = H * 0.08 + 8, nameY = top + s + 34, logoY = nameY + 74;
  return { land, box: { x: (W - s) / 2, y: top, s }, nameY, logo: { x: W / 2, y: logoY, k: Math.min(W, H) / 330 }, brandY: logoY + 38, card: { x: W / 2, y: H * 0.38, w: Math.min(W * 0.86, 520) } };
}

/** Brand mark: three points joined by two lines (same as the logo). Unit coordinates. */
const LOGO = { pts: [[-12, 7, 3.1], [0, -8, 3.6], [12, 3, 3.1]] };

/** A plain card picture for replays from a link (the photo itself is never stored). */
function syntheticCard(hue, lum) {
  const c = document.createElement('canvas'); c.width = 240; c.height = Math.round(240 / CARD_ASPECT);
  const g = c.getContext('2d');
  const L = Math.round(25 + lum * 60);
  const base = hue < 0 ? `hsl(0 0% ${L}%)` : `hsl(${hue} 55% ${L}%)`;
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = hue < 0 ? `hsl(0 0% ${L > 50 ? L - 30 : L + 30}%)` : `hsl(${(hue + 30) % 360} 45% ${L > 50 ? L - 28 : L + 28}%)`;
  g.fillRect(16, 18, 110, 12); g.fillRect(16, 38, 70, 8); g.fillRect(16, 104, 90, 7); g.fillRect(16, 118, 60, 7);
  g.beginPath(); g.arc(190, 52, 24, 0, Math.PI * 2); g.fill();
  return c;
}

export function playConstellation(container, opts) {
  const C = CONSTELLATIONS[opts.index];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mk = () => { const c = document.createElement('canvas'); c.className = 'sky-layer'; container.appendChild(c); return c; };
  const bg = mk(), pc = mk(), fx = mk();
  const pctx = pc.getContext('2d'), fctx = fx.getContext('2d'), bctx = bg.getContext('2d');
  const photo = opts.photo || syntheticCard(opts.hue, opts.lum);
  const R = mulberry(1000 + opts.index * 97 + Math.round((opts.lum || 0) * 50));

  // star sprite (soft glow), drawn once
  const glow = document.createElement('canvas'); glow.width = glow.height = 64;
  { const g = glow.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.18, 'rgba(255,236,190,0.85)'); gr.addColorStop(0.5, 'rgba(217,184,113,0.25)'); gr.addColorStop(1, 'rgba(217,184,113,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }

  // ---- particles ---------------------------------------------------------------------------
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  let N = weak ? 1400 : 2200;
  const src = document.createElement('canvas');
  const cols = Math.round(Math.sqrt(N * CARD_ASPECT)), rows = Math.round(N / cols);
  N = cols * rows;
  src.width = cols; src.height = rows;
  const sctx = src.getContext('2d');
  sctx.drawImage(photo, 0, 0, cols, rows);
  const pix = sctx.getImageData(0, 0, cols, rows).data;
  const starW = C.stars.map((s) => 0.4 + s[2]);
  const starSum = starW.reduce((a, b) => a + b, 0);
  const P = [];
  for (let i = 0; i < N; i++) {
    const gx = i % cols, gy = Math.floor(i / cols);
    const r = R();
    let kind, a, b, c;
    if (r < 0.5) { // star cluster
      let x = R() * starSum, k = 0; while (x > starW[k] && k < starW.length - 1) { x -= starW[k]; k++; }
      const ang = R() * Math.PI * 2, rad = Math.pow(R(), 1.8) * (0.012 + 0.018 * C.stars[k][2]);
      kind = 0; a = C.stars[k][0] + Math.cos(ang) * rad; b = C.stars[k][1] + Math.sin(ang) * rad; c = k;
    } else if (r < 0.8) { // constellation line
      const e = C.edges[i % C.edges.length], t = R();
      const [p, q] = [C.stars[e[0]], C.stars[e[1]]];
      kind = 1; a = p[0] + (q[0] - p[0]) * t + (R() - 0.5) * 0.004; b = p[1] + (q[1] - p[1]) * t + (R() - 0.5) * 0.004;
    } else { // dust: drifts in the sky, later forms the brand mark
      kind = 2; a = R(); b = R(); c = R();
    }
    const j = i * 4;
    P.push({ kind, a, b, c, gx: (gx + 0.5) / cols, gy: (gy + 0.5) / rows, rgb: [pix[j], pix[j + 1], pix[j + 2]], ang: R() * Math.PI * 2, spd: 0.4 + R() * 0.9, tw: R() * 6.28, lr: R(), lt: R() });
  }

  let W = 0, H = 0, L = null, img = null, buf = null;
  function resize() {
    W = container.clientWidth || window.innerWidth; H = container.clientHeight || window.innerHeight;
    for (const c of [bg, pc, fx]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; }
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    L = layout(W, H);
    img = pctx.createImageData(pc.width, pc.height);
    buf = new Uint32Array(img.data.buffer);
    drawBackground(bctx, W, H, 0);
  }
  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  // brand mark target for dust particle d (0..1 values)
  function logoPoint(p) {
    const { x, y, k } = L.logo, pts = LOGO.pts;
    if (p.c < 0.55) { const q = pts[Math.floor(p.lr * 3) % 3]; const ang = p.lt * 6.28, rr = Math.sqrt(p.lr % 0.333 * 3) * q[2]; return [x + (q[0] + Math.cos(ang) * rr) * k, y + (q[1] + Math.sin(ang) * rr) * k]; }
    const seg = p.lr < 0.5 ? [pts[0], pts[1]] : [pts[1], pts[2]];
    return [x + (seg[0][0] + (seg[1][0] - seg[0][0]) * p.lt) * k, y + (seg[0][1] + (seg[1][1] - seg[0][1]) * p.lt) * k];
  }

  let t0 = performance.now(), raf = 0, stopped = false, doneFired = false, frames = 0, slowSum = 0, lastNow = 0, checkWin = 0;
  const alive = new Uint8Array(N).fill(1);
  const liveCount = () => alive.reduce((a, b) => a + b, 0);
  if (window.__AR_DEBUG) window.__skyParticles = liveCount; // automated tests only
  function frame(now) {
    if (stopped) return;
    const t = (now - t0) / 1000;
    // ---- automatic quality: if frames are slow early on, drop half of the particles ----
    // Automatic quality, by time so it reacts early even on a slow phone: average the frame
    // time over 0.3-1.3 s and over 1.3-2.3 s; after each window, if frames took more than
    // 24 ms on average (below ~40 fps), drop half of the particles (never below ~600).
    if (lastNow) {
      const dtf = Math.min(150, now - lastNow);
      if (t > 0.3 && t <= 2.3) { slowSum += dtf; frames++; if (window.__AR_DEBUG) window.__skyFrameMs = slowSum / frames; }
      const win = t > 1.3 ? 2 : t > 0.3 ? 1 : 0;
      if (win !== checkWin && checkWin > 0) {
        if (frames && slowSum / frames > 24 && liveCount() > 1200) { let k = 0; for (let i = 0; i < N; i++) if (alive[i] && (k++ % 2)) alive[i] = 0; }
        slowSum = 0; frames = 0;
      }
      if (t > 2.3 && checkWin === 2) {
        if (frames && slowSum / frames > 24 && liveCount() > 1200) { let k = 0; for (let i = 0; i < N; i++) if (alive[i] && (k++ % 2)) alive[i] = 0; }
        checkWin = 3;
      } else if (checkWin < 3) checkWin = win;
    }
    lastNow = now;

    const { box, card } = L;
    const ch = card.w / CARD_ASPECT, cx0 = card.x - card.w / 2, cy0 = card.y - ch / 2;
    const kScatter = ease(phase(t, T.scatter, 1.4));
    const kSettle = ease(phase(t, T.settle, 2.0));
    const kBrand = ease(phase(t, T.brand, 1.5));
    const kColour = phase(t, T.scatter + 0.3, 1.6);
    drawBackground(bctx, W, H, phase(t, T.scatter - 0.2, 1.2));

    // ---- particles into the pixel buffer ----
    buf.fill(0);
    const pw = pc.width, ph = pc.height, size = dpr > 1.5 ? 3 : 2;
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      const p = P[i];
      const hx = cx0 + p.gx * card.w, hy = cy0 + p.gy * ch;
      const sxp = hx + Math.cos(p.ang) * p.spd * W * 0.45, syp = hy + Math.sin(p.ang) * p.spd * H * 0.32;
      let tx, ty;
      if (p.kind === 2) {
        const dx = p.a * W, dy = p.b * H * 0.92;
        if (kBrand > 0) { const [lx, ly] = logoPoint(p); tx = dx + (lx - dx) * kBrand; ty = dy + (ly - dy) * kBrand; } else { tx = dx; ty = dy; }
      } else { tx = box.x + p.a * box.s; ty = box.y + p.b * box.s; }
      let x = hx + (sxp - hx) * kScatter, y = hy + (syp - hy) * kScatter;
      x += (tx - x) * kSettle; y += (ty - y) * kSettle;
      if (p.kind === 2 && kSettle >= 1 && kBrand === 0) { x += Math.sin(t * 0.7 + p.tw) * 3; y += Math.cos(t * 0.5 + p.tw) * 2; }
      const target = p.kind === 0 ? STAR : p.kind === 1 ? GOLD : DUST;
      const tw = p.kind === 2 && kBrand < 1 ? 0.55 + 0.45 * Math.sin(t * 3 + p.tw) : 1;
      const r = (p.rgb[0] + (target[0] - p.rgb[0]) * kColour) * tw, g = (p.rgb[1] + (target[1] - p.rgb[1]) * kColour) * tw, b = (p.rgb[2] + (target[2] - p.rgb[2]) * kColour) * tw;
      const col = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      const px = Math.round(x * dpr), py = Math.round(y * dpr);
      if (px < 0 || py < 0 || px >= pw - size || py >= ph - size) continue;
      for (let yy = 0; yy < size; yy++) { const row = (py + yy) * pw + px; for (let xx = 0; xx < size; xx++) buf[row + xx] = col; }
    }
    pctx.putImageData(img, 0, 0);
    pc.style.opacity = String(phase(t, T.photoOut - 0.1, 0.4));

    // ---- photo (first moment), glows, lines, text ----
    fctx.clearRect(0, 0, W, H);
    const photoA = 1 - phase(t, T.photoOut, 0.5);
    if (photoA > 0) { fctx.globalAlpha = photoA; fctx.drawImage(photo, cx0, cy0, card.w, ch); fctx.globalAlpha = 1; }
    if (kSettle > 0.6) {
      const a = phase(t, T.settle + 1.4, 0.8);
      fctx.globalCompositeOperation = 'lighter';
      for (const s of C.stars) { const sz = (26 + 34 * s[2]) * a * (0.9 + 0.1 * Math.sin(t * 2 + s[0] * 9)); fctx.drawImage(glow, box.x + s[0] * box.s - sz / 2, box.y + s[1] * box.s - sz / 2, sz, sz); }
      fctx.globalCompositeOperation = 'source-over';
    }
    const nameA = phase(t, T.name, 0.6);
    if (nameA > 0) drawName(fctx, L, C, opts.text, nameA, W);
    const brandA = phase(t, T.brand + 1.0, 0.7);
    if (brandA > 0) drawBrand(fctx, L, opts.brandName, opts.text.tagline, brandA);

    if (!doneFired && t >= T.done) { doneFired = true; opts.onDone && opts.onDone(); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop() { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); container.replaceChildren(); },
    poster: () => renderPoster(opts, C),
    get particleCount() { return liveCount(); },
  };
}

// Background: night sky gradient + faint decorative starfield (fixed, small, never mistaken
// for the visitor's constellation).
function drawBackground(ctx, W, H, k) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#0e141b', '#070b16', k)); g.addColorStop(1, mix('#0e141b', '#142036', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (k <= 0) return;
  const R = mulberry(7);
  ctx.fillStyle = `rgba(200,210,230,${0.35 * k})`;
  for (let i = 0; i < 90; i++) { const s = R() < 0.9 ? 1 : 1.6; ctx.fillRect(R() * W, R() * H, s, s); }
}
function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

function drawName(ctx, L, C, text, a, W) {
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.direction = 'rtl';
  const cx = L.land ? L.box.x + L.box.s / 2 : W / 2;
  ctx.fillStyle = '#9aa7b5'; ctx.font = `500 14px ${FONT}`; ctx.fillText(text.assigned, cx, L.nameY - 6);
  ctx.fillStyle = '#f3e3b8'; ctx.font = `900 30px ${FONT}`; ctx.fillText(C.fa, cx, L.nameY + 28);
  ctx.fillStyle = '#c9d2dd'; ctx.font = `500 15px ${FONT}`; ctx.fillText(C.alt, cx, L.nameY + 50);
  ctx.restore();
}
function drawBrand(ctx, L, brand, tagline, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff'; ctx.font = `900 19px ${FONT}`; ctx.fillText(brand, L.logo.x, L.brandY);
  ctx.fillStyle = '#d9b871'; ctx.font = `700 15px ${FONT}`; ctx.fillText(tagline, L.logo.x, L.brandY + 24);
  ctx.restore();
}

/** The picture the visitor can save: constellation, its Farsi name, brand mark. 1080x1350. */
export function renderPoster(opts, C = CONSTELLATIONS[opts.index]) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, '#070b16'); bgr.addColorStop(1, '#142036');
  g.fillStyle = bgr; g.fillRect(0, 0, W, H);
  const R = mulberry(11);
  g.fillStyle = 'rgba(200,210,230,0.35)';
  for (let i = 0; i < 260; i++) { const s = R() < 0.9 ? 2 : 3.5; g.fillRect(R() * W, R() * H, s, s); }
  const box = { x: 150, y: 120, s: 780 };
  g.strokeStyle = 'rgba(217,184,113,0.85)'; g.lineWidth = 4; g.lineCap = 'round';
  for (const [i, j] of C.edges) { const p = C.stars[i], q = C.stars[j]; g.beginPath(); g.moveTo(box.x + p[0] * box.s, box.y + p[1] * box.s); g.lineTo(box.x + q[0] * box.s, box.y + q[1] * box.s); g.stroke(); }
  for (const s of C.stars) {
    const x = box.x + s[0] * box.s, y = box.y + s[1] * box.s, r = 40 + 50 * s[2];
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.2, 'rgba(255,236,190,0.8)'); gr.addColorStop(1, 'rgba(217,184,113,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.textAlign = 'center'; g.direction = 'rtl';
  g.fillStyle = '#9aa7b5'; g.font = `500 34px ${FONT}`; g.fillText(opts.text.assigned, W / 2, 960);
  g.fillStyle = '#f3e3b8'; g.font = `900 78px ${FONT}`; g.fillText(C.fa, W / 2, 1045);
  g.fillStyle = '#c9d2dd'; g.font = `500 36px ${FONT}`; g.fillText(C.alt, W / 2, 1095);
  // brand mark
  const lx = W / 2, ly = 1180, k = 2.4;
  g.strokeStyle = '#d9b871'; g.lineWidth = 3.6; g.beginPath(); LOGO.pts.forEach(([x, y], i) => (i ? g.lineTo(lx + x * k, ly + y * k) : g.moveTo(lx + x * k, ly + y * k))); g.stroke();
  g.fillStyle = '#d9b871'; LOGO.pts.forEach(([x, y, r]) => { g.beginPath(); g.arc(lx + x * k, ly + y * k, r * k, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#ffffff'; g.font = `900 40px ${FONT}`; g.fillText(opts.brandName, W / 2, 1262);
  g.fillStyle = '#d9b871'; g.font = `700 32px ${FONT}`; g.fillText(opts.text.tagline, W / 2, 1310);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
