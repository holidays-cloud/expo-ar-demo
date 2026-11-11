// Measures overlay jitter (still feed) and lag (moving feed) for a given settings variant.
const { chromium } = require('playwright');
const [SP, feed, tuneJson, seconds = '14'] = process.argv.slice(2);
const tune = JSON.parse(tuneJson);
const W = 390, H = 844, PH = 297 / 210;
function corners(m, p) { // screen px of the 4 page corners
  const pts = [[-0.5, PH / 2], [0.5, PH / 2], [0.5, -PH / 2], [-0.5, -PH / 2]];
  return pts.map(([x, y]) => {
    const v = [x, y, 0, 1];
    const mv = [0, 1, 2, 3].map((r) => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3]);
    const c = [0, 1, 2, 3].map((r) => p[r] * mv[0] + p[4 + r] * mv[1] + p[8 + r] * mv[2] + p[12 + r] * mv[3]);
    return [(c[0] / c[3] + 1) / 2 * W, (1 - c[1] / c[3]) / 2 * H];
  });
}
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${SP}/${feed}.y4m`] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, permissions: ['camera'] });
  await ctx.addInitScript((t) => { window.__AR_TUNE = t; window.__AR_DEBUG = []; }, tune);
  const page = await ctx.newPage();
  await page.goto('http://localhost:8080/');
  await page.click('text=باز کردن دوربین');
  await page.waitForFunction(() => window.__AR_DEBUG.length > 20, null, { timeout: 60000 });
  await page.evaluate(() => { window.__AR_DEBUG.length = 0; });
  await page.waitForTimeout(Number(seconds) * 1000);
  const recs = await page.evaluate(() => window.__AR_DEBUG);
  await browser.close();
  const shown = recs.map((r) => ({ t: r.t, c: corners(r.stable, r.proj) }));
  const raw = recs.filter((r) => r.unf).map((r) => ({ t: r.t, c: corners(r.unf, r.proj) }));
  // MindAR processing rate = how often the unfiltered pose changes
  let updates = 0; for (let i = 1; i < recs.length; i++) if (recs[i].unf && recs[i - 1].unf && recs[i].unf[12] !== recs[i - 1].unf[12]) updates++;
  const dur = (recs[recs.length - 1].t - recs[0].t) / 1000;
  const jitter = (series) => { // RMS frame-to-frame corner movement (px) and std around mean (px)
    let s = 0, n = 0; for (let i = 1; i < series.length; i++) for (let k = 0; k < 4; k++) { s += (series[i].c[k][0] - series[i - 1].c[k][0]) ** 2 + (series[i].c[k][1] - series[i - 1].c[k][1]) ** 2; n++; }
    const mean = [0, 1, 2, 3].map((k) => [0, 1].map((a) => series.reduce((acc, r) => acc + r.c[k][a], 0) / series.length));
    let v = 0, m = 0; series.forEach((r) => r.c.forEach((p, k) => { v += (p[0] - mean[k][0]) ** 2 + (p[1] - mean[k][1]) ** 2; m++; }));
    return { step: Math.sqrt(s / n), spread: Math.sqrt(v / m) };
  };
  const cx = (series) => series.map((r) => ({ t: r.t, x: r.c.reduce((a, p) => a + p[0], 0) / 4 }));
  const lag = (ref, sig) => { // best time shift (ms) of sig behind ref
    const grid = []; const t0 = Math.max(ref[0].t, sig[0].t) + 600, t1 = Math.min(ref[ref.length - 1].t, sig[sig.length - 1].t) - 600;
    const at = (s, t) => { let i = s.findIndex((r) => r.t >= t); if (i <= 0) return s[Math.max(0, i)].x; const a = s[i - 1], b = s[i]; return a.x + (b.x - a.x) * (t - a.t) / (b.t - a.t || 1); };
    let best = 0, bestErr = Infinity;
    for (let d = 0; d <= 600; d += 10) { let e = 0, n = 0; for (let t = t0; t < t1; t += 20) { e += (at(sig, t) - at(ref, t - d)) ** 2; n++; } if (e / n < bestErr) { bestErr = e / n; best = d; } }
    return best;
  };
  const out = { feed, tune, mindarFps: +(updates / dur).toFixed(1), renderFps: +(recs.length / dur).toFixed(0) };
  if (feed.endsWith('still')) { out.shownJitter = jitter(shown); out.unfilteredJitter = jitter(raw); }
  else { out.lagMs = lag(cx(raw), cx(shown)); }
  console.log(JSON.stringify(out, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
})().catch((e) => { console.log('FAILED', e.message.split('\n')[0]); process.exit(1); });
