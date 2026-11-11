// Document 5 animation (our business card): the logo, name and lines start scattered
// around the card and resolve into place («از پراکندگی تا نظم»), then the real card shows.
//
// A plane with the card's background (img/doc5-bg.jpg, the card without its elements)
// first covers the real card; the pieces, cut from the full card image, fly in and land
// exactly on their printed positions; then the cover fades and the real card remains.
import { kit, page, loadTexture, phase, easeOut, easeInOut, ACCENT } from '../scene-kit.js';
import { PAGE, PIECE_ORDER } from './doc5.data.js';
import { PIECES } from './doc5.layout.js';

export const DURATION = 3.9;
const FULL = new URL('../../img/doc5.jpg', import.meta.url).href;
const BG = new URL('../../img/doc5-bg.jpg', import.meta.url).href;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export async function createScene(THREE, { renderer }) {
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const [full, bg] = await Promise.all([loadTexture(THREE, FULL, renderer), loadTexture(THREE, BG, renderer)]);
  K.track(full, bg);
  const pageRect = [0, 0, PAGE.w, PAGE.h];
  const cover = K.rectPlane(pageRect, { map: bg, z: 0.001, order: 1 });
  const frame = K.frame();

  const R = mulberry(9);
  const pieces = PIECE_ORDER.filter((id) => PIECES[id]).map((id, i) => {
    const rect = PIECES[id];
    const mesh = K.rectPlane(rect, { map: full, z: 0.01, order: 10 + i, opacity: 0 });
    const home = mesh.position.clone();
    const ang = R() * Math.PI * 2, dist = 0.35 + R() * 0.35;
    return {
      mesh, home,
      from: new THREE.Vector3(home.x + Math.cos(ang) * dist, home.y + Math.sin(ang) * dist, 0.06 + R() * 0.08),
      rot: (R() - 0.5) * 1.6, s0: 0.5 + R() * 0.9, start: 0.25 + i * 0.12,
    };
  });

  // a few gold sparks that trail the pieces
  const sparkGeo = new THREE.BufferGeometry();
  const N = 90, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push([R() * Math.PI * 2, 0.15 + R() * 0.5, R()]);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: new THREE.Color(ACCENT), size: 0.012, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  K.track(sparkGeo, sparkMat);
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.renderOrder = 30;
  K.group.add(sparks);

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.4) * (1 - phase(t, DURATION - 0.3, 0.6)));
    for (const p of pieces) {
      const k = easeInOut(phase(t, p.start, 1.5));
      p.mesh.material.opacity = Math.min(1, phase(t, p.start - 0.2, 0.3));
      p.mesh.position.lerpVectors(p.from, p.home, k);
      p.mesh.position.z = p.home.z + (1 - k) * p.from.z;
      p.mesh.rotation.z = p.rot * (1 - k);
      p.mesh.scale.setScalar(p.s0 + (1 - p.s0) * k);
    }
    // sparks swirl in and settle towards the centre of the brand block
    const sOn = phase(t, 0.2, 0.4) * (1 - phase(t, 2.4, 0.8));
    sparkMat.opacity = 0.9 * sOn;
    for (let i = 0; i < N; i++) {
      const [a, r, s] = seeds[i];
      const k = easeOut(phase(t, 0.2 + s * 0.6, 1.8));
      const rr = r * (1 - k) + 0.02;
      const aa = a + t * (1.5 + s);
      pos[i * 3] = Math.cos(aa) * rr;
      pos[i * 3 + 1] = P.Y(30) + Math.sin(aa) * rr * 1.2;
      pos[i * 3 + 2] = 0.03;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    // when everything has landed, the cover fades and the real card shows through
    cover.material.opacity = 1 - phase(t, 2.6, 0.8);
    for (const p of pieces) if (t > 2.6) p.mesh.material.opacity = 1 - phase(t, 2.9, 0.7);
  }
  update(0);
  return { group: K.group, duration: DURATION, update, pageH: P.H, dispose: K.dispose };
}
