// Document 2 animation: labels appear one by one over parts of the workspace photo.
// Wording is cautious ("appears to", "about"): nothing is measured, it is a demonstration.
import { kit, page, fontsReady, paintLabel, phase, easeOut, pulse, ACCENT, WARN } from '../scene-kit.js';
import { PAGE, SPOTS } from './doc2.data.js';

const STEP = 0.75;
export const DURATION = 0.6 + SPOTS.length * STEP + 0.4;

export async function createScene(THREE, { renderer }) {
  await fontsReady();
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const frame = K.frame();

  const parts = SPOTS.map((s, i) => {
    const color = s.warn ? WARN : ACCENT;
    const [x, y, w, h] = s.rect;
    const ring = K.ring(s.rect, color, { line: 0.9, radius: 2.5, order: 10 + i });
    const fill = K.rectPlane(s.rect, { color, opacity: 0, z: 0.012, order: 9 });
    const [lx, ly] = s.label;
    // leader from the nearest edge of the spot to the card
    const from = [Math.max(x, Math.min(x + w, lx)), ly < y ? y : ly > y + h ? y + h : y + h / 2];
    const leader = K.ribbon(from, [lx, ly], { width: 0.7, color, bend: 0.08, z: 0.03, order: 14 });
    const card = K.card(lx, ly, 84, 22, (ctx, cw, ch) => paintLabel(ctx, cw, ch, { title: s.title, sub: s.sub, warn: s.warn }), { renderer, z: 0.05, order: 30 + i });
    return { s, ring, fill, leader, card, start: 0.6 + i * STEP };
  });

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.5) * (1 - phase(t, DURATION, 0.8)));
    const allShown = 0.6 + SPOTS.length * STEP;
    for (const p of parts) {
      const a = easeOut(phase(t, p.start, 0.3));
      const l = phase(t, p.start + 0.15, 0.3);
      const c = easeOut(phase(t, p.start + 0.3, 0.35));
      const beat = p.s.warn && t > allShown ? pulse(t, allShown) : 0;
      p.ring.material.opacity = a * (0.85 + 0.15 * beat);
      p.ring.scale.setScalar(1 + 0.03 * beat);
      p.fill.material.opacity = a * (p.s.warn ? 0.1 + 0.12 * beat : 0.08);
      p.leader.setProgress(l);
      p.card.material.opacity = c;
      p.card.scale.setScalar(0.88 + 0.12 * c);
    }
  }
  update(0);
  return { group: K.group, duration: DURATION, update, dispose: K.dispose };
}
