// Own-card flow, part 1: camera with a framing outline, one-tap capture, and the choice of
// a constellation. Nothing is uploaded: the photo stays in memory on the phone and is
// dropped when the screen closes.
//
// Choice (deterministic, same card -> same constellation):
//   - measure the card photo's dominant hue (only clearly coloured pixels count) and its
//     average brightness;
//   - mostly white/grey/black cards (few coloured pixels) -> one of 3 "neutral"
//     constellations by brightness;
//   - coloured cards -> 6 hue families x 2 brightness levels = 12 constellations.
// Coarse buckets keep the result stable when the same card is photographed again under
// similar light.
import { CONSTELLATIONS } from './constellations.js';

export const CARD_ASPECT = 85 / 55; // standard business card, landscape

/** Opens the rear camera into `video`. Throws Error with .code like ar.js does. */
export async function openCamera(video) {
  const fail = (code, cause) => Object.assign(new Error(code), { code, cause });
  if (!window.isSecureContext) throw fail('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw fail('unsupported');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw fail('denied', e);
    if (e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError' || e.name === 'NotReadableError')) throw fail('unsupported', e);
    throw fail('failed', e);
  }
  video.setAttribute('playsinline', ''); video.muted = true; video.srcObject = stream;
  await video.play().catch(() => {});
  if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }));
  return () => stream.getTracks().forEach((t) => t.stop());
}

/**
 * Copies what is inside the on-screen frame into a canvas.
 * `frameRect` is the frame's DOMRect; the video is shown with object-fit: cover.
 */
export function captureFrame(video, frameRect) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const box = video.getBoundingClientRect();
  const scale = Math.max(box.width / vw, box.height / vh); // object-fit: cover
  const offX = (box.width - vw * scale) / 2, offY = (box.height - vh * scale) / 2;
  const sx = (frameRect.left - box.left - offX) / scale, sy = (frameRect.top - box.top - offY) / scale;
  const sw = frameRect.width / scale, sh = frameRect.height / scale;
  const out = document.createElement('canvas');
  out.width = 480; out.height = Math.round(480 / CARD_ASPECT);
  out.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

/** Dominant hue (degrees, or -1 for a neutral card) and average brightness (0..1). */
export function measureCard(canvas) {
  const w = 64, h = Math.round(64 / CARD_ASPECT);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const hist = new Float32Array(12);
  let lum = 0, coloured = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx === 0 ? 0 : (mx - mn) / mx;
    if (s > 0.28 && mx > 0.18) {
      let hh;
      if (mx === r) hh = ((g - b) / (mx - mn)) % 6; else if (mx === g) hh = (b - r) / (mx - mn) + 2; else hh = (r - g) / (mx - mn) + 4;
      hh = (hh * 60 + 360) % 360;
      hist[Math.floor(hh / 30) % 12] += s;
      coloured++;
    }
  }
  const n = d.length / 4;
  lum /= n;
  if (coloured / n < 0.10) return { hue: -1, lum };
  let bi = 0, bv = -1;
  for (let i = 0; i < 12; i++) { const v = hist[i] + 0.5 * (hist[(i + 11) % 12] + hist[(i + 1) % 12]); if (v > bv) { bv = v; bi = i; } }
  return { hue: bi * 30 + 15, lum };
}

/** Constellation index (0..14) from the measurements. */
export function pickConstellation({ hue, lum }) {
  if (hue < 0) return 12 + (lum < 0.45 ? 0 : lum < 0.7 ? 1 : 2);   // neutral cards: 12, 13, 14
  const family = Math.floor(((hue + 30) % 360) / 60);               // 0 red, 1 yellow, 2 green, 3 cyan, 4 blue, 5 magenta
  return family * 2 + (lum < 0.55 ? 0 : 1);                         // 0..11
}

// ---- the personal link: everything needed to replay is inside the link -------------------
// ?c=a.<index>.<hue>.<lum>   (base 36; hue -1 -> "n"; lum in hundredths)
export function encodeCode({ index, hue, lum }) {
  return ['a', index.toString(36), hue < 0 ? 'n' : Math.round(hue).toString(36), Math.round(lum * 100).toString(36)].join('.');
}
export function decodeCode(code) {
  const m = /^a\.([0-9a-z]{1,2})\.(n|[0-9a-z]{1,2})\.([0-9a-z]{1,2})$/.exec(String(code || '').trim());
  if (!m) return null;
  const index = parseInt(m[1], 36), hue = m[2] === 'n' ? -1 : parseInt(m[2], 36), lum = parseInt(m[3], 36) / 100;
  if (!(index >= 0 && index < CONSTELLATIONS.length) || (hue !== -1 && !(hue >= 0 && hue < 360)) || !(lum >= 0 && lum <= 1)) return null;
  return { index, hue, lum };
}

// ---- remembered on this phone ---------------------------------------------------------------
const KEY = 'expoar.constellation.v1';
export function rememberCode(code) { try { localStorage.setItem(KEY, code); } catch (e) { /* private mode */ } }
export function recallCode() { try { const c = localStorage.getItem(KEY); return decodeCode(c) ? c : null; } catch (e) { return null; } }
