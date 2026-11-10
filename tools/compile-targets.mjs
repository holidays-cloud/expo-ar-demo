// Compiles each document image into a MindAR target file (targets/<doc>.mind)
// using MindAR's own compiler inside headless Chromium. Run after `npm run print`.
//   npm run targets            (all documents)
//   node tools/compile-targets.mjs doc1
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createStaticHandler } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = process.argv.slice(2).length ? process.argv.slice(2) : ['doc1'];

const server = createServer(createStaticHandler(root, { allowTools: true }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync(join(root, 'targets'), { recursive: true });
try {
  const page = await browser.newPage();
  page.on('console', (m) => console.log('[compiler]', m.text()));
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`${base}/tools/compile.html`);
  await page.waitForFunction(() => window.ready);
  for (const doc of docs) {
    const t0 = Date.now();
    // Compile from a 900 px wide copy: smaller .mind file, tracking stays reliable.
    mkdirSync(join(root, 'tools', 'build'), { recursive: true });
    execFileSync('convert', [join(root, 'img', `${doc}.jpg`), '-resize', '900x', '-quality', '90', join(root, 'tools', 'build', `${doc}-target.jpg`)]);
    const b64 = await page.evaluate((src) => window.compile(src), `/tools/build/${doc}-target.jpg`);
    const buf = Buffer.from(b64, 'base64');
    writeFileSync(join(root, 'targets', `${doc}.mind`), buf);
    console.log(`${doc}: targets/${doc}.mind (${(buf.length / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  await browser.close();
  server.close();
}
