// Business card + own-card flow, end to end with a fake camera feed of the business card.
//   node tools/tests/owncard.cjs FEEDS [width height]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [FEEDS, w = '390', hgt = '844'] = process.argv.slice(2);
const SHOTS = FEEDS + '/oc-' + w + 'x' + hgt;
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${FEEDS}/doc5-still.y4m`] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +hgt }, isMobile: true, hasTouch: true, permissions: ['camera'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const log = (...a) => console.log(...a);
  await page.goto('http://localhost:8080/');
  // business card scan
  await page.click('text=باز کردن دوربین');
  const t0 = Date.now();
  // frames through the card animation (from the moment the card is found)
  await page.waitForFunction(() => { const h = document.querySelector('.hint'); return h && h.hidden; }, null, { timeout: 90000 });
  for (const [i, ms] of [400, 1400, 2400, 3200, 4100, 5000, 6200].entries()) { await page.waitForTimeout(i ? ms - [400, 1400, 2400, 3200, 4100, 5000, 6200][i - 1] : ms); await page.screenshot({ path: `${SHOTS}-0-cardanim-${i}.png` }); }
  await page.waitForSelector('.card-actions', { timeout: 90000 });
  await page.waitForTimeout(1200);
  const pins = await page.$$eval('.ar-link', (els) => els.map((e) => `${e.querySelector('.t').textContent} -> ${e.getAttribute('href')} (visible ${getComputedStyle(e).opacity > 0.5})`));
  console.log('links pinned on the card:', pins.join(' | '));
  log('card animation done after', ((Date.now() - t0) / 1000).toFixed(1), 's; buttons:', (await page.locator('.card-actions .btn').allInnerTexts()).join(' | '));
  await page.screenshot({ path: SHOTS + '-1-card-done.png' });
  // vCard
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('text=ذخیرهٔ مخاطب');
  const d = await dl;
  if (d) { const p = await d.path(); const txt = require('fs').readFileSync(p, 'utf8'); log('vCard downloaded:', d.suggestedFilename(), txt.split('\r\n').filter((l) => /^(FN|TEL|URL)/.test(l)).join(' ; ')); } else log('vCard: no download event');
  // own card from the card's third button
  await page.click('text=کارت خودتان را هم امتحان کنید');
  await page.waitForSelector('.shutter:not([disabled])', { timeout: 30000 });
  await page.screenshot({ path: SHOTS + '-2-capture.png' });
  await page.click('.shutter');
  const shots = [700, 1800, 3600, 5600];
  let last = 0;
  for (const [i, ms] of shots.entries()) { await page.waitForTimeout(ms - last); last = ms; await page.screenshot({ path: `${SHOTS}-3-anim-${i}.png` }); }
  await page.waitForSelector('text=ذخیرهٔ تصویر', { timeout: 30000 });
  await page.screenshot({ path: SHOTS + '-4-final.png' });
  const link = await page.locator('.link-box').inputValue();
  log('personal link:', link);
  const dl2 = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await page.click('text=ذخیرهٔ تصویر');
  const d2 = await dl2;
  if (d2) { const p = await d2.path(); require('fs').copyFileSync(p, SHOTS + '-poster.png'); log('poster downloaded:', d2.suggestedFilename()); } else log('poster: no download event');
  log('remembered on phone:', await page.evaluate(() => localStorage.getItem('expoar.constellation.v1')));
  // reopen the site: intro offers «صورت فلکی شما»
  await page.goto('http://localhost:8080/');
  log('intro shows «صورت فلکی شما»:', await page.locator('text=صورت فلکی شما').count() > 0);
  // replay link
  await page.goto(link);
  await page.waitForSelector('text=ذخیرهٔ تصویر', { timeout: 30000 });
  await page.screenshot({ path: SHOTS + '-5-replay.png' });
  log('replay from link: done');
  // direct own-card link
  await page.goto('http://localhost:8080/?mode=card');
  await page.waitForSelector('.shutter:not([disabled])', { timeout: 30000 });
  log('?mode=card opens the capture screen: yes');
  log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch((e) => { console.log('FAILED', e.message.split('\n')[0]); process.exit(1); });
