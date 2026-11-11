// Document 2 animation: parts of the site photo are outlined one by one, each with an
// on-screen label (normal phone text size, see ar.js). Two labels at most are visible at a
// time; the follow-up warning stays at the end. Wording is cautious.
import { kit, page, phase, easeOut, pulse, ACCENT, WARN } from '../scene-kit.js';
import { PAGE, SPOTS } from './doc2.data.js';

const STEP = 1.0;
const ALL_SHOWN = 0.6 + SPOTS.length * STEP;
export const DURATION = ALL_SHOWN + 0.6;

export async function createScene(THREE) {
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const frame = K.frame();
  const parts = SPOTS.map((s, i) => {
    const color = s.warn ? WARN : ACCENT;
    return {
      s,
      ring: K.ring(s.rect, color, { line: 1.1, radius: 2.5, order: 10 + i }),
      fill: K.rectPlane(s.rect, { color, opacity: 0, z: 0.012, order: 9 }),
      start: 0.6 + i * STEP,
    };
  });
  // label anchored at the top-centre of each outlined area
  const labels = SPOTS.map((s) => ({ x: P.X(s.rect[0] + s.rect[2] / 2), y: P.Y(s.rect[1] + Math.min(6, s.rect[3] / 2)), title: s.title, sub: s.sub, warn: s.warn }));

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.5) * (1 - phase(t, DURATION, 0.8)));
    for (const p of parts) {
      const a = easeOut(phase(t, p.start, 0.3));
      const beat = p.s.warn && t > ALL_SHOWN ? pulse(t, ALL_SHOWN) : 0;
      const calm = p.s.warn ? 1 : 1 - 0.45 * phase(t, p.start + 2 * STEP, 0.4); // older outlines dim
      p.ring.material.opacity = a * calm * (0.85 + 0.15 * beat);
      p.ring.scale.setScalar(1 + 0.03 * beat);
      p.fill.material.opacity = a * (p.s.warn ? 0.1 + 0.12 * beat : 0.08 * calm);
    }
  }
  /** each label shows for two steps (so at most two at once); the warning stays */
  function labelAlpha(t) {
    return parts.map((p) => {
      const on = phase(t, p.start + 0.25, 0.3);
      if (p.s.warn) return on;
      return on * (1 - phase(t, p.start + 2 * STEP, 0.3));
    });
  }
  update(0);
  return { group: K.group, duration: DURATION, update, labels, labelAlpha, pageH: P.H, dispose: K.dispose };
}
