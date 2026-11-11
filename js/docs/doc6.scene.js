// Document 6 animation (business card, variant "out of the sky").
// The printed front is only a night sky. Particles of light rise from its stars and fly, in
// waves, to every point of the logo, name, tagline and icons; each shape turns crisp once
// its particles have arrived. Timeline (seconds):
//   0.0  discovery: thin gold frame + light sweep
//   0.3  the sky wakes up: the brightest printed stars glow and pulse
//   1.0  the sky calms into the ordered card's night; particles start to rise from the stars
//   2.4  constellation stars form (lines draw between them)
//   3.2  the logo forms -> burst of light and an expanding ring
//   3.8  name, then the gold divider (sparks), tagline, what we do, contact icons (rings)
//   5.9  finale glint; the logo breathes softly
//   6.3  the phone / Telegram / website links appear on the card (tappable, from ar.js)
import { kit, page, loadTexture, phase, easeOut, easeInOut, ACCENT } from '../scene-kit.js';
import { makeFx, linkLabels } from './card-fx.js';
import { PAGE, ORDER } from './doc6.data.js';
import { ELEMENTS, ATLAS_MM, STARS } from './doc6.layout.js';

export const DURATION = 6.8;
const ORDERED = new URL('../../img/doc6-ordered.jpg', import.meta.url).href;
const ATLAS = new URL('../../img/doc6-atlas.png', import.meta.url).href;
// when each group of shapes is complete (its particles have landed)
const LAND = { stars: 2.4, logo: 3.2, name: 3.8, divider: 4.3, tagline: 4.6, sub: 5.0, icons: 5.2 };

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export async function createScene(THREE, { renderer }) {
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const U = P.U;
  const [ordTex, atlasTex] = await Promise.all([loadTexture(THREE, ORDERED, renderer), loadTexture(THREE, ATLAS, renderer)]);
  K.track(ordTex, atlasTex);
  const FX = makeFx(THREE, K, P);
  const { ADD, glowTex, ringTex, sprite } = FX;
  const add = (o) => { K.group.add(o); return o; };
  const R = mulberry(606);

  const ordered = K.rectPlane([0, 0, PAGE.w, PAGE.h], { map: ordTex, opacity: 0, z: 0.002, order: 1 });
  const frame = K.frame();

  // ---- crisp pieces (fade in when their particles have arrived) ---------------------------
  const [AW, AH] = ATLAS_MM;
  const groupIdx = {};
  const pieces = ELEMENTS.map((e) => {
    const [ax, ay, aw, ah] = e.atlas;
    const geo = K.track(new THREE.PlaneGeometry(aw * U, ah * U));
    const uv = geo.attributes.uv, u0 = ax / AW, u1 = (ax + aw) / AW, v0 = 1 - (ay + ah) / AH, v1 = 1 - ay / AH;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, K.track(new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false })));
    mesh.position.set(P.X(e.ord.x), P.Y(e.ord.y), 0.03);
    mesh.renderOrder = 20;
    add(mesh);
    const i = (groupIdx[e.group] = (groupIdx[e.group] || 0) + 1) - 1;
    return { e, mesh, land: LAND[e.group] + i * (e.group === 'stars' || e.group === 'divider' ? 0.05 : 0.1), reveal: 0 };
  });

  // ---- particles: targets sampled from each piece's shape in the atlas ----------------------
  const img = atlasTex.image;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, cv.width, cv.height).data;
  const pxPerMm = cv.width / AW;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  const BUDGET = weak ? 1100 : 1800;
  const cand = pieces.map((p) => {
    const [ax, ay, aw, ah] = p.e.atlas, list = [];
    const x0 = Math.floor(ax * pxPerMm), y0 = Math.floor(ay * pxPerMm), x1 = Math.ceil((ax + aw) * pxPerMm), y1 = Math.ceil((ay + ah) * pxPerMm);
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const o = (y * cv.width + x) * 4; if (data[o + 3] > 150) list.push([x, y, data[o], data[o + 1], data[o + 2]]); }
    return list;
  });
  const total = cand.reduce((a, l) => a + l.length, 0);
  const starW = STARS.map((s) => s[2] * s[2]);
  const starSum = starW.reduce((a, b) => a + b, 0);
  const pickStar = () => { let x = R() * starSum, k = 0; while (x > starW[k] && k < starW.length - 1) { x -= starW[k]; k++; } return STARS[k]; };
  const parts = [];
  pieces.forEach((p, pi) => {
    const list = cand[pi]; if (!list.length) return;
    const n = Math.max(10, Math.round(BUDGET * list.length / total));
    const [ax, ay, aw, ah] = p.e.atlas;
    let lastLand = 0;
    for (let k = 0; k < n; k++) {
      const [x, y, r, g, b] = list[Math.floor(R() * list.length)];
      const tx = P.X(p.e.ord.x + (x / pxPerMm - (ax + aw / 2))), ty = P.Y(p.e.ord.y + (y / pxPerMm - (ay + ah / 2)));
      const s = pickStar();
      const ox = P.X(s[0] + (R() - 0.5) * 0.8), oy = P.Y(s[1] + (R() - 0.5) * 0.8);
      const land = p.land - 0.3 + R() * 0.35, fly = 1.3 + R() * 0.7;
      lastLand = Math.max(lastLand, land);
      const mx = (ox + tx) / 2, my = (oy + ty) / 2, dx = tx - ox, dy = ty - oy, side = (R() - 0.5) * 0.5;
      parts.push({ ox, oy, tx, ty, cxp: mx - dy * side, cyp: my + dx * side, z: 0.05 + R() * 0.08, dep: land - fly, land, piece: p, col: [r / 255, g / 255, b / 255], tw: R() * 6.28 });
    }
    p.reveal = lastLand + 0.12;
  });
  const N = parts.length;
  const pGeo = K.track(new THREE.BufferGeometry());
  const pPos = new Float32Array(N * 3), pCol = new Float32Array(N * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pMat = K.track(new THREE.PointsMaterial({ size: 0.011, vertexColors: true, transparent: true, blending: ADD, depthTest: false, depthWrite: false, map: glowTex }));
  const pts = add(new THREE.Points(pGeo, pMat)); pts.renderOrder = 40;

  // ---- the sky waking up: glows on the brightest printed stars ----------------------------------
  const bright = STARS.filter((s) => s[2] >= 0.7);
  const glows = bright.map((s) => { const m = sprite(glowTex, s[2] * 5.5 * U, 6); m.position.set(P.X(s[0]), P.Y(s[1]), 0.004); return { m, s, tw: R() * 6.28 }; });

  // constellation lines (after the stars have formed), logo bloom/shock/halo, flashes
  const byId = Object.fromEntries(pieces.map((p) => [p.e.id, p]));
  const segs = [];
  ORDER.chains.forEach((ch) => { for (let i = 0; i < ch.length - 1; i++) { const a = byId['st' + ch[i]], b = byId['st' + ch[i + 1]]; segs.push({ rib: K.ribbon([a.e.ord.x, a.e.ord.y], [b.e.ord.x, b.e.ord.y], { width: 0.32, color: ACCENT, bend: 0, z: 0.025, order: 15 }), at: Math.max(a.reveal, b.reveal) + i * 0.08 }); } });
  const logoDone = Math.max(...pieces.filter((p) => p.e.group === 'logo').map((p) => p.reveal));
  const logoC = new THREE.Vector3(P.X(ORDER.logo.x), P.Y(ORDER.logo.y), 0.04);
  const bloom = sprite(glowTex, 0.6, 65); bloom.position.copy(logoC);
  const shock = sprite(ringTex, 0.3, 66); shock.position.copy(logoC);
  const halo = sprite(glowTex, 0.42, 14); halo.position.set(logoC.x, logoC.y, 0.02);
  const flashes = pieces.filter((p) => p.e.kind === 'shard' || p.e.kind === 'icon').map((p) => { const m = sprite(p.e.kind === 'icon' ? ringTex : glowTex, (p.e.kind === 'icon' ? 16 : 9) * U, 70); m.position.set(P.X(p.e.ord.x), P.Y(p.e.ord.y), 0.05); return { m, p }; });

  const { labels, labelAlpha } = linkLabels(P, ORDER, 6.3);

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.4) * (1 - phase(t, 1.6, 0.6)));
    FX.updateSweep(t, [[0.15, 1.0], [5.9, 1.0]]);
    ordered.material.opacity = easeInOut(phase(t, 1.0, 0.9));
    // star glows: wake up, pulse while emitting, then settle away so the final card is clean
    for (const g of glows) {
      const wake = easeOut(phase(t, 0.3, 0.8)), away = phase(t, 5.4, 1.0);
      g.m.material.opacity = wake * (1 - away) * (0.45 + 0.3 * Math.sin(t * 4 + g.tw));
      g.m.scale.setScalar(1 + 0.18 * Math.sin(t * 3 + g.tw));
    }
    // particles
    for (let i = 0; i < N; i++) {
      const q = parts[i], o = i * 3;
      const k = easeInOut(phase(t, q.dep, q.land - q.dep));
      const it = 1 - k;
      let x = it * it * q.ox + 2 * it * k * q.cxp + k * k * q.tx;
      let y = it * it * q.oy + 2 * it * k * q.cyp + k * k * q.ty;
      if (k >= 1) { x += Math.sin(t * 5 + q.tw) * 0.0008; y += Math.cos(t * 4 + q.tw) * 0.0008; }
      pPos[o] = x; pPos[o + 1] = y; pPos[o + 2] = 0.01 + Math.sin(k * Math.PI) * q.z;
      // visible from departure; fades into the crisp shape after it is revealed
      const vis = phase(t, q.dep - 0.15, 0.25) * (1 - phase(t, q.piece.reveal, 0.6));
      const warm = 1 - k; // starlight while flying, the piece's own colour when landing
      const tw = k >= 1 ? 0.8 + 0.2 * Math.sin(t * 6 + q.tw) : 1;
      pCol[o] = vis * tw * (q.col[0] * k + 1.0 * warm);
      pCol[o + 1] = vis * tw * (q.col[1] * k + 0.93 * warm);
      pCol[o + 2] = vis * tw * (q.col[2] * k + 0.78 * warm);
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    // crisp shapes
    for (const p of pieces) {
      const r = easeOut(phase(t, p.reveal, 0.45));
      p.mesh.material.opacity = r;
      p.mesh.scale.setScalar(1.06 - 0.06 * r);
    }
    for (const s of segs) s.rib.setProgress(easeOut(phase(t, s.at, 0.4)));
    FX.flash(bloom, t, logoDone - 0.05, 0.9, 0.4, 1.6, 0.95);
    const sw = phase(t, logoDone, 1.0);
    shock.material.opacity = sw > 0 && sw < 1 ? (1 - sw) * 0.9 : 0;
    shock.scale.setScalar(0.3 + sw * 4.2);
    halo.material.opacity = phase(t, logoDone, 0.8) * (0.32 + 0.14 * Math.sin(t * 1.8));
    for (const f of flashes) FX.flash(f.m, t, f.p.reveal - 0.05, 0.45, 0.5, f.p.e.kind === 'icon' ? 1.7 : 1.3);
  }
  update(0);
  return { group: K.group, duration: DURATION, update, labels, labelAlpha, pageH: P.H, dispose: K.dispose };
}
