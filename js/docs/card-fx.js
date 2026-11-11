// Shared effects for the two business-card animations (doc5 "scattered pieces",
// doc6 "out of the sky"): soft glow, glowing ring, light sweep band, additive sprites,
// and the tappable contact links pinned on the card.
import { phase } from '../scene-kit.js';
import { contactLinks } from '../contact.js';

export function canvasTex(THREE, w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Glow/ring/band textures + helpers bound to a scene-kit instance K. */
export function makeFx(THREE, K, P) {
  const ADD = THREE.AdditiveBlending;
  const glowTex = K.track(canvasTex(THREE, 128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,246,220,1)'); r.addColorStop(0.25, 'rgba(255,226,160,0.7)'); r.addColorStop(1, 'rgba(217,184,113,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }));
  const ringTex = K.track(canvasTex(THREE, 256, 256, (g) => { g.strokeStyle = 'rgba(255,230,170,1)'; g.lineWidth = 6; g.shadowColor = 'rgba(217,184,113,1)'; g.shadowBlur = 14; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.stroke(); }));
  const bandTex = K.track(canvasTex(THREE, 512, 8, (g, w) => { const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.44, 'rgba(255,240,205,0)'); lg.addColorStop(0.5, 'rgba(255,240,205,0.85)'); lg.addColorStop(0.56, 'rgba(255,240,205,0)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, 8); }));
  bandTex.wrapS = THREE.ClampToEdgeWrapping; bandTex.center.set(0.5, 0.5); bandTex.rotation = -0.45;

  const sprite = (tex, size, order, color = 0xffffff) => {
    const m = new THREE.Mesh(K.track(new THREE.PlaneGeometry(size, size)), K.track(new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0, blending: ADD, depthTest: false, depthWrite: false })));
    m.renderOrder = order; K.group.add(m); return m;
  };
  // light band sweeping across the whole card
  const sweep = new THREE.Mesh(K.track(new THREE.PlaneGeometry(1, P.H)), K.track(new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, opacity: 0, blending: ADD, depthTest: false, depthWrite: false })));
  sweep.position.z = 0.09; sweep.renderOrder = 60; K.group.add(sweep);
  /** call each frame with the list of [start, duration] sweeps */
  function updateSweep(t, list) {
    let k = -1;
    for (const [a, d] of list) { const p = phase(t, a, d); if (p > 0 && p < 1) { k = p; break; } }
    sweep.material.opacity = k >= 0 ? Math.sin(k * Math.PI) * 0.9 : 0;
    bandTex.offset.x = k >= 0 ? 0.9 - k * 1.8 : 0;
  }
  /** a sprite that flashes once (rises and fades) around time `at` */
  function flash(m, t, at, dur, s0, s1, maxA = 1) {
    const f = phase(t, at, dur);
    m.material.opacity = f > 0 && f < 1 ? Math.sin(f * Math.PI) * maxA : 0;
    m.scale.setScalar(s0 + f * (s1 - s0));
  }
  return { ADD, glowTex, ringTex, bandTex, sprite, updateSweep, flash };
}

/** The tappable contact links pinned over the card's contact rows (rendered by ar.js). */
export function linkLabels(P, ORDER, startAt) {
  const L = contactLinks();
  const labels = ORDER.links.map((l) => {
    const c = L.find((x) => x.kind === l.id);
    return { x: P.X((14 + ORDER.iconX - 8) / 2), y: P.Y(l.y + 0.5), title: c.label, sub: c.sub, href: c.href, center: true, link: l.id };
  });
  return { labels, labelAlpha: (t) => labels.map((_, i) => phase(t, startAt + i * 0.15, 0.35)) };
}
