// Document 1 animation, built with three.js.
// Works in two places with the same code:
//   - AR: the group is attached to the MindAR anchor (the real paper is underneath)
//   - still mode: the group is shown with a picture of the paper underneath
//
// Coordinate system ("target space", same as MindAR): page width = 1 unit,
// origin at the page centre, +y up, +z towards the viewer.
//
// Story, as a pure function of time t (seconds), so pausing/resuming is trivial:
//   0.0  a thin frame confirms the page
//   0.5  each handwritten line lifts off the paper (cut from the page image)
//   0.6  the paper behind fades to a soft blank
//   2.3  a clean panel settles over the page
//   2.6  the lifted lines fly into their rows and cells, then turn into typed text
//   5.0  the one shift conflict pulses
import { S } from '../strings.fa.js';
import {
  PAGE, HAND, CONFLICT, CLEAN, CLEAN_PANEL, CLEAN_GRID, ORDER_COLS, ORDERS, ORDER_NOTE, META,
  CALLOUT, NOTES, DAYS, SHIFT_NAMES, ROW_LABELS, cleanRect,
} from './doc1.data.js';
import { PIECES } from './doc1.layout.js';

export const DURATION = 5.6; // seconds until the result is ready to view
const IMAGE_URL = new URL('../../img/doc1.jpg', import.meta.url).href;

const ACCENT = '#c9a45c';   // calm gold, matches the UI
const INK = '#18202b';
const MUTED = '#5d6878';
const LINE = '#d9dde3';
const WARN = '#d4892a';

// ---- helpers ------------------------------------------------------------------
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const phase = (t, start, dur) => clamp01((t - start) / dur);

const U = 1 / PAGE.w;                 // mm -> units
const X = (mm) => mm * U - 0.5;       // page x (mm) -> units
const Y = (mm) => (PAGE.h / 2 - mm) * U;

function loadTexture(THREE, url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => reject(new Error('texture ' + url)));
  });
}

/** Plane covering the mm rect [x,y,w,h], textured with the matching part of a full-page texture. */
function subPlane(THREE, rect, texture, opts = {}) {
  const [x, y, w, h] = rect;
  const geo = new THREE.PlaneGeometry(w * U, h * U);
  if (texture) {
    const u0 = x / PAGE.w, u1 = (x + w) / PAGE.w, v0 = 1 - (y + h) / PAGE.h, v1 = 1 - y / PAGE.h;
    const uv = geo.attributes.uv;
    // PlaneGeometry vertex order: top-left, top-right, bottom-left, bottom-right
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
  }
  const mat = new THREE.MeshBasicMaterial({
    map: texture || null, color: opts.color || 0xffffff, transparent: true, opacity: opts.opacity ?? 1,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(X(x + w / 2), Y(y + h / 2), opts.z || 0);
  mesh.renderOrder = opts.order || 0;
  return mesh;
}

// ---- clean layout, painted on canvases ----------------------------------------
const PX = 6; // canvas pixels per mm

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = Math.round(PAGE.w * PX);
  c.height = Math.round(PAGE.h * PX);
  const ctx = c.getContext('2d');
  ctx.scale(PX, PX); // draw in mm
  try { ctx.direction = 'rtl'; } catch (e) { /* older browsers: alignment below is explicit anyway */ }
  return { c, ctx };
}
const font = (size, weight = 400) => `${weight} ${size}px Vazirmatn, Tahoma, sans-serif`;

function text(ctx, str, x, y, { size = 3.4, weight = 400, color = INK, align = 'right', maxW } = {}) {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (maxW) {
    // shrink to fit instead of overflowing a cell
    let s = size;
    while (s > 2 && ctx.measureText(str).width > maxW) { s -= 0.2; ctx.font = font(s, weight); }
  }
  ctx.fillText(str, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const mid = ([x, y, w, h]) => [x + w / 2, y + h / 2];

/** Background of the clean panel: card, titles, headers, grid lines. */
function paintBase() {
  const { c, ctx } = makeCanvas();
  const P = CLEAN_PANEL;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, P.x, P.y, P.w, P.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#e4e1d8'; ctx.lineWidth = 0.3; ctx.stroke();

  // title bar
  const [tx, ty, tw, th] = CLEAN.title;
  text(ctx, S.doc1.panelTitle, tx + tw, ty + th / 2, { size: 5.2, weight: 700 });
  ctx.fillStyle = ACCENT; ctx.fillRect(tx + tw - 26, ty + th + 1.2, 26, 0.7);

  // orders header row
  const [hx, hy, hw, hh] = CLEAN.ordersHeader;
  ctx.fillStyle = '#f2f0ea'; ctx.fillRect(hx, hy, hw, hh);
  for (const col of ORDER_COLS) {
    const align = col.key === 'item' || col.key === 'note' ? 'right' : 'center';
    const x = align === 'right' ? col.x2 - 1.5 : (col.x1 + col.x2) / 2;
    text(ctx, S.doc1.cols[col.key], x, hy + hh / 2, { size: 2.9, weight: 700, color: MUTED, align });
  }
  // row lines
  ctx.strokeStyle = LINE; ctx.lineWidth = 0.25;
  Object.values(CLEAN.rows).forEach(([x, y, w, h]) => { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke(); });

  // shift section
  const [sx, sy, sw, sh] = CLEAN.shiftTitle;
  text(ctx, S.doc1.shiftsTitle, sx + sw, sy + sh / 2, { size: 3.6, weight: 700 });
  const G = CLEAN_GRID;
  ctx.fillStyle = '#f2f0ea'; ctx.fillRect(G.x1, G.rows[0], G.x2 - G.x1, G.rows[1] - G.rows[0]);
  const corner = [G.x2 - G.labelW, G.rows[0], G.labelW, G.rows[1] - G.rows[0]];
  text(ctx, S.doc1.shiftCorner, ...mid(corner), { size: 2.8, weight: 700, color: MUTED, align: 'center' });
  ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 0.3;
  G.rows.forEach((y) => { ctx.beginPath(); ctx.moveTo(G.x1, y); ctx.lineTo(G.x2, y); ctx.stroke(); });
  const colW = (G.x2 - G.labelW - G.x1) / 6;
  [G.x2, G.x2 - G.labelW, ...DAYS.map((_, k) => G.x2 - G.labelW - colW * (k + 1))].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, G.rows[0]); ctx.lineTo(x, G.rows[3]); ctx.stroke();
  });

  // notes title + footer
  const [nx, ny, nw, nh] = CLEAN.notesTitle;
  text(ctx, S.doc1.notesTitle, nx + nw, ny + nh / 2, { size: 3.6, weight: 700 });
  const [fx, fy, fw, fh] = CLEAN.footer;
  text(ctx, S.doc1.panelFooter, fx + fw / 2, fy + fh / 2, { size: 2.6, color: '#8a93a0', align: 'center' });
  return c;
}

/** Row and cell contents (transparent background), revealed one by one. */
function paintRows() {
  const { c, ctx } = makeCanvas();
  ORDERS.forEach((o, i) => {
    const [, y, , h] = CLEAN.rows['r' + (i + 1)];
    const cy = y + h / 2;
    for (const col of ORDER_COLS) {
      const v = o[col.key];
      if (!v) continue;
      const align = col.key === 'item' || col.key === 'note' ? 'right' : 'center';
      const x = align === 'right' ? col.x2 - 1.5 : (col.x1 + col.x2) / 2;
      const isUrgent = col.key === 'note' && o.urgent;
      text(ctx, v, x, cy, {
        size: col.key === 'note' ? 2.9 : 3.4, weight: col.key === 'qty' || isUrgent ? 700 : 400,
        color: isUrgent ? WARN : col.key === 'note' ? MUTED : INK, align, maxW: col.x2 - col.x1 - 3,
      });
    }
  });
  const on = CLEAN.onote;
  text(ctx, ORDER_NOTE, on[0] + on[2] - 1.5, on[1] + on[3] / 2, { size: 3, color: MUTED });
  const m = CLEAN.meta;
  text(ctx, META, m[0] + 1, m[1] + m[3] / 2, { size: 3, color: MUTED, align: 'left' });

  DAYS.forEach((d, k) => text(ctx, d, ...mid(CLEAN.cells['hd' + k]), { size: 3, weight: 700, align: 'center' }));
  text(ctx, ROW_LABELS.morning, ...mid(CLEAN.cells.hl_m), { size: 3.4, weight: 700, align: 'center' });
  text(ctx, ROW_LABELS.evening, ...mid(CLEAN.cells.hl_e), { size: 3.4, weight: 700, align: 'center' });
  SHIFT_NAMES.morning.forEach((n, k) => text(ctx, n, ...mid(CLEAN.cells['cm' + k]), { size: 3.5, align: 'center' }));
  SHIFT_NAMES.evening.forEach((n, k) => text(ctx, n, ...mid(CLEAN.cells['ce' + k]), { size: 3.5, align: 'center' }));

  // conflict callout box
  const [cx, cy, cw, ch] = CLEAN.callout;
  ctx.fillStyle = '#fdf3e4';
  roundRect(ctx, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 2); ctx.fill();
  ctx.strokeStyle = WARN; ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = WARN; ctx.beginPath(); ctx.arc(cx + cw - 6, cy + 6.2, 2.2, 0, Math.PI * 2); ctx.fill();
  text(ctx, '!', cx + cw - 6, cy + 6.3, { size: 3, weight: 800, color: '#fff', align: 'center' });
  text(ctx, CALLOUT.title, cx + cw - 10.5, cy + 6.2, { size: 3.4, weight: 700, color: '#8a4f0f' });
  text(ctx, CALLOUT.body, cx + cw - 4, cy + 12.4, { size: 3, color: INK, maxW: cw - 8 });
  text(ctx, CALLOUT.action, cx + cw - 4, cy + 17.6, { size: 3, color: MUTED, maxW: cw - 8 });

  NOTES.forEach((n, i) => { const r = CLEAN['n' + (i + 1)]; text(ctx, '•  ' + n, r[0] + r[2] - 1.5, r[1] + r[3] / 2, { size: 3.2 }); });
  return c;
}

function canvasTexture(THREE, canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

/** Rounded outline used to ring the conflict cell. */
function ringTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = WARN; ctx.lineWidth = 10;
  roundRect(ctx, 8, 8, 240, 144, 22); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- the scene ------------------------------------------------------------------
/**
 * @param THREE  the three.js module
 * @param {{mode: 'ar'|'still', renderer?: any}} opts
 */
export async function createScene(THREE, { mode, renderer }) {
  await Promise.all([document.fonts.load(font(30, 400)), document.fonts.load(font(30, 700))]).catch(() => {});
  const pageTex = await loadTexture(THREE, IMAGE_URL);
  pageTex.colorSpace = THREE.SRGBColorSpace;
  if (renderer) pageTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const baseTex = canvasTexture(THREE, paintBase(), renderer);
  const rowsTex = canvasTexture(THREE, paintRows(), renderer);

  const group = new THREE.Group();
  const disposables = [pageTex, baseTex, rowsTex];
  const add = (mesh) => { group.add(mesh); disposables.push(mesh.geometry, mesh.material); return mesh; };
  const pageRect = [0, 0, PAGE.w, PAGE.h];

  // The paper itself only in still mode; in AR the real paper is visible.
  if (mode === 'still') add(subPlane(THREE, pageRect, pageTex, { order: 0 }));

  // Soft blank that covers the paper once the lines have lifted off.
  const veil = add(subPlane(THREE, pageRect, null, { color: 0xf6f3ec, opacity: 0, z: 0.001, order: 1 }));

  // Frame that confirms the page has been found.
  const frame = new THREE.Group();
  const fw = 0.004, H = PAGE.h * U;
  [[0, H / 2, 1, fw], [0, -H / 2, 1, fw], [-0.5, 0, fw, H], [0.5, 0, fw, H]].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    m.position.set(x, y, 0.002); m.renderOrder = 2;
    disposables.push(m.geometry, m.material);
    frame.add(m);
  });
  group.add(frame);

  // Clean panel background
  const P = CLEAN_PANEL;
  const base = add(subPlane(THREE, [P.x, P.y, P.w, P.h], baseTex, { opacity: 0, z: 0.02, order: 3 }));

  // Conflict highlight (fill + ring) on the clean grid
  const cRect = CLEAN.cells[(CONFLICT.row === 'morning' ? 'cm' : 'ce') + CONFLICT.day];
  const hlFill = add(subPlane(THREE, cRect, null, { color: new THREE.Color(WARN), opacity: 0, z: 0.021, order: 4 }));
  const ringTex = ringTexture(THREE); disposables.push(ringTex);
  const ring = add(subPlane(THREE, [cRect[0] - 1, cRect[1] - 1, cRect[2] + 2, cRect[3] + 2], null, { opacity: 0, z: 0.023, order: 7 }));
  ring.material.map = ringTex; ring.material.needsUpdate = true;
  // connector from the callout up to the cell
  const call = CLEAN.callout;
  const connX = cRect[0] + cRect[2] / 2;
  const conn = add(subPlane(THREE, [connX - 0.25, cRect[1] + cRect[3], 0.5, call[1] - (cRect[1] + cRect[3]) + 0.6], null, { color: new THREE.Color(WARN), opacity: 0, z: 0.022, order: 4 }));

  // Row / cell contents (one plane per target, all sharing one texture)
  const rows = new Map();
  const rowTargets = [...new Set(HAND.map((h) => h.to))];
  for (const id of rowTargets) {
    const r = cleanRect(id);
    rows.set(id, add(subPlane(THREE, r, rowsTex, { opacity: 0, z: 0.022, order: 5 })));
  }

  // Handwritten pieces cut from the page image
  const R = mulberry(7);
  const sorted = [...HAND].sort((a, b) => PIECES[a.id][1] - PIECES[b.id][1]);
  const byTarget = {};
  for (const hItem of HAND) (byTarget[hItem.to] ||= []).push(hItem.id);
  const pieces = sorted.map((item, i) => {
    const rect = PIECES[item.id];
    const mesh = add(subPlane(THREE, rect, pageTex, { z: 0.003, order: 8 + i }));
    const [px, py, pw, ph] = rect;
    // Destination: target rect (split horizontally when several pieces share one target, RTL)
    const tr = cleanRect(item.to);
    const siblings = byTarget[item.to];
    const slot = siblings.indexOf(item.id), n = siblings.length;
    const sw = tr[2] / n;
    const dest = [tr[0] + tr[2] - sw * (slot + 1), tr[1], sw, tr[3]];
    const scale = Math.min((dest[3] * 0.9) / ph, (dest[2] * 0.95) / pw, 1.1);
    return {
      mesh, item,
      from: new THREE.Vector3(X(px + pw / 2), Y(py + ph / 2), 0.003),
      lift: new THREE.Vector3(X(px + pw / 2) + (R() - 0.5) * 0.02, Y(py + ph / 2) + 0.006 + R() * 0.01, 0.05 + R() * 0.03),
      to: new THREE.Vector3(X(dest[0] + dest[2] / 2), Y(dest[1] + dest[3] / 2), 0.03),
      spin: (R() - 0.5) * 0.12,
      scale,
      liftAt: 0.5 + i * 0.045,
      flyAt: 2.6 + i * 0.04,
    };
  });
  // The row appears when its last piece lands.
  const rowReveal = new Map();
  for (const p of pieces) rowReveal.set(p.item.to, Math.max(rowReveal.get(p.item.to) || 0, p.flyAt + 0.9));

  function update(t) {
    // frame
    const f = phase(t, 0, 0.5) * (1 - phase(t, 5.2, 0.8));
    frame.children.forEach((m) => { m.material.opacity = 0.9 * f; });
    // veil + panel
    veil.material.opacity = 0.93 * easeOut(phase(t, 0.6, 1.6));
    const pb = easeOut(phase(t, 2.3, 0.6));
    base.material.opacity = pb;
    base.scale.setScalar(0.97 + 0.03 * pb);

    for (const p of pieces) {
      const l = easeOut(phase(t, p.liftAt, 0.7));
      const fl = easeInOut(phase(t, p.flyAt, 0.9));
      const pos = p.mesh.position;
      pos.lerpVectors(p.from, p.lift, l);
      if (fl > 0) pos.lerp(p.to, fl);
      // a small arc while flying
      pos.z += Math.sin(fl * Math.PI) * 0.025;
      p.mesh.rotation.z = p.spin * l * (1 - fl);
      p.mesh.scale.setScalar((1 + 0.06 * l) * (1 - fl) + p.scale * fl);
      const landed = phase(t, p.flyAt + 0.9, 0.35);
      p.mesh.material.opacity = 1 - landed;
      p.mesh.visible = landed < 1;
    }
    for (const [id, mesh] of rows) {
      const r = phase(t, rowReveal.get(id), 0.35);
      mesh.material.opacity = r;
      mesh.scale.setScalar(1 + 0.04 * (1 - r) * (r > 0 ? 1 : 0));
    }
    // conflict pulse
    const c = phase(t, 5.0, 0.4);
    const pulse = 0.5 + 0.5 * Math.sin((t - 5.0) * Math.PI * 2 / 1.2);
    hlFill.material.opacity = c * (0.12 + 0.18 * pulse);
    ring.material.opacity = c * (0.55 + 0.45 * pulse);
    ring.scale.setScalar(1 + 0.04 * pulse * c);
    conn.material.opacity = c * 0.8;
  }

  update(0);
  return {
    group,
    duration: DURATION,
    update,
    dispose() { disposables.forEach((d) => d.dispose && d.dispose()); },
  };
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

