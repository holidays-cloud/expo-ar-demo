// Shared animation engine for the two business cards («از پراکندگی تا نظم»).
//   variant 'pieces' (doc5): the brand pieces printed scattered on the front lift off the
//     paper and swoop to their places.
//   variant 'sky' (doc6): the front is only sky; every piece is launched from one of the
//     printed stars as a point of light and flies to its place like a comet, growing and
//     turning as it goes.
// Common to both (seconds):
//   0.0  discovery: thin gold frame + light sweep
//   ~1   the printed sky calms into the ordered card's night; gold dust swirls in (galaxy)
//   2.0  stars fly in with light trails; constellation lines draw between them
//   3.0  the logo converges -> burst of light + expanding gold ring; the logo then breathes
//   3.6  name, gold shards snapping into a divider (sparks), tagline, what we do, icons
//   5.3  the contact rows slide out of their icons with a travelling glint
//   6.0  finale glint across the card; the rows become tappable (invisible tap areas from ar.js)
import { kit, page, loadTexture, phase, easeOut, easeInOut, ACCENT } from '../scene-kit.js';
import { makeFx } from './card-fx.js';
import { contactLinks } from '../contact.js';

export const DURATION = 6.8;
// [first start, stagger, flight duration] per group
const WAVES = { stars: [2.0, 0.07, 1.1], logo: [3.0, 0.12, 1.0], name: [3.6, 0.15, 1.0], divider: [4.2, 0.06, 0.7], tagline: [4.5, 0.1, 0.9], sub: [4.9, 0, 0.9], icons: [5.1, 0.15, 0.8] };
const ROWS_AT = 5.3, ROW_STEP = 0.18, ROW_DUR = 0.55, TAP_AT = 6.0;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * cfg: { variant, orderedUrl, atlasUrl, PAGE, ORDER, ELEMENTS, ATLAS_MM, STARS }
 */
export async function createCardScene(THREE, { renderer }, cfg) {
  const { variant, PAGE, ORDER, ELEMENTS, ATLAS_MM, STARS = [] } = cfg;
  const sky = variant === 'sky';
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const U = P.U;
  const [ordTex, atlasTex] = await Promise.all([loadTexture(THREE, cfg.orderedUrl, renderer), loadTexture(THREE, cfg.atlasUrl, renderer)]);
  K.track(ordTex, atlasTex);
  const FX = makeFx(THREE, K, P);
  const { ADD, glowTex, ringTex, sprite } = FX;
  const add = (o) => { K.group.add(o); return o; };
  const R = mulberry(sky ? 606 : 77);

  const ordered = K.rectPlane([0, 0, PAGE.w, PAGE.h], { map: ordTex, opacity: 0, z: 0.002, order: 1 });
  const frame = K.frame();

  // ---- sky variant: the printed stars wake up, and each piece gets a star to launch from ----
  const bright = STARS.filter((s) => s[2] >= 0.7);
  const glows = sky ? bright.map((s) => { const m = sprite(glowTex, s[2] * 5.5 * U, 6); m.position.set(P.X(s[0]), P.Y(s[1]), 0.004); return { m, tw: R() * 6.28 }; }) : [];
  const pool = bright.slice().sort(() => R() - 0.5);
  let poolI = 0;
  const nextStar = () => pool[(poolI++) % Math.max(1, pool.length)] || [PAGE.w / 2, PAGE.h / 2, 1];

  // ---- the pieces ----------------------------------------------------------------------------
  const [AW, AH] = ATLAS_MM;
  const groupCount = {};
  const pieces = [], rows = [];
  for (const e of ELEMENTS) {
    const [ax, ay, aw, ah] = e.atlas;
    const geo = K.track(new THREE.PlaneGeometry(aw * U, ah * U));
    const uv = geo.attributes.uv, u0 = ax / AW, u1 = (ax + aw) / AW, v0 = 1 - (ay + ah) / AH, v1 = 1 - ay / AH;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, K.track(new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, depthTest: false, depthWrite: false })));
    mesh.renderOrder = 20 + (e.kind === 'word' ? 10 : 0);
    add(mesh);
    const to = new THREE.Vector3(P.X(e.ord.x), P.Y(e.ord.y), 0.03);
    if (e.group === 'rows') { // slide out of the icon, right to left
      const i = rows.length;
      mesh.material.opacity = 0;
      geo.translate(-aw * U / 2, 0, 0); // origin at the right edge
      const right = P.X(e.ord.x + aw / 2);
      mesh.position.set(right, to.y, 0.03);
      rows.push({ e, mesh, right, w: aw * U, at: ROWS_AT + i * ROW_STEP, glint: sprite(glowTex, 7 * U, 72) });
      continue;
    }
    const idx = (groupCount[e.group] = (groupCount[e.group] || 0) + 1) - 1;
    const [w0, stag, dur] = WAVES[e.group];
    let from, rot0, s0;
    if (sky) {
      const st = nextStar();
      from = new THREE.Vector3(P.X(st[0]), P.Y(st[1]), 0.004);
      rot0 = (R() - 0.5) * Math.PI * 2;
      s0 = e.kind === 'star' ? Math.min(1, st[2] / e.r) : e.kind === 'dot' ? 0.25 : 0.04;
    } else {
      from = new THREE.Vector3(P.X(e.scat.x), P.Y(e.scat.y), 0.003);
      rot0 = THREE.MathUtils.degToRad(-e.scat.rot);
      s0 = e.scat.s;
    }
    const mid = from.clone().lerp(to, 0.5);
    const dir = to.clone().sub(from);
    const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar((R() - 0.5) * (sky ? 0.55 : 0.35) * Math.min(1, dir.length() * 2));
    const start = w0 + idx * stag;
    pieces.push({
      e, mesh, from, to, ctrl: mid.add(side), rot0, s0,
      drift: [R() * 6.28, 0.006 + R() * 0.01, 0.4 + R() * 0.5], liftZ: 0.02 + R() * 0.05,
      start, dur, land: start + dur,
      trail: sky || e.kind === 'star' ? [] : null,
      head: sky ? sprite(glowTex, (e.kind === 'word' ? 9 : 6) * U, 45) : null,
      launch: sky ? sprite(glowTex, 10 * U, 44) : null,
      flash: e.kind === 'shard' || e.kind === 'icon' ? sprite(e.kind === 'icon' ? ringTex : glowTex, (e.kind === 'icon' ? 16 : 9) * U, 70) : null,
    });
    if (sky) mesh.material.opacity = 0;
  }
  const byId = Object.fromEntries(pieces.map((p) => [p.e.id, p]));
  const logoLand = Math.max(...pieces.filter((p) => p.e.group === 'logo').map((p) => p.land));
  const logoC = new THREE.Vector3(P.X(ORDER.logo.x), P.Y(ORDER.logo.y), 0.04);

  // constellation lines
  const segs = [];
  ORDER.chains.forEach((ch) => { for (let i = 0; i < ch.length - 1; i++) { const a = byId['st' + ch[i]], b = byId['st' + ch[i + 1]]; segs.push({ rib: K.ribbon([a.e.ord.x, a.e.ord.y], [b.e.ord.x, b.e.ord.y], { width: 0.32, color: ACCENT, bend: 0, z: 0.025, order: 15 }), at: Math.max(a.land, b.land) + i * 0.08 }); } });

  // light trails (comet tails) behind flying pieces
  const TRAIL = sky ? 18 : 14, tp = pieces.filter((p) => p.trail);
  const tGeo = K.track(new THREE.BufferGeometry());
  const tPos = new Float32Array(tp.length * TRAIL * 3), tCol = new Float32Array(tp.length * TRAIL * 3);
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const tMat = K.track(new THREE.PointsMaterial({ size: sky ? 0.016 : 0.014, vertexColors: true, transparent: true, blending: ADD, depthTest: false, depthWrite: false, map: glowTex }));
  add(new THREE.Points(tGeo, tMat)).renderOrder = 18;

  // gold dust galaxy
  const ND = 420, dust = [];
  for (let i = 0; i < ND; i++) dust.push({ a: R() * 6.28, r0: 0.25 + R() * 0.6, spin: 1.8 + R() * 2.2, out: 0.15 + R() * 0.5, oa: R() * 6.28, tw: R() * 6.28, home: [P.X(R() * PAGE.w), P.Y(R() * PAGE.h)], warm: R() < 0.7 });
  const dGeo = K.track(new THREE.BufferGeometry());
  const dPos = new Float32Array(ND * 3), dCol = new Float32Array(ND * 3);
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dMat = K.track(new THREE.PointsMaterial({ size: 0.011, vertexColors: true, transparent: true, opacity: 0, blending: ADD, depthTest: false, depthWrite: false, map: glowTex }));
  add(new THREE.Points(dGeo, dMat)).renderOrder = 50;

  const bloom = sprite(glowTex, 0.6, 65); bloom.position.copy(logoC);
  const shock = sprite(ringTex, 0.3, 66); shock.position.copy(logoC);
  const halo = sprite(glowTex, 0.42, 14); halo.position.set(logoC.x, logoC.y, 0.02);

  // invisible tap areas over the contact rows (drawn on the card itself)
  const links = contactLinks();
  const labels = rows.map((r) => {
    const { e } = r, c = links.find((l) => l.kind === e.link);
    return { hit: true, href: c.href, title: c.label, link: e.link, rect: [P.X(e.ord.x - e.rw / 2), P.Y(e.ord.y - e.rh / 2), P.X(ORDER.iconX + 5), P.Y(e.ord.y + e.rh / 2)] /* row + its icon */ };
  });
  const labelAlpha = (t) => labels.map(() => (t >= TAP_AT ? 1 : 0));

  const calmAt = sky ? 1.0 : 0.45, calmDur = sky ? 0.9 : 0.85;

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.4) * (1 - phase(t, 1.6, 0.6)));
    FX.updateSweep(t, [[0.2, 1.0], [6.0, 1.0]]);
    ordered.material.opacity = easeInOut(phase(t, calmAt, calmDur));
    for (const g of glows) {
      g.m.material.opacity = easeOut(phase(t, 0.3, 0.8)) * (1 - phase(t, 5.0, 1.0)) * (0.45 + 0.3 * Math.sin(t * 4 + g.tw));
      g.m.scale.setScalar(1 + 0.18 * Math.sin(t * 3 + g.tw));
    }

    for (const p of pieces) {
      const k = easeInOut(phase(t, p.start, p.dur));
      const it = 1 - k;
      let x = it * it * p.from.x + 2 * it * k * p.ctrl.x + k * k * p.to.x;
      let y = it * it * p.from.y + 2 * it * k * p.ctrl.y + k * k * p.to.y;
      let z, rot = p.rot0 * (1 - k), sc;
      if (sky) {
        z = 0.004 + Math.sin(k * Math.PI) * 0.09 + 0.026 * k;
        sc = p.s0 + (1 - p.s0) * easeOut(k);
        p.mesh.material.opacity = Math.min(1, phase(t, p.start - 0.05, 0.25));
        const fl = phase(t, p.start - 0.25, 0.5); // the source star flares at launch
        p.launch.position.set(p.from.x, p.from.y, 0.006);
        p.launch.material.opacity = fl > 0 && fl < 1 ? Math.sin(fl * Math.PI) : 0;
        p.launch.scale.setScalar(0.6 + fl);
        p.head.position.set(x, y, z + 0.005);
        p.head.material.opacity = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.9 : 0;
      } else {
        const lift = easeOut(phase(t, 0.55, 1.1));
        const [da, dr, ds] = p.drift, wob = (1 - k) * lift;
        x += Math.cos(da + t * ds) * dr * wob; y += Math.sin(da + t * ds) * dr * wob;
        z = 0.003 + p.liftZ * lift * (1 - k) + Math.sin(k * Math.PI) * 0.08 + 0.027 * k;
        rot += Math.sin(da + t * 0.8) * 0.15 * wob;
        sc = p.s0 * (1 - k) + k + 0.06 * lift * (1 - k);
      }
      p.mesh.position.set(x, y, z);
      p.mesh.rotation.z = rot;
      p.mesh.scale.setScalar(sc);
      if (p.trail) { if (k > 0 && k < 1) { p.trail.unshift([x, y, z]); if (p.trail.length > TRAIL) p.trail.pop(); } else if (p.trail.length) p.trail.pop(); }
      if (p.flash) { p.flash.position.set(p.to.x, p.to.y, 0.05); FX.flash(p.flash, t, p.land - 0.05, 0.45, 0.5, p.e.kind === 'icon' ? 1.7 : 1.3); }
    }
    tp.forEach((p, si) => {
      for (let j = 0; j < TRAIL; j++) {
        const q = p.trail[j], o = (si * TRAIL + j) * 3;
        if (q) { tPos[o] = q[0]; tPos[o + 1] = q[1]; tPos[o + 2] = q[2]; const b = (1 - j / TRAIL) * 0.9; tCol[o] = b; tCol[o + 1] = b * 0.86; tCol[o + 2] = b * 0.55; } else { tCol[o] = tCol[o + 1] = tCol[o + 2] = 0; }
      }
    });
    tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
    for (const s of segs) s.rib.setProgress(easeOut(phase(t, s.at, 0.4)));

    // contact rows: slide out of the icon (right to left) with a travelling glint
    for (const r of rows) {
      const k = easeOut(phase(t, r.at, ROW_DUR));
      r.mesh.material.opacity = Math.min(1, phase(t, r.at, 0.2));
      r.mesh.scale.set(0.04 + 0.96 * k, 1, 1);
      const g = phase(t, r.at, ROW_DUR + 0.15);
      r.glint.position.set(r.right - r.w * k, r.mesh.position.y, 0.05);
      r.glint.material.opacity = g > 0 && g < 1 ? Math.sin(g * Math.PI) : 0;
      r.glint.scale.setScalar(0.8 + 0.4 * Math.sin(g * Math.PI));
    }

    // dust galaxy: swirl in, burst at the logo, drift home and twinkle
    const din = easeInOut(phase(t, 1.2, 2.2)), burst = easeOut(phase(t, logoLand, 1.1));
    dMat.opacity = Math.min(1, phase(t, 1.2, 0.5)) * (1 - 0.65 * phase(t, logoLand + 0.6, 1.2));
    const settle = phase(t, logoLand + 1.0, 1.4);
    for (let i = 0; i < ND; i++) {
      const d = dust[i], o = i * 3;
      const ang = d.a + t * d.spin * (1 - burst * 0.7), rr = d.r0 * (1 - din) + 0.012;
      let x = logoC.x + Math.cos(ang) * rr, y = logoC.y + Math.sin(ang) * rr * 0.8;
      if (burst > 0) { x += Math.cos(d.oa) * d.out * burst; y += Math.sin(d.oa) * d.out * burst; }
      if (t < 1.2) { x = d.home[0]; y = d.home[1]; }
      x += (d.home[0] - x) * settle; y += (d.home[1] - y) * settle;
      dPos[o] = x; dPos[o + 1] = y; dPos[o + 2] = 0.06;
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + d.tw);
      dCol[o] = tw; dCol[o + 1] = tw * (d.warm ? 0.85 : 0.95); dCol[o + 2] = tw * (d.warm ? 0.55 : 1);
    }
    dGeo.attributes.position.needsUpdate = true; dGeo.attributes.color.needsUpdate = true;

    FX.flash(bloom, t, logoLand - 0.05, 0.9, 0.4, 1.6, 0.95);
    const sw = phase(t, logoLand, 1.0);
    shock.material.opacity = sw > 0 && sw < 1 ? (1 - sw) * 0.9 : 0;
    shock.scale.setScalar(0.3 + sw * 4.2);
    halo.material.opacity = phase(t, logoLand, 0.8) * (0.32 + 0.14 * Math.sin(t * 1.8));
  }
  update(0);
  return { group: K.group, duration: DURATION, update, labels, labelAlpha, pageH: P.H, dispose: K.dispose };
}
