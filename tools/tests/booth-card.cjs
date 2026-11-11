// Booth: 5 taps on the logo -> "card animation" plays without a camera, then 3 buttons.
//   node tools/tests/booth-card.cjs SHOTS_DIR
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SHOTS = process.argv[2];
const which = process.argv[3] || 'doc5'; // doc5 or doc6 (the "sky" variant)
const tag = which === 'doc6' ? 'bc6' : 'bc';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:8080/');
  for (let k = 0; k < 5; k++) await p.click('.logo');
  await p.locator('.booth .btn', { hasText: 'انیمیشن کارت ویزیت' }).nth(which === 'doc6' ? 1 : 0).click();
  let last = 0;
  for (const [i, ms] of [700, 1700, 2500, 3200, 3900, 4600, 5600].entries()) { await p.waitForTimeout(ms - last); last = ms; await p.screenshot({ path: `${SHOTS}/${tag}-t${i}.png` }); }
  await p.waitForSelector('.demo .card-actions', { timeout: 30000 });
  await p.screenshot({ path: `${SHOTS}/${tag}-end.png` });
  console.log('buttons:', (await p.locator('.demo .card-actions .btn').allInnerTexts()).join(' | '));
  await p.goBack(); await p.waitForTimeout(400);
  console.log('closed, back on intro:', (await p.locator('.overlay').count()) === 0 && (await p.locator('.intro').count()) === 1);
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
