// Own-card flow, part 2: the visitor's own card comes apart and is put back together.
// Plain 2D canvas, runs entirely on the phone; the photo is never uploaded.
//
// What happens to the photo (image processing only; the card's text is never read):
//   1. colours are evened out (levels, a touch of saturation): the "clean" card;
//   2. the card's background colour is taken from its edges; everything that stands out from
//      it (logo, words, lines, icons) is grouped into separate pieces (connected blobs);
//   3. under each piece the background is filled in, giving an empty "plate".
// Animation (seconds):
//   0.0  the photo, a light sweep, the colours clean up
//   0.9  gold outlines appear around each of the card's own pieces
//   1.7  the card bursts: the plate turns into a swirling galaxy of its own colours and the
//        pieces fly out and drift around the screen, turning
//   4.8  the galaxy flows back into the card's shape; the plate re-forms inside a gold frame
//   5.9  the pieces return one by one (largest first) on curved paths and snap into their
//        exact places with a flash; gold lines join them as they land
//   8.6  finale glint; the lines fade; brand mark + «از پراکندگی تا نظم»
//
// playCardRebuild(container, { photo, brandName, text: { title, tagline }, onDone })
//   -> { stop(), poster() -> Promise<Blob> }

const GOLD = 'rgba(217,184,113,';
const FONT = 'Vazirmatn, Tahoma, sans-serif';
export const DONE_AT = 9.4;

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const phase = (t, a, d) => clamp01((t - a) / d);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---- 1. preparing the photo -----------------------------------------------------------------
/** Evens out the colours: per-channel levels (0.5 %..99.5 %), gain capped, slight saturation. */
function cleanUp(photo) {
  const W = photo.width, H = photo.height;
  const c = canvas(W, H), g = c.getContext('2d');
  g.drawImage(photo, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data, n = W * H;
  const lo = [], hi = [];
  for (let ch = 0; ch < 3; ch++) {
    const hist = new Uint32Array(256);
    for (let i = ch; i < d.length; i += 16) hist[d[i]]++;
    const tot = Math.ceil(n / 4);
    let acc = 0, a = 0, b = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > tot * 0.005) { a = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > tot * 0.005) { b = v; break; } }
    if (b - a < 255 / 2.4) { const m = (a + b) / 2; a = m - 255 / 4.8; b = m + 255 / 4.8; }
    lo.push(a); hi.push(b);
  }
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - lo[0]) * 255 / (hi[0] - lo[0]), gg = (d[i + 1] - lo[1]) * 255 / (hi[1] - lo[1]), b = (d[i + 2] - lo[2]) * 255 / (hi[2] - lo[2]);
    const l = 0.3 * r + 0.59 * gg + 0.11 * b;
    r = l + (r - l) * 1.12; gg = l + (gg - l) * 1.12; b = l + (b - l) * 1.12;
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; // Uint8Clamped clamps
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Finds the card's pieces and builds the plate. Returns { clean, plate, pieces, bg }. */
export function prepareCard(photo) {
  const clean = cleanUp(photo);
  const FW = clean.width, FH = clean.height;
  const ww = 240, wh = Math.round(240 * FH / FW), N = ww * wh;
  const work = canvas(ww, wh), wg = work.getContext('2d', { willReadFrequently: true });
  wg.drawImage(clean, 0, 0, ww, wh);
  const px = wg.getImageData(0, 0, ww, wh).data;

  // background colour: median of the outer 6 % ring
  const ring = [[], [], []], bw = Math.max(2, Math.round(ww * 0.06));
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    if (x >= bw && x < ww - bw && y >= bw && y < wh - bw) continue;
    const o = (y * ww + x) * 4; ring[0].push(px[o]); ring[1].push(px[o + 1]); ring[2].push(px[o + 2]);
  }
  const bg = ring.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });

  // how much each pixel stands out from the background; Otsu threshold
  const dist = new Uint8Array(N), hist = new Uint32Array(256);
  for (let i = 0; i < N; i++) {
    const o = i * 4, dr = px[o] - bg[0], dg = px[o + 1] - bg[1], db = px[o + 2] - bg[2];
    const v = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) * 0.75));
    dist[i] = v; hist[v]++;
  }
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sB = 0, wB = 0, best = 0, thr = 40;
  for (let v = 0; v < 256; v++) { wB += hist[v]; if (!wB) continue; const wF = N - wB; if (!wF) break; sB += v * hist[v]; const mB = sB / wB, mF = (sum - sB) / wF, bt = wB * wF * (mB - mF) * (mB - mF); if (bt > best) { best = bt; thr = v; } }
  thr = Math.max(26, Math.min(110, thr));
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) mask[i] = dist[i] > thr ? 1 : 0;

  // join letters into words: dilate 3 px across, 1 px up/down
  const dil = new Uint8Array(N);
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    if (!mask[y * ww + x]) continue;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(wh - 1, y + 1); yy++) for (let xx = Math.max(0, x - 3); xx <= Math.min(ww - 1, x + 3); xx++) dil[yy * ww + xx] = 1;
  }
  // connected blobs
  const lab = new Int32Array(N), blobs = [];
  const stack = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!dil[i] || lab[i]) continue;
    const id = blobs.length + 1; let sp = 0, cnt = 0, x0 = ww, y0 = wh, x1 = 0, y1 = 0;
    stack[sp++] = i; lab[i] = id;
    while (sp) {
      const j = stack[--sp], x = j % ww, y = (j - x) / ww; cnt++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && dil[j - 1] && !lab[j - 1]) { lab[j - 1] = id; stack[sp++] = j - 1; }
      if (x < ww - 1 && dil[j + 1] && !lab[j + 1]) { lab[j + 1] = id; stack[sp++] = j + 1; }
      if (y > 0 && dil[j - ww] && !lab[j - ww]) { lab[j - ww] = id; stack[sp++] = j - ww; }
      if (y < wh - 1 && dil[j + ww] && !lab[j + ww]) { lab[j + ww] = id; stack[sp++] = j + ww; }
    }
    blobs.push({ id, cnt, x0, y0, x1, y1 });
  }
  let chosen = blobs.filter((b) => b.cnt >= N * 0.0012 && (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) <= N * 0.4)
    .sort((a, b) => b.cnt - a.cnt).slice(0, 30);
  const tiles = chosen.length < 4; // plain or very busy card: fall back to tiles of the card
  const keep = new Uint8Array(blobs.length + 2);
  chosen.forEach((b) => (keep[b.id] = 1));

  const sx = FW / ww, sy = FH / wh;
  const pieces = [];
  if (!tiles) {
    for (const b of chosen) {
      const x0 = Math.max(0, b.x0 - 1), y0 = Math.max(0, b.y0 - 1), x1 = Math.min(ww - 1, b.x1 + 1), y1 = Math.min(wh - 1, b.y1 + 1);
      const bwk = x1 - x0 + 1, bhk = y1 - y0 + 1;
      const m = canvas(bwk, bhk), mg = m.getContext('2d'), mi = mg.createImageData(bwk, bhk);
      // the piece's shape: its own ink (grown by 1 px) plus any holes it encloses (e.g. inside a logo)
      const sel = new Uint8Array(bwk * bhk), shape = new Uint8Array(bwk * bhk);
      for (let y = 0; y < bhk; y++) for (let x = 0; x < bwk; x++) { const j = (y0 + y) * ww + x0 + x; if (lab[j] === b.id && mask[j]) sel[y * bwk + x] = 1; }
      for (let y = 0; y < bhk; y++) for (let x = 0; x < bwk; x++) {
        if (!sel[y * bwk + x]) continue;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(bhk - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(bwk - 1, x + 1); xx++) shape[yy * bwk + xx] = 1;
      }
      const outside = new Uint8Array(bwk * bhk); let sp = 0;
      const push = (j) => { if (!shape[j] && !outside[j]) { outside[j] = 1; stack[sp++] = j; } };
      for (let x = 0; x < bwk; x++) { push(x); push((bhk - 1) * bwk + x); }
      for (let y = 0; y < bhk; y++) { push(y * bwk); push(y * bwk + bwk - 1); }
      while (sp) { const j = stack[--sp], x = j % bwk; if (x > 0) push(j - 1); if (x < bwk - 1) push(j + 1); if (j >= bwk) push(j - bwk); if (j + bwk < bwk * bhk) push(j + bwk); }
      for (let j = 0; j < bwk * bhk; j++) if (!outside[j]) mi.data[j * 4 + 3] = 255;
      mg.putImageData(mi, 0, 0);
      const X = Math.floor(x0 * sx), Y = Math.floor(y0 * sy), PW = Math.ceil(bwk * sx), PH = Math.ceil(bhk * sy);
      const pc = canvas(PW, PH), pg = pc.getContext('2d');
      pg.imageSmoothingEnabled = true; pg.drawImage(m, 0, 0, PW, PH);      // soft-edged shape
      pg.globalCompositeOperation = 'source-in'; pg.drawImage(clean, X, Y, PW, PH, 0, 0, PW, PH);
      pieces.push({ img: pc, x: X, y: Y, w: PW, h: PH, area: b.cnt });
    }
  } else {
    const cols = 5, rows = 3;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const X = Math.round(c * FW / cols), Y = Math.round(r * FH / rows), PW = Math.round((c + 1) * FW / cols) - X, PH = Math.round((r + 1) * FH / rows) - Y;
      const pc = canvas(PW, PH); pc.getContext('2d').drawImage(clean, X, Y, PW, PH, 0, 0, PW, PH);
      pieces.push({ img: pc, x: X, y: Y, w: PW, h: PH, area: PW * PH, tile: true });
    }
  }

  // plate: the background filled in under the pieces (weighted blur of the uncovered pixels)
  const plate = canvas(FW, FH), plg = plate.getContext('2d');
  if (tiles) {
    plg.fillStyle = `rgb(${bg.join(',')})`; plg.fillRect(0, 0, FW, FH);
    plg.globalAlpha = 0.5; plg.filter = 'blur(12px)'; plg.drawImage(clean, 0, 0); plg.filter = 'none'; plg.globalAlpha = 1;
  } else {
    const covered = new Uint8Array(N);
    for (let i = 0; i < N; i++) covered[i] = lab[i] && keep[lab[i]] ? 1 : 0;
    const acc = new Float32Array(N * 4); // r, g, b, weight
    for (let i = 0; i < N; i++) if (!covered[i]) { acc[i * 4] = px[i * 4]; acc[i * 4 + 1] = px[i * 4 + 1]; acc[i * 4 + 2] = px[i * 4 + 2]; acc[i * 4 + 3] = 1; }
    const blur = (src, r) => { // separable box blur, twice
      let a = src;
      for (let pass = 0; pass < 2; pass++) {
        const tmp = new Float32Array(N * 4), out = new Float32Array(N * 4);
        for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const o = (y * ww + x) * 4; for (let k = -r; k <= r; k++) { const xx = Math.min(ww - 1, Math.max(0, x + k)), q = (y * ww + xx) * 4; tmp[o] += a[q]; tmp[o + 1] += a[q + 1]; tmp[o + 2] += a[q + 2]; tmp[o + 3] += a[q + 3]; } }
        for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const o = (y * ww + x) * 4; for (let k = -r; k <= r; k++) { const yy = Math.min(wh - 1, Math.max(0, y + k)), q = (yy * ww + x) * 4; out[o] += tmp[q]; out[o + 1] += tmp[q + 1]; out[o + 2] += tmp[q + 2]; out[o + 3] += tmp[q + 3]; } }
        a = out;
      }
      return a;
    };
    const bl = blur(acc, 5);
    const fill = canvas(ww, wh), fg = fill.getContext('2d'), fi = fg.createImageData(ww, wh);
    for (let i = 0; i < N; i++) {
      if (!covered[i]) continue;
      const w = bl[i * 4 + 3], o = i * 4;
      if (w > 1e-3) { fi.data[o] = bl[o] / w; fi.data[o + 1] = bl[o + 1] / w; fi.data[o + 2] = bl[o + 2] / w; } else { fi.data[o] = bg[0]; fi.data[o + 1] = bg[1]; fi.data[o + 2] = bg[2]; }
      fi.data[o + 3] = 255;
    }
    fg.putImageData(fi, 0, 0);
    plg.drawImage(clean, 0, 0);
    plg.imageSmoothingEnabled = true; plg.drawImage(fill, 0, 0, FW, FH);
  }
  return { clean, plate, pieces, bg, tiles, FW, FH };
}

// ---- 2. the animation -------------------------------------------------------------------------
function layout(W, H, aspect) {
  const land = W > H * 1.1;
  if (land) {
    const cw = Math.min(W * 0.5, H * 0.66 * aspect);
    return { land, cx: Math.max(16 + cw / 2, W * 0.3), cy: H * 0.5, cw, ch: cw / aspect, brand: { x: W * 0.77, y: H * 0.2 } }; // buttons sit under the brand, right column
  }
  const cw = Math.min(W * 0.9, 560, H * 0.42 * aspect), ch = cw / aspect;
  const cy = H * 0.1 + 44 + ch / 2;
  return { land, cx: W / 2, cy, cw, ch, brand: { x: W / 2, y: cy + ch / 2 + 46 } };
}

const LOGO = [[-12, 7, 3.1], [0, -8, 3.6], [12, 3, 3.1]];
function drawBrand(g, x, y, k, brand, tagline, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = '#d9b871'; g.lineWidth = 1.5 * k; g.beginPath(); LOGO.forEach(([px, py], i) => (i ? g.lineTo(x + px * k, y + py * k) : g.moveTo(x + px * k, y + py * k))); g.stroke();
  g.fillStyle = '#d9b871'; LOGO.forEach(([px, py, r]) => { g.beginPath(); g.arc(x + px * k, y + py * k, r * k, 0, Math.PI * 2); g.fill(); });
  g.textAlign = 'center'; g.direction = 'rtl';
  g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(8 * k)}px ${FONT}`; g.fillText(brand, x, y + 24 * k);
  g.fillStyle = '#d9b871'; g.font = `700 ${Math.round(6.4 * k)}px ${FONT}`; g.fillText(tagline, x, y + 35 * k);
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export function playCardRebuild(container, opts) {
  const P = prepareCard(opts.photo);
  const { clean, plate, pieces, FW, FH } = P;
  const aspect = FW / FH;
  const R = mulberry(4242 + pieces.length * 31);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas'); cv.className = 'sky-layer'; container.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0, L = null, stars = [], shadow = null;
  function resize() {
    W = container.clientWidth || window.innerWidth; H = container.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    L = layout(W, H, aspect);
    // the card's soft shadow, drawn once per size (a live shadowBlur is slow on phones)
    shadow = canvas(Math.round(L.cw + 80), Math.round(L.ch + 80));
    { const sg = shadow.getContext('2d'); sg.shadowColor = 'rgba(0,0,0,0.6)'; sg.shadowBlur = 24; sg.shadowOffsetX = 4000; sg.shadowOffsetY = 8; sg.fillStyle = '#000'; roundRect(sg, 40 - 4000, 40, L.cw, L.ch, L.cw * 0.03); sg.fill(); }
    const r = mulberry(7); stars = Array.from({ length: 110 }, () => [r() * W, r() * H, r() < 0.88 ? 0.8 : 1.5, r() * 6.28]);
  }
  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  // soft glow sprite
  const glow = canvas(64, 64);
  { const gg = glow.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.2, 'rgba(255,232,180,0.8)'); gr.addColorStop(0.55, 'rgba(217,184,113,0.22)'); gr.addColorStop(1, 'rgba(217,184,113,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); }

  // pieces: landing order = largest first; each gets an orbit in the chaos phase
  const order = pieces.map((p, i) => i).sort((a, b) => pieces[b].area - pieces[a].area);
  const n = pieces.length, step = Math.min(0.16, 2.2 / n);
  order.forEach((pi, k) => {
    const p = pieces[pi];
    p.land = 5.9 + k * step; p.out = 1.7 + R() * 0.25;
    p.orb = { a: R() * 6.28, rx: 0.22 + R() * 0.2, ry: 0.16 + R() * 0.17, w: (0.35 + R() * 0.3) * (R() < 0.8 ? 1 : -1), bob: R() * 6.28 };
    p.rot0 = (R() - 0.5) * 1.2; p.spin = (R() - 0.5) * 1.6; p.arc = (R() - 0.5) * 0.5; p.sc = 0.9 + R() * 0.3;
    p.trail = [];
  });
  // lines: each landed piece joins the nearest piece that landed before it
  const links = order.map((pi, k) => {
    if (!k) return null;
    const p = pieces[pi]; let best = -1, bd = 1e9;
    for (let j = 0; j < k; j++) { const q = pieces[order[j]]; const d = Math.hypot(p.x + p.w / 2 - q.x - q.w / 2, p.y + p.h / 2 - q.y - q.h / 2); if (d < bd) { bd = d; best = order[j]; } }
    return [best, pi, p.land + 0.55];
  }).filter(Boolean);

  // galaxy of the plate's colours
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  const cols = weak ? 34 : 46, rows = Math.round(cols / aspect);
  const sm = canvas(cols, rows), smg = sm.getContext('2d'); smg.drawImage(clean, 0, 0, cols, rows); // the card's own colours
  const sd = smg.getImageData(0, 0, cols, rows).data;
  // soft round dots, one small sprite per (coarse) colour
  const dots = new Map();
  function dot(r, gg, b) {
    const key = (r >> 4) << 8 | (gg >> 4) << 4 | (b >> 4);
    if (!dots.has(key)) {
      const c = canvas(16, 16), dg = c.getContext('2d'), col = `${(r >> 4) * 17},${(gg >> 4) * 17},${(b >> 4) * 17}`;
      const gr = dg.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.45, `rgba(${col},0.75)`); gr.addColorStop(1, `rgba(${col},0)`);
      dg.fillStyle = gr; dg.fillRect(0, 0, 16, 16); dots.set(key, c);
    }
    return dots.get(key);
  }
  const goldDot = dot(240, 217, 154);
  const parts = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const o = (y * cols + x) * 4;
    parts.push({ u: (x + 0.5) / cols, v: (y + 0.5) / rows, c: dot(sd[o], sd[o + 1], sd[o + 2]), r: Math.pow(R(), 0.6), a: R() * 6.28, arm: R() < 0.5 ? 0 : Math.PI, sz: 1.2 + R() * 1.8, back: 4.8 + ((x / cols) * 0.5 + R() * 0.35), gold: R() < 0.12 });
  }
  let drawEvery = 1, slow = 0, fast = 0;

  const t0 = performance.now(); let last = t0, raf = 0, stopped = false, doneFired = false;
  function cardPt(u, v) { return [L.cx + (u - 0.5) * L.cw, L.cy + (v - 0.5) * L.ch]; }
  function orbitPt(p, t) {
    const ang = p.orb.a + t * p.orb.w, M = Math.min(W, H);
    const cx = L.land ? W * 0.45 : W / 2, cy = L.land ? H / 2 : H * 0.43;
    return [cx + Math.cos(ang) * p.orb.rx * (L.land ? W * 0.9 : W * 1.0) + Math.sin(t * 1.3 + p.orb.bob) * M * 0.012, cy + Math.sin(ang) * p.orb.ry * (L.land ? H * 1.1 : H * 1.25) + Math.cos(t * 1.1 + p.orb.bob) * M * 0.012];
  }

  function frame(now) {
    if (stopped) return;
    const dt = now - last; last = now;
    const t = typeof window.__OC_T === 'number' ? window.__OC_T : (now - t0) / 1000; // __OC_T: test hook only
    // adaptive: thin the galaxy on slow phones (time windows of ~1 s)
    if (t > 1.7 && t < 6) { if (dt > 24) slow++; else fast++; if (slow + fast >= 30) { if (slow > 15 && drawEvery < 4) drawEvery++; slow = fast = 0; } }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, '#070b16'); bgr.addColorStop(1, '#142036');
    g.fillStyle = bgr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(200,210,230,0.5)';
    for (const s of stars) { g.globalAlpha = 0.35 + 0.3 * Math.sin(t * 1.5 + s[3]); g.fillRect(s[0], s[1], s[2], s[2]); }
    g.globalAlpha = 1;

    const cardX = L.cx - L.cw / 2, cardY = L.cy - L.ch / 2, k = L.cw / FW;
    // ---- card body: photo -> clean -> plate (hidden during the chaos) -> plate re-forms -> exact clean card
    const bodyA = (1 - phase(t, 1.7, 0.35)) + phase(t, 5.25, 0.6);
    if (bodyA > 0) {
      g.globalAlpha = Math.min(1, bodyA); g.drawImage(shadow, cardX - 40, cardY - 32, L.cw + 80, L.ch + 80); g.globalAlpha = 1;
      g.save(); roundRect(g, cardX, cardY, L.cw, L.ch, L.cw * 0.03); g.clip(); g.globalAlpha = Math.min(1, bodyA);
      if (t < 1.7) {
        const intro = 0.94 + 0.06 * easeOut(phase(t, 0, 0.5));
        g.translate(L.cx, L.cy); g.scale(intro, intro); g.translate(-L.cx, -L.cy);
        g.drawImage(opts.photo, cardX, cardY, L.cw, L.ch);
        g.globalAlpha = Math.min(1, bodyA) * ease(phase(t, 0.35, 0.6)); g.drawImage(clean, cardX, cardY, L.cw, L.ch);
        g.globalAlpha = Math.min(1, bodyA) * phase(t, 1.2, 0.5); g.drawImage(plate, cardX, cardY, L.cw, L.ch);
      } else {
        g.drawImage(plate, cardX, cardY, L.cw, L.ch);
        const fin = phase(t, 8.5, 0.6); if (fin > 0) { g.globalAlpha = Math.min(1, bodyA) * fin; g.drawImage(clean, cardX, cardY, L.cw, L.ch); }
      }
      g.restore();
    }
    // light sweep (0.3) and finale glint (8.4) across the card
    for (const [at, a] of [[0.3, 0.55], [8.4, 0.75]]) {
      const s = phase(t, at, 0.9); if (s <= 0 || s >= 1) continue;
      g.save(); roundRect(g, cardX, cardY, L.cw, L.ch, L.cw * 0.03); g.clip();
      const x = cardX + L.cw * (1.2 - 1.6 * s), gr = g.createLinearGradient(x - L.cw * 0.15, 0, x + L.cw * 0.15, 0);
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, `rgba(255,240,200,${a})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(cardX, cardY, L.cw, L.ch); g.restore();
    }
    // gold frame: drawn around the photo at first, redrawn as the plate re-forms
    const fr = Math.max(phase(t, 0.1, 0.5) * (1 - phase(t, 1.6, 0.3)), easeOut(phase(t, 5.0, 0.9)));
    if (fr > 0) {
      g.save(); roundRect(g, cardX - 3, cardY - 3, L.cw + 6, L.ch + 6, L.cw * 0.035);
      const per = 2 * (L.cw + L.ch); g.setLineDash([per * fr, per]); g.strokeStyle = GOLD + (0.9 * (1 - 0.6 * phase(t, 8.6, 0.6))) + ')'; g.lineWidth = 1.6; g.stroke(); g.restore();
    }

    // ---- galaxy (the plate's colours)
    const gOn = phase(t, 1.7, 0.3) * (1 - phase(t, 5.6, 0.5));
    if (gOn > 0) {
      const gcx = L.land ? W * 0.45 : W / 2, gcy = L.land ? H / 2 : H * 0.43, M = Math.min(W, H) * (L.land ? 0.5 : 0.52);
      const burst = easeOut(phase(t, 1.7, 1.0));
      for (let i = 0; i < parts.length; i += drawEvery) {
        const q = parts[i];
        const [hx, hy] = cardPt(q.u, q.v);
        const ang = q.a + q.arm + q.r * 3.2 + t * (0.9 / (0.35 + q.r));
        const gx = gcx + Math.cos(ang) * q.r * M * 1.05, gy = gcy + Math.sin(ang) * q.r * M * (L.land ? 0.6 : 0.95);
        const back = ease(phase(t, q.back, 0.75));
        let x = hx + (gx - hx) * burst, y = hy + (gy - hy) * burst;
        x += (hx - x) * back; y += (hy - y) * back;
        g.globalAlpha = gOn * (0.55 + 0.45 * Math.sin(t * 3 + q.a * 5)) * (1 - back * 0.4);
        const s = q.sz * 2.4 * (1 + 0.6 * Math.sin(Math.PI * burst) * (1 - back));
        g.drawImage(q.gold ? goldDot : q.c, x - s / 2, y - s / 2, s, s);
      }
      g.globalAlpha = 1;
    }

    // ---- outlines around the card's own pieces (0.9 .. 1.8)
    const ol = phase(t, 0.9, 0.2) * (1 - phase(t, 1.75, 0.2));
    if (ol > 0 && !P.tiles) {
      g.save(); g.strokeStyle = GOLD + '0.9)'; g.lineWidth = 1.2;
      order.forEach((pi, j) => { const p = pieces[pi], a = ol * phase(t, 0.9 + j * (0.6 / n), 0.15); if (a <= 0) return; g.globalAlpha = a; roundRect(g, cardX + p.x * k - 2, cardY + p.y * k - 2, p.w * k + 4, p.h * k + 4, 3); g.stroke(); });
      g.restore();
    }

    // ---- constellation lines between landed pieces
    for (const [a, b, at] of links) {
      const s = easeOut(phase(t, at - 0.35, 0.4)); if (s <= 0) continue;
      const fade = 1 - phase(t, 8.6, 0.7); if (fade <= 0) continue;
      const pa = pieces[a], pb = pieces[b];
      const ax = cardX + (pa.x + pa.w / 2) * k, ay = cardY + (pa.y + pa.h / 2) * k, bx = cardX + (pb.x + pb.w / 2) * k, by = cardY + (pb.y + pb.h / 2) * k;
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = GOLD + (0.75 * fade) + ')'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (ax - bx) * s, by + (ay - by) * s); g.stroke();
      g.globalAlpha = fade * 0.9; for (const [x, y] of [[ax, ay], [bx, by]]) g.drawImage(glow, x - 7, y - 7, 14, 14);
      g.restore();
    }

    // ---- the pieces
    for (const pi of order) {
      const p = pieces[pi];
      const hx = cardX + (p.x + p.w / 2) * k, hy = cardY + (p.y + p.h / 2) * k;
      let x = hx, y = hy, rot = 0, sc = 1, lifted = 0;
      if (t >= p.out) {
        const ko = easeOut(phase(t, p.out, 0.9)), kl = phase(t, p.land, 0.8), kle = ease(kl);
        const [ox, oy] = orbitPt(p, t);
        const crot = p.rot0 + Math.sin(t * 0.7 + p.orb.bob) * 0.35 + t * p.spin * 0.3;
        x = hx + (ox - hx) * ko; y = hy + (oy - hy) * ko;
        rot = crot * ko; sc = 1 + (p.sc - 1) * ko + 0.12 * Math.sin(Math.PI * ko);
        if (kl > 0) {
          const dx = hx - x, dy = hy - y, arc = Math.sin(Math.PI * kle) * p.arc;
          x += dx * kle - dy * arc; y += dy * kle + dx * arc;
          rot *= 1 - kle; sc = sc + (1 - sc) * kle;
          if (kl >= 1) { x = hx; y = hy; rot = 0; sc = 1; }
          else if (kl > 0.75) sc *= 1 + 0.07 * Math.sin(Math.PI * (kl - 0.75) / 0.25); // small snap
        }
        lifted = kl >= 1 ? 0 : ko;
      }
      // trail
      if (lifted > 0.05) { p.trail.unshift([x, y]); if (p.trail.length > 10) p.trail.pop(); } else if (p.trail.length) p.trail.pop();
      if (p.trail.length > 1) {
        g.save(); g.globalCompositeOperation = 'lighter';
        p.trail.forEach(([tx, ty], j) => { const a = (1 - j / p.trail.length) * 0.35; const s = Math.max(6, Math.min(26, Math.min(p.w, p.h) * k * 0.9)) * (1 - j / 14); g.globalAlpha = a; g.drawImage(glow, tx - s / 2, ty - s / 2, s, s); });
        g.restore();
      }
      const dw = p.w * k * sc, dh = p.h * k * sc;
      g.save(); g.translate(x, y); g.rotate(rot);
      if (lifted > 0.05) { // halo behind a flying piece
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 * lifted; g.drawImage(glow, -dw * 0.7, -dh * 0.9, dw * 1.4, dh * 1.8); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        if (p.tile) { g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 10; }
      }
      g.drawImage(p.img, -dw / 2, -dh / 2, dw, dh);
      if (p.tile && lifted > 0.05) { g.shadowBlur = 0; g.strokeStyle = GOLD + (0.7 * lifted) + ')'; g.lineWidth = 1; g.strokeRect(-dw / 2, -dh / 2, dw, dh); }
      g.restore();
      // landing flash
      const fl = phase(t, p.land + 0.72, 0.45);
      if (fl > 0 && fl < 1) {
        const s = Math.max(30, Math.max(p.w, p.h) * k * 1.6) * (0.6 + fl);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(Math.PI * fl) * 0.8; g.drawImage(glow, hx - s / 2, hy - s / 2, s, s);
        g.strokeStyle = GOLD + (0.8 * (1 - fl)) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(hx, hy, s * 0.35, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    }

    // ---- title above the card, brand below
    const ta = phase(t, 8.7, 0.6);
    if (ta > 0 && !L.land) {
      g.save(); g.globalAlpha = ta; g.textAlign = 'center'; g.direction = 'rtl'; g.fillStyle = '#c9d2dd'; g.font = `600 15px ${FONT}`;
      g.fillText(opts.text.title, L.cx, cardY - 16); g.restore();
    }
    const bk = L.land ? Math.min(W, H) / 110 : Math.min(W, H) / 150;
    drawBrand(g, L.brand.x, L.brand.y, bk, opts.brandName, opts.text.tagline, phase(t, 8.8, 0.7));

    if (!doneFired && t >= DONE_AT) { doneFired = true; opts.onDone && opts.onDone(); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop() { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); container.replaceChildren(); },
    poster: () => renderPoster(P, opts),
    get pieceCount() { return pieces.length; },
  };
}

/** The picture the visitor can save: their card, cleaned, framed in gold, with our mark. 1080x1350. */
export function renderPoster(P, opts) {
  const W = 1080, H = 1350;
  const c = canvas(W, H), g = c.getContext('2d');
  const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, '#070b16'); bgr.addColorStop(1, '#142036');
  g.fillStyle = bgr; g.fillRect(0, 0, W, H);
  const R = mulberry(11); g.fillStyle = 'rgba(200,210,230,0.35)';
  for (let i = 0; i < 260; i++) { const s = R() < 0.9 ? 2 : 3.5; g.fillRect(R() * W, R() * H, s, s); }
  const cw = 920, ch = Math.min(760, cw * P.FH / P.FW), cwa = ch * P.FW / P.FH, x = (W - cwa) / 2, y = 200;
  g.textAlign = 'center'; g.direction = 'rtl'; g.fillStyle = '#c9d2dd'; g.font = `600 40px ${FONT}`; g.fillText(opts.text.posterTitle || opts.text.title, W / 2, 140);
  g.save(); roundRect(g, x, y, cwa, ch, 26); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.shadowOffsetY = 18; g.fillStyle = '#000'; g.fill(); g.restore();
  g.save(); roundRect(g, x, y, cwa, ch, 26); g.clip(); g.drawImage(P.clean, x, y, cwa, ch); g.restore();
  roundRect(g, x - 8, y - 8, cwa + 16, ch + 16, 32); g.strokeStyle = 'rgba(217,184,113,0.9)'; g.lineWidth = 4; g.stroke();
  drawBrand(g, W / 2, y + ch + 200, 5.2, opts.brandName, opts.text.tagline, 1);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
