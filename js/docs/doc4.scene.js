// Document 4 animation: each invoice line connects to the matching line on the delivery
// slip; matching lines are ticked, the one mismatch is flagged and pulses.
import { kit, page, fontsReady, paintLabel, phase, easeOut, pulse, OK, WARN, roundRect } from '../scene-kit.js';
import { S } from '../strings.fa.js';
import { PAGE, ITEMS, MISMATCH, RESULT, invoiceRowRect, slipRowRect } from './doc4.data.js';

const STEP = 0.6;
const FLAG_AT = 0.6 + ITEMS.length * STEP;
export const DURATION = FLAG_AT + 0.8;

function paintTick(ctx, w, h) {
  ctx.fillStyle = OK; roundRect(ctx, 0.3, 0.3, w - 0.6, h - 0.6, (h - 0.6) / 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.52); ctx.lineTo(w * 0.44, h * 0.68); ctx.lineTo(w * 0.73, h * 0.34); ctx.stroke();
}

export async function createScene(THREE, { renderer }) {
  await fontsReady();
  const P = page(PAGE.w, PAGE.h);
  const K = kit(THREE, P);
  const frame = K.frame();

  const pairs = ITEMS.map((it, i) => {
    const bad = it.id === MISMATCH;
    const color = bad ? WARN : OK;
    const a = invoiceRowRect(it.id), b = slipRowRect(it.id);
    const ra = K.ring(a, color, { line: 0.6, radius: 1, order: 8 });
    const rb = K.ring(b, color, { line: 0.6, radius: 1, order: 8 });
    const fa = K.rectPlane(a, { color, opacity: 0, z: 0.01, order: 7 });
    const fb = K.rectPlane(b, { color, opacity: 0, z: 0.01, order: 7 });
    // connector along the left margin, fanning out a little per line
    const link = K.ribbon([a[0] + 1, a[1] + a[3] / 2], [b[0] + 1, b[1] + b[3] / 2], { width: 0.8, color, bend: -(0.1 + i * 0.025), z: 0.03, order: 12 });
    const tick = bad ? null : K.card(b[0] + 10, b[1] + b[3] / 2, 9, 9, paintTick, { renderer, z: 0.04, order: 25 + i, px: 14 });
    return { bad, ra, rb, fa, fb, link, tick, start: 0.6 + i * STEP };
  });
  const bad = slipRowRect(MISMATCH);
  const callout = K.card(bad[0] + 48, bad[1] - 12, 92, 22, (ctx, W, H) => paintLabel(ctx, W, H, {
    title: `${S.doc4.diffLabel}: ${RESULT.diff}`, sub: `${S.doc4.invoice} ${RESULT.invoice} · ${S.doc4.slip} ${RESULT.received}`, warn: true,
  }), { renderer, z: 0.06, order: 40 });

  function update(t) {
    frame.set(0.9 * phase(t, 0, 0.5) * (1 - phase(t, DURATION, 0.8)));
    for (const p of pairs) {
      const r = easeOut(phase(t, p.start, 0.3));
      const beat = p.bad && t > FLAG_AT ? pulse(t, FLAG_AT) : 0;
      p.ra.material.opacity = p.rb.material.opacity = r * (0.8 + 0.2 * beat);
      p.fa.material.opacity = p.fb.material.opacity = r * (p.bad ? 0.12 + 0.16 * beat : 0.08);
      p.link.setProgress(phase(t, p.start + 0.1, 0.4));
      if (p.tick) { const k = easeOut(phase(t, p.start + 0.45, 0.25)); p.tick.material.opacity = k; p.tick.scale.setScalar(0.6 + 0.4 * k); }
    }
    const c = easeOut(phase(t, FLAG_AT, 0.4));
    callout.material.opacity = c;
    callout.scale.setScalar(0.88 + 0.12 * c);
  }
  update(0);
  return { group: K.group, duration: DURATION, update, dispose: K.dispose };
}
