// Own-card flow, part 1: camera with a framing outline and one-tap capture.
// Nothing is uploaded. The captured card is kept only on this phone (localStorage) so the
// intro can offer to watch it again; part 2 is js/card-stars.js.
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
  out.width = 960; out.height = Math.round(960 / CARD_ASPECT);
  out.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

// ---- remembered on this phone (only here; never sent anywhere) ---------------------------------
const KEY = 'expoar.mycard.v1';
export function rememberCard(photo) {
  try { localStorage.removeItem('expoar.constellation.v1'); localStorage.setItem(KEY, photo.toDataURL('image/jpeg', 0.85)); } catch (e) { /* private mode or full */ }
}
export function hasCard() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export async function recallCard() {
  let url = null;
  try { url = localStorage.getItem(KEY); } catch (e) { return null; }
  if (!url) return null;
  const img = new Image(); img.src = url;
  try { await img.decode(); } catch (e) { return null; }
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}
