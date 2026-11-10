// Document 3 animation: rooms highlight one by one with their areas, then the total.
// Areas are computed from the printed dimensions in doc3.data.js.
import { kit, page, fontsReady, paintLabel, phase, easeOut, ACCENT } from '../scene-kit.js';
import { toFa } from '../util.js';
import { S } from '../strings.fa.js';
import { PAGE, ROOMS, TOTAL_AREA } from './doc3.data.js';

const STEP = 0.55;
const TOTAL_AT = 0.6 + ROOMS.length * STEP;
export const DURATION = TOTAL_AT + 0.8;

export async function createScene(THREE, { renderer }) {
  await fontsReady();
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const frame = K.frame();

  const rooms = ROOMS.map((r, i) => {
    const [x, y, w, h] = r.rect;
    const inset = [x + 1.6, y + 1.6, w - 3.2, h - 3.2];
    const fill = K.rectPlane(inset, { color: ACCENT, opacity: 0, z: 0.01, order: 5 });
    const ring = K.ring(inset, ACCENT, { line: 0.9, radius: 1.5, order: 6 });
    const small = h < 25;
    const cw = Math.min(w - 6, small ? 72 : 60), ch = small ? 13 : Math.min(h - 8, 22);
    const card = K.card(x + w / 2, y + h / 2, cw, ch, (ctx, W, H) => paintLabel(ctx, W, H, small
      ? { title: `${r.name} · ${toFa(r.area)} ${S.units.m2}` }
      : { title: r.name, sub: `${toFa(r.area)} ${S.units.m2}` }), { renderer, z: 0.04, order: 20 + i });
    return { fill, ring, card, start: 0.6 + i * STEP };
  });
  const total = K.card(105, 223, 100, 22, (ctx, W, H) => paintLabel(ctx, W, H, { title: S.doc3.totalLabel, sub: `${toFa(TOTAL_AREA)} ${S.units.m2}` }), { renderer, z: 0.05, order: 40 });

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.5) * (1 - phase(t, DURATION, 0.8)));
    for (const r of rooms) {
      const a = easeOut(phase(t, r.start, 0.35));
      const settle = phase(t, r.start + 0.5, 0.4); // bright while it is "its turn", then calmer
      r.fill.material.opacity = a * (0.3 - 0.14 * settle);
      r.ring.material.opacity = a * (1 - 0.5 * settle);
      r.card.material.opacity = easeOut(phase(t, r.start + 0.15, 0.35));
      r.card.scale.setScalar(0.88 + 0.12 * r.card.material.opacity);
      r.fill.position.z = 0.01 + 0.006 * a;
    }
    const c = easeOut(phase(t, TOTAL_AT, 0.45));
    total.material.opacity = c;
    total.scale.setScalar(0.88 + 0.12 * c);
  }
  update(0);
  return { group: K.group, duration: DURATION, update, dispose: K.dispose };
}
