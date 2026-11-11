// Document 5 animation: our business card goes «از پراکندگی تا نظم».
//
// The printed front is a scattered night sky. Every brand piece printed on it has an
// identical sprite (from img/doc5-atlas.png) that starts exactly on top of it, so the
// paper itself seems to come alive. Timeline (seconds):
//   0.0  discovery: a thin gold frame and a light sweep across the card
//   0.5  the printed chaos dissolves into a calm sky; the scattered pieces lift and drift
//   1.2  gold dust swirls in like a small galaxy
//   2.0  stars fly to their places leaving light trails; constellation lines draw between them
//   3.0  the logo's bars and dots converge -> burst of light and an expanding ring
//   3.6  the name glides in, gold shards snap into a divider one by one (each with a spark)
//   4.5  the tagline and what we do settle; the contact icons pop in with small rings
//   5.6  finale: a glint sweeps across the whole card; the logo keeps breathing softly
//   6.0  the phone / Telegram / website links appear on the card (tappable, from ar.js)
import { kit, page, loadTexture, phase, easeOut, easeInOut, ACCENT } from '../scene-kit.js';
import { makeFx, linkLabels } from './card-fx.js';
import { PAGE, ORDER } from './doc5.data.js';
import { ELEMENTS, ATLAS_MM } from './doc5.layout.js';

export const DURATION = 6.6;
const ORDERED = new URL('../../img/doc5-ordered.jpg', import.meta.url).href;
const ATLAS = new URL('../../img/doc5-atlas.png', import.meta.url).href;

// when each group of pieces starts flying, and the stagger between pieces
const WAVES = { stars: [2.0, 0.07, 1.1], logo: [3.0, 0.12, 1.0], name: [3.6, 0.15, 1.0], divider: [4.2, 0.06, 0.7], tagline: [4.5, 0.1, 0.9], sub: [4.9, 0, 0.9], icons: [5.1, 0.15, 0.8] };

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
  const add = (o) => { K.group.add(o); return o; };
  const FX = makeFx(THREE, K, P);
  const { ADD, glowTex, ringTex, sprite } = FX;

  // ---- layers ----------------------------------------------------------------------------
  const ordered = K.rectPlane([0, 0, PAGE.w, PAGE.h], { map: ordTex, opacity: 0, z: 0.002, order: 1 });
  const frame = K.frame();

  // ---- the pieces --------------------------------------------------------------------------
  const R = mulberry(77);
  const [AW, AH] = ATLAS_MM;
  const groupCount = {};
  const pieces = ELEMENTS.map((e) => {
    const [ax, ay, aw, ah] = e.atlas;
    const geo = K.track(new THREE.PlaneGeometry(aw * U, ah * U));
    const uv = geo.attributes.uv, u0 = ax / AW, u1 = (ax + aw) / AW, v0 = 1 - (ay + ah) / AH, v1 = 1 - ay / AH;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, K.track(new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, depthTest: false, depthWrite: false })));
    mesh.renderOrder = 20 + (e.kind === 'word' ? 10 : 0);
    add(mesh);
    const idx = (groupCount[e.group] = (groupCount[e.group] || 0) + 1) - 1;
    const [w0, stag, dur] = WAVES[e.group];
    const from = new THREE.Vector3(P.X(e.scat.x), P.Y(e.scat.y), 0.003);
    const to = new THREE.Vector3(P.X(e.ord.x), P.Y(e.ord.y), 0.03);
    // curved flight: control point pushed sideways, so pieces swoop rather than slide
    const mid = from.clone().lerp(to, 0.5);
    const dir = to.clone().sub(from); const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar((R() - 0.5) * 0.35 * Math.min(1, dir.length() * 2));
    return {
      e, mesh, from, to, ctrl: mid.add(side),
      rot0: THREE.MathUtils.degToRad(-e.scat.rot), s0: e.scat.s,
      drift: [R() * 6.28, 0.006 + R() * 0.01, 0.4 + R() * 0.5], liftZ: 0.02 + R() * 0.05,
      start: w0 + idx * stag, dur, land: w0 + idx * stag + dur,
      trail: e.kind === 'star' ? [] : null,
      flash: e.kind === 'shard' || e.kind === 'icon' ? sprite(e.kind === 'icon' ? ringTex : glowTex, (e.kind === 'icon' ? 16 : 9) * U, 70) : null,
    };
  });
  const byId = Object.fromEntries(pieces.map((p) => [p.e.id, p]));
  const logoLand = Math.max(...pieces.filter((p) => p.e.group === 'logo').map((p) => p.land));
  const logoC = new THREE.Vector3(P.X(ORDER.logo.x), P.Y(ORDER.logo.y), 0.04);

  // constellation lines, drawn once both stars of a segment have landed
  const segs = [];
  ORDER.chains.forEach((ch) => { for (let i = 0; i < ch.length - 1; i++) { const a = byId['st' + ch[i]], b = byId['st' + ch[i + 1]]; segs.push({ rib: K.ribbon([a.e.ord.x, a.e.ord.y], [b.e.ord.x, b.e.ord.y], { width: 0.32, color: ACCENT, bend: 0, z: 0.025, order: 15 }), at: Math.max(a.land, b.land) + i * 0.08 }); } });

  // light trails behind the flying stars (additive points, fading with age)
  const TRAIL = 14, starPieces = pieces.filter((p) => p.trail);
  const trailGeo = K.track(new THREE.BufferGeometry());
  const tPos = new Float32Array(starPieces.length * TRAIL * 3), tCol = new Float32Array(starPieces.length * TRAIL * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const trailMat = K.track(new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, blending: ADD, depthTest: false, depthWrite: false, map: glowTex }));
  const trails = add(new THREE.Points(trailGeo, trailMat)); trails.renderOrder = 18;

  // gold dust: swirls in (galaxy), then bursts out when the logo completes, then twinkles
  const ND = 420, dust = [];
  for (let i = 0; i < ND; i++) dust.push({ a: R() * 6.28, r0: 0.25 + R() * 0.6, spin: 1.8 + R() * 2.2, out: 0.15 + R() * 0.5, oa: R() * 6.28, tw: R() * 6.28, home: [P.X(R() * PAGE.w), P.Y(R() * PAGE.h)], warm: R() < 0.7 });
  const dGeo = K.track(new THREE.BufferGeometry());
  const dPos = new Float32Array(ND * 3), dCol = new Float32Array(ND * 3);
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dMat = K.track(new THREE.PointsMaterial({ size: 0.011, vertexColors: true, transparent: true, opacity: 0, blending: ADD, depthTest: false, depthWrite: false, map: glowTex }));
  const dustPts = add(new THREE.Points(dGeo, dMat)); dustPts.renderOrder = 50;

  // logo bloom + shockwave + breathing glow
  const bloom = sprite(glowTex, 0.6, 65); bloom.position.copy(logoC);
  const shock = sprite(ringTex, 0.3, 66); shock.position.copy(logoC);
  const halo = sprite(glowTex, 0.42, 14); halo.position.set(logoC.x, logoC.y, 0.02);

  // ---- on-screen links (tappable, placed by ar.js over the contact rows) ---------------------
  const { labels, labelAlpha } = linkLabels(P, ORDER, 6.0);

  function update(t) {
    // discovery + finale
    frame.set(0.9 * phase(t, 0, 0.4) * (1 - phase(t, 1.6, 0.6)));
    FX.updateSweep(t, [[0.2, 1.0], [5.6, 1.0]]);
    // the printed chaos calms quickly while the meaningful pieces lift, so nothing looks doubled
    ordered.material.opacity = easeInOut(phase(t, 0.45, 0.85));

    // pieces
    for (const p of pieces) {
      const lift = easeOut(phase(t, 0.55, 1.1));
      const k = easeInOut(phase(t, p.start, p.dur));
      const [da, dr, ds] = p.drift;
      const wob = (1 - k) * lift;
      // quadratic bezier flight
      const it = 1 - k;
      const x = it * it * p.from.x + 2 * it * k * p.ctrl.x + k * k * p.to.x + Math.cos(da + t * ds) * dr * wob;
      const y = it * it * p.from.y + 2 * it * k * p.ctrl.y + k * k * p.to.y + Math.sin(da + t * ds) * dr * wob;
      p.mesh.position.set(x, y, 0.003 + p.liftZ * lift * (1 - k) + Math.sin(k * Math.PI) * 0.08 + 0.027 * k);
      p.mesh.rotation.z = p.rot0 * (1 - k) + Math.sin(da + t * 0.8) * 0.15 * wob;
      p.mesh.scale.setScalar(p.s0 * (1 - k) + k + 0.06 * lift * (1 - k));
      if (p.trail) {
        if (k > 0 && k < 1) { p.trail.unshift([x, y, p.mesh.position.z]); if (p.trail.length > TRAIL) p.trail.pop(); } else if (p.trail.length) p.trail.pop();
      }
      if (p.flash) {
        const f = phase(t, p.land - 0.05, 0.45);
        p.flash.position.set(p.to.x, p.to.y, 0.05);
        p.flash.material.opacity = f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0;
        p.flash.scale.setScalar(0.5 + f * (p.e.kind === 'icon' ? 1.2 : 0.8));
      }
    }
    // trails
    starPieces.forEach((p, si) => {
      for (let j = 0; j < TRAIL; j++) {
        const q = p.trail[j], o = (si * TRAIL + j) * 3;
        if (q) { tPos[o] = q[0]; tPos[o + 1] = q[1]; tPos[o + 2] = q[2]; const b = (1 - j / TRAIL) * 0.9; tCol[o] = b; tCol[o + 1] = b * 0.86; tCol[o + 2] = b * 0.55; } else { tCol[o] = tCol[o + 1] = tCol[o + 2] = 0; }
      }
    });
    trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    // constellation lines
    for (const s of segs) s.rib.setProgress(easeOut(phase(t, s.at, 0.4)));

    // gold dust: in (1.2-3.4), burst at the logo (logoLand), drift and twinkle afterwards
    const din = easeInOut(phase(t, 1.2, 2.2)), burst = easeOut(phase(t, logoLand, 1.1));
    dMat.opacity = Math.min(1, phase(t, 1.2, 0.5)) * (1 - 0.65 * phase(t, logoLand + 0.6, 1.2));
    for (let i = 0; i < ND; i++) {
      const d = dust[i], o = i * 3;
      const ang = d.a + t * d.spin * (1 - burst * 0.7);
      const rr = d.r0 * (1 - din) + 0.012;
      let x = logoC.x + Math.cos(ang) * rr, y = logoC.y + Math.sin(ang) * rr * 0.8;
      if (burst > 0) { x += Math.cos(d.oa) * d.out * burst; y += Math.sin(d.oa) * d.out * burst; }
      if (t < 1.2) { x = d.home[0]; y = d.home[1]; }
      const settle = phase(t, logoLand + 1.0, 1.4); // after the burst the dust drifts home and twinkles
      x += (d.home[0] - x) * settle; y += (d.home[1] - y) * settle;
      dPos[o] = x; dPos[o + 1] = y; dPos[o + 2] = 0.06;
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + d.tw);
      dCol[o] = tw; dCol[o + 1] = tw * (d.warm ? 0.85 : 0.95); dCol[o + 2] = tw * (d.warm ? 0.55 : 1);
    }
    dGeo.attributes.position.needsUpdate = true; dGeo.attributes.color.needsUpdate = true;

    // logo bloom, shockwave, breathing halo
    const b = phase(t, logoLand - 0.05, 0.9);
    bloom.material.opacity = b > 0 && b < 1 ? Math.sin(b * Math.PI) * 0.95 : 0;
    bloom.scale.setScalar(0.4 + b * 1.2);
    const sw = phase(t, logoLand, 1.0);
    shock.material.opacity = sw > 0 && sw < 1 ? (1 - sw) * 0.9 : 0;
    shock.scale.setScalar(0.3 + sw * 4.2);
    halo.material.opacity = phase(t, logoLand, 0.8) * (0.32 + 0.14 * Math.sin(t * 1.8));
  }
  update(0);
  return { group: K.group, duration: DURATION, update, labels, labelAlpha, pageH: P.H, dispose: K.dispose };
}
