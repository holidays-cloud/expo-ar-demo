// Document 3 animation: rooms highlight one by one; each room's name and area appears as an
// on-screen label (normal phone text size) while it is highlighted, then the total.
// Areas are computed from the printed dimensions in doc3.data.js.
import { kit, page, phase, easeOut, ACCENT } from '../scene-kit.js';
import { toFa } from '../util.js';
import { S } from '../strings.fa.js';
import { PAGE, ROOMS, TOTAL_AREA, TITLE_BLOCK } from './doc3.data.js';

const STEP = 0.85;
const TOTAL_AT = 0.6 + ROOMS.length * STEP;
export const DURATION = TOTAL_AT + 1.0;

export async function createScene(THREE) {
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const frame = K.frame();
  const rooms = ROOMS.map((r, i) => {
    const [x, y, w, h] = r.rect;
    const inset = [x + 1.6, y + 1.6, w - 3.2, h - 3.2];
    return {
      fill: K.rectPlane(inset, { color: ACCENT, opacity: 0, z: 0.01, order: 5 }),
      ring: K.ring(inset, ACCENT, { line: 1, radius: 1.5, order: 6 }),
      start: 0.6 + i * STEP,
    };
  });
  const labels = [
    ...ROOMS.map((r) => ({ x: P.X(r.rect[0] + r.rect[2] / 2), y: P.Y(r.rect[1] + r.rect[3] / 2), title: r.name, sub: `${toFa(r.area)} ${S.units.m2}` })),
    { x: P.X(TITLE_BLOCK[0] + TITLE_BLOCK[2] / 2), y: P.Y(TITLE_BLOCK[1] + 4), title: S.doc3.totalLabel, sub: `${toFa(TOTAL_AREA)} ${S.units.m2}` },
  ];

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.5) * (1 - phase(t, DURATION, 0.8)));
    for (const r of rooms) {
      const a = easeOut(phase(t, r.start, 0.35));
      const settle = phase(t, r.start + STEP, 0.4); // bright during its turn, then calmer
      r.fill.material.opacity = a * (0.32 - 0.16 * settle);
      r.ring.material.opacity = a * (1 - 0.5 * settle);
    }
  }
  /** one room label at a time (short overlap while one fades out), then the total */
  function labelAlpha(t) {
    return [
      ...rooms.map((r) => phase(t, r.start + 0.15, 0.25) * (1 - phase(t, r.start + STEP + 0.05, 0.25))),
      phase(t, TOTAL_AT, 0.4),
    ];
  }
  update(0);
  return { group: K.group, duration: DURATION, update, labels, labelAlpha, pageH: P.H, dispose: K.dispose };
}
