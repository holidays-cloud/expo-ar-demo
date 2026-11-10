// Compiles all banner documents into ONE MindAR target file (targets/banner.mind), so a
// single camera screen recognises whichever document the phone sees.
// Order matters: target index i = DOC_ORDER[i] (the app reads the same list).
// Run after `npm run print`:   npm run targets
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createStaticHandler } from './serve.mjs';
import { TARGET_ORDER } from '../js/docs/targets.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const server = createServer(createStaticHandler(root, { allowTools: true }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync(join(root, 'targets'), { recursive: true });
mkdirSync(join(root, 'tools', 'build'), { recursive: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`${base}/tools/compile.html`);
  await page.waitForFunction(() => window.ready);
  const t0 = Date.now();
  // Compile from 900 px wide copies: smaller file, tracking stays reliable.
  const srcs = TARGET_ORDER.map((doc) => {
    execFileSync('convert', [join(root, 'img', `${doc}.jpg`), '-resize', '900x', '-quality', '90', join(root, 'tools', 'build', `${doc}-target.jpg`)]);
    return `/tools/build/${doc}-target.jpg`;
  });
  const b64 = await page.evaluate((list) => window.compile(list), srcs);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(root, 'targets', 'banner.mind'), buf);
  // Drop matching levels a phone camera frame can never use (see prune-target.mjs).
  execFileSync('node', [join(root, 'tools', 'prune-target.mjs'), join(root, 'targets', 'banner.mind'), '720'], { stdio: 'inherit' });
  console.log(`targets/banner.mind: ${TARGET_ORDER.join(', ')} (${(buf.length / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} finally {
  await browser.close();
  server.close();
}
