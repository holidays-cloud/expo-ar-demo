// Small helpers shared by the own-card animation (js/card-stars.js).
const FONT = 'Vazirmatn, Tahoma, sans-serif';
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function cleanUp(photo) {
  const W = photo.width, H = photo.height;
  const c = canvas(W, H), g = c.getContext('2d');
  g.drawImage(photo, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data, n = W * H;
  const lo = [], hi = [];
  for (let ch = 0; ch < 3; ch++) {
    const hist = new Uint32Array(256);
    for (let i = ch; i < d.length; i += 16) hist[d[i]]++;
    const tot = Math.ceil(n / 4);
    let acc = 0, a = 0, b = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > tot * 0.005) { a = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > tot * 0.005) { b = v; break; } }
    if (b - a < 255 / 2.4) { const m = (a + b) / 2; a = m - 255 / 4.8; b = m + 255 / 4.8; }
    lo.push(a); hi.push(b);
  }
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - lo[0]) * 255 / (hi[0] - lo[0]), gg = (d[i + 1] - lo[1]) * 255 / (hi[1] - lo[1]), b = (d[i + 2] - lo[2]) * 255 / (hi[2] - lo[2]);
    const l = 0.3 * r + 0.59 * gg + 0.11 * b;
    r = l + (r - l) * 1.12; gg = l + (gg - l) * 1.12; b = l + (b - l) * 1.12;
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; // Uint8Clamped clamps
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Finds the card's pieces and builds the plate. Returns { clean, plate, pieces, bg }. */
const LOGO = [[-12, 7, 3.1], [0, -8, 3.6], [12, 3, 3.1]];
export function drawBrand(g, x, y, k, brand, tagline, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.strokeStyle = '#d9b871'; g.lineWidth = 1.5 * k; g.beginPath(); LOGO.forEach(([px, py], i) => (i ? g.lineTo(x + px * k, y + py * k) : g.moveTo(x + px * k, y + py * k))); g.stroke();
  g.fillStyle = '#d9b871'; LOGO.forEach(([px, py, r]) => { g.beginPath(); g.arc(x + px * k, y + py * k, r * k, 0, Math.PI * 2); g.fill(); });
  g.textAlign = 'center'; g.direction = 'rtl';
  g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(8 * k)}px ${FONT}`; g.fillText(brand, x, y + 24 * k);
  g.fillStyle = '#d9b871'; g.font = `700 ${Math.round(6.4 * k)}px ${FONT}`; g.fillText(tagline, x, y + 35 * k);
  g.restore();
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
