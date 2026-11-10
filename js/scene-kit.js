// Shared building blocks for the document animations (three.js).
// Coordinate system ("target space", same as MindAR): page width = 1 unit, origin at the
// page centre, +y up, +z towards the viewer. Document data is in millimetres from the
// top-left corner of an A4 page; `page()` converts.

export const ACCENT = '#c9a45c';
export const INK = '#18202b';
export const MUTED = '#5d6878';
export const LINE = '#d9dde3';
export const WARN = '#d4892a';
export const OK = '#2f8a5b';

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const phase = (t, start, dur) => clamp01((t - start) / dur);
export const pulse = (t, start, period = 1.2) => 0.5 + 0.5 * Math.sin(((t - start) * Math.PI * 2) / period);

/** Converters for a page of size w x h mm. */
export function page(w = 210, h = 297) {
  const U = 1 / w;
  return { w, h, U, X: (mm) => mm * U - 0.5, Y: (mm) => (h / 2 - mm) * U, H: h * U };
}

export function loadTexture(THREE, url, renderer) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      resolve(t);
    }, undefined, () => reject(new Error('texture ' + url)));
  });
}

export function fontsReady() {
  return Promise.all([document.fonts.load(font(30, 400)), document.fonts.load(font(30, 700))]).catch(() => {});
}

/** Creates a group plus a tracker of GPU resources to dispose at the end. */
export function kit(THREE, P) {
  const group = new THREE.Group();
  const disposables = [];
  const track = (...items) => { disposables.push(...items); return items[0]; };

  /** Plane over the mm rect [x,y,w,h]; with a full-page texture it shows that part of it. */
  function rectPlane(rect, opts = {}) {
    const [x, y, w, h] = rect;
    const geo = new THREE.PlaneGeometry(w * P.U, h * P.U);
    if (opts.map && !opts.ownUV) {
      const u0 = x / P.w, u1 = (x + w) / P.w, v0 = 1 - (y + h) / P.h, v1 = 1 - y / P.h;
      const uv = geo.attributes.uv;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
      uv.needsUpdate = true;
    }
    const mat = new THREE.MeshBasicMaterial({
      map: opts.map || null, color: opts.color !== undefined ? new THREE.Color(opts.color) : 0xffffff,
      transparent: true, opacity: opts.opacity ?? 1, depthTest: false, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(P.X(x + w / 2), P.Y(y + h / 2), opts.z || 0);
    mesh.renderOrder = opts.order || 0;
    track(geo, mat);
    if (opts.parent !== null) (opts.parent || group).add(mesh);
    return mesh;
  }

  /** Thin page outline that confirms the page has been found. */
  function frame() {
    const g = new THREE.Group();
    const fw = 0.004;
    [[0, P.H / 2, 1, fw], [0, -P.H / 2, 1, fw], [-0.5, 0, fw, P.H], [0.5, 0, fw, P.H]].forEach(([x, y, w, h]) => {
      const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthTest: false, depthWrite: false })));
      m.position.set(x, y, 0.002); m.renderOrder = 2;
      g.add(m);
    });
    group.add(g);
    return { set(o) { g.children.forEach((m) => { m.material.opacity = o; }); } };
  }

  /** Texture from a canvas (drawn in mm via drawCanvas). */
  function canvasTexture(canvas, renderer) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return track(t);
  }

  /** A floating card: its own small canvas texture, sized in mm, centred at (cx, cy). */
  function card(cx, cy, wmm, hmm, paint, opts = {}) {
    const px = opts.px || 10;
    const c = document.createElement('canvas');
    c.width = Math.round(wmm * px); c.height = Math.round(hmm * px);
    const ctx = c.getContext('2d');
    ctx.scale(px, px);
    try { ctx.direction = 'rtl'; } catch (e) { /* alignment is explicit */ }
    paint(ctx, wmm, hmm);
    const tex = canvasTexture(c, opts.renderer);
    return rectPlane([cx - wmm / 2, cy - hmm / 2, wmm, hmm], { map: tex, ownUV: true, opacity: 0, z: opts.z ?? 0.04, order: opts.order ?? 20 });
  }

  /** Flat ribbon along a quadratic curve between two mm points; grow it with setProgress(0..1). */
  function ribbon(a, b, opts = {}) {
    const n = 32, w = (opts.width || 0.8) * P.U;
    const [ax, ay] = [P.X(a[0]), P.Y(a[1])], [bx, by] = [P.X(b[0]), P.Y(b[1])];
    const bend = opts.bend ?? 0.15;
    const mx = (ax + bx) / 2 - (by - ay) * bend, my = (ay + by) / 2 + (bx - ax) * bend;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, it = 1 - t;
      pts.push([it * it * ax + 2 * it * t * mx + t * t * bx, it * it * ay + 2 * it * t * my + t * t * by]);
    }
    const pos = new Float32Array((n + 1) * 2 * 3);
    for (let i = 0; i <= n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const [px, py] = pts[i];
      pos.set([px - dy * w / 2, py + dx * w / 2, 0, px + dy * w / 2, py - dx * w / 2, 0], i * 6);
    }
    const idx = [];
    for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.color || ACCENT), transparent: true, opacity: 1, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    track(geo, mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = opts.z ?? 0.03; mesh.renderOrder = opts.order ?? 15;
    group.add(mesh);
    geo.setDrawRange(0, 0);
    return { mesh, setProgress(p) { geo.setDrawRange(0, Math.round(clamp01(p) * n) * 6); }, setColor(c) { mat.color.set(c); } };
  }

  /** Rounded outline (ring) around a mm rect. */
  function ring(rect, color = WARN, opts = {}) {
    const c = document.createElement('canvas');
    const [x, y, w, h] = rect;
    const k = 12; // px per mm
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const ctx = c.getContext('2d');
    const lw = (opts.line || 0.8) * k;
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    roundRect(ctx, lw / 2, lw / 2, c.width - lw, c.height - lw, (opts.radius || 2) * k); ctx.stroke();
    const tex = canvasTexture(c);
    return rectPlane([x, y, w, h], { map: tex, ownUV: true, opacity: 0, z: opts.z ?? 0.025, order: opts.order ?? 12 });
  }

  return {
    group, track, rectPlane, frame, canvasTexture, card, ribbon, ring,
    dispose() { disposables.forEach((d) => d && d.dispose && d.dispose()); },
  };
}

// ---- 2D canvas helpers (draw in mm after ctx.scale) ----------------------------
export const font = (size, weight = 400) => `${weight} ${size}px Vazirmatn, Tahoma, sans-serif`;

export function text(ctx, str, x, y, { size = 3.4, weight = 400, color = INK, align = 'right', maxW } = {}) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (maxW) {
    let s = size;
    while (s > 1.6 && ctx.measureText(str).width > maxW) { s -= 0.2; ctx.font = font(s, weight); }
  }
  ctx.fillText(str, x, y);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Standard label card: white rounded box, optional coloured dot, title and sub line. */
export function paintLabel(ctx, w, h, { title, sub, color = ACCENT, warn = false }) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(ctx, 0.6, 0.9, w - 1, h - 1.2, 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; roundRect(ctx, 0.3, 0.3, w - 1, h - 1.2, 2); ctx.fill();
  ctx.fillStyle = warn ? WARN : color; roundRect(ctx, w - 2.4, 0.3, 1.6, h - 1.2, 0.8); ctx.fill();
  // text scales with the card so it stays readable on a phone at arm's length
  const right = w - 4.5;
  if (sub) {
    text(ctx, title, right, h * 0.35, { size: h * 0.27, weight: 800, maxW: w - 7 });
    text(ctx, sub, right, h * 0.68, { size: h * 0.21, color: MUTED, maxW: w - 7 });
  } else {
    text(ctx, title, right, (h - 0.9) / 2, { size: h * 0.42, weight: 800, maxW: w - 7 });
  }
}
