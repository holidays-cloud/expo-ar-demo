const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); // no camera permission
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const latin = new Set();
  const scan = async (where) => { const t = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ') + ' ' + document.title); (t.match(/[A-Za-z]{2,}/g) || []).forEach((w) => latin.add(`${w} (${where})`)); };
  await page.goto('http://localhost:8080/');
  await scan('intro');
  // booth gesture
  for (let i = 0; i < 5; i++) await page.click('.logo');
  await page.waitForSelector('.booth');
  await scan('booth');
  const boothButtons = await page.locator('.booth .btn.wide:not(.ghost)').count();
  for (const [i, name] of ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'].entries()) {
    if (i > 0) { for (let k = 0; k < 5; k++) await page.click('.logo'); await page.waitForSelector('.booth'); }
    await page.locator('.booth .btn.wide:not(.ghost)').nth(i).click();
    await page.waitForSelector('.paper');
    await scan('result ' + name);
    // documents 1-4 carry the "prepared in advance" note; our business card shows its contact buttons instead
    const note = name === 'doc5' ? ((await page.locator('.contact-actions .btn').count()) === 3 ? 'نمایش (contact card, 3 buttons)' : 'missing buttons') : await page.locator('.prepared').textContent();
    if (name === 'doc5') await page.screenshot({ path: SP + '/m-booth-doc5.png' });
    else await page.waitForSelector('text=کارت خودتان را هم امتحان کنید');
    await page.goBack(); await page.waitForTimeout(300);
    console.log(`booth sample ${name}: shown, note present=${note.includes('نمایش')}, closed=${(await page.locator('.overlay').count()) === 0}`);
  }
  console.log('booth menu buttons:', boothButtons, '| still on intro:', await page.locator('.intro').count() === 1);
  // camera denied
  await page.click('text=باز کردن دوربین');
  await page.waitForSelector('.help', { timeout: 30000 });
  await scan('camera help');
  await page.screenshot({ path: SP + '/m-help.png' });
  console.log('camera help screen:', await page.locator('.help h2').textContent(), '| staff line:', await page.locator('.staff').count() === 1);
  console.log('Latin words on visitor screens:', latin.size ? [...latin].join(', ') : 'none');
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})();
