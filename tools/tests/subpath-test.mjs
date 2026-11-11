// Simulates GitHub Pages: site only exists under /expo-ar-demo/. Anything else = 404 and is reported.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createStaticHandler } from '/home/user/expo-ar/tools/serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = process.argv[2];
const PREFIX = '/expo-ar-demo';
const handler = createStaticHandler('/home/user/expo-ar');
const outside = [];
const srv = createServer((req, res) => {
  if (req.url === PREFIX) { res.writeHead(301, { Location: PREFIX + '/' }); return res.end(); }
  if (!req.url.startsWith(PREFIX + '/')) { outside.push(req.url); res.writeHead(404); return res.end(); }
  req.url = req.url.slice(PREFIX.length); handler(req, res);
});
await new Promise((r) => srv.listen(8097, r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${SP}/doc3-still.y4m`] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['camera'] });
const page = await ctx.newPage();
const loaded = []; const failed = []; const errors = [];
page.on('response', (r) => { const u = r.url().replace('http://localhost:8097', ''); (r.status() < 400 ? loaded : failed).push(`${r.status()} ${u}`); });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:8097/expo-ar-demo/');
const digits = new Set();
const scanDigits = async (w) => { const t = await page.evaluate(() => document.body.innerText); (t.match(/[0-9]+/g) || []).forEach((d) => digits.add(d + ' (' + w + ')')); };
await scanDigits('intro');
await page.click('text=باز کردن دوربین');
await page.waitForSelector('text=دیدن نتیجه', { timeout: 60000 });
console.log('AR animation finished: yes');
await page.click('text=دیدن نتیجه'); await page.waitForSelector('.paper');
console.log('result card shown: yes');
await scanDigits('result');
await page.goBack(); await page.waitForTimeout(300);
for (const i of [0, 1, 3]) { for (let k = 0; k < 5; k++) await page.click('.logo'); await page.waitForSelector('.booth'); await page.locator('.booth .btn.wide:not(.ghost)').nth(i).click(); await page.waitForSelector('.paper'); await scanDigits('sample ' + i); await page.goBack(); await page.waitForTimeout(300); }
console.log('Latin digits on screens:', digits.size ? [...digits] : 'none');
const fontsOk = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
console.log('fonts loaded:', fontsOk.join(', '));
const want = ['/index.html', 'fonts/Vazirmatn-wght.woff2', 'targets/banner.mind', 'vendor/mindar/mindar-image-three.prod.js', 'vendor/three/three.module.min.js', 'js/ar.js', 'js/docs/doc3.scene.js', 'js/docs/doc5.scene.js', 'js/owncard.js'];
for (const w of want) console.log((loaded.some((l) => l.includes(w) || (w === '/index.html' && l.endsWith('/expo-ar-demo/'))) ? 'OK   ' : 'MISSING ') + w);
console.log('requests outside the sub-address:', outside.length ? outside : 'none');
console.log('failed requests:', failed.length ? failed : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close(); srv.close();
