import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createStaticHandler } from '/home/user/expo-ar/tools/serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const srv = createServer(createStaticHandler('/home/user/expo-ar', { allowTools: true }));
await new Promise((r) => srv.listen(8099, r));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto('http://localhost:8099/tools/tests/confusion.html');
await p.waitForFunction(() => window.ready);
const srcs = [];
for (const d of ['doc1', 'doc2', 'doc3', 'doc4', 'doc5']) for (const pose of ['front', 'tilt', 'far']) srcs.push(`/tools/build/cam-${d}-${pose}.jpg`);
const rows = await p.evaluate((s) => window.run(s), srcs);
console.log('photo                matches target:  doc1  doc2  doc3  doc4  doc5');
let bad = 0, miss = 0;
for (const r of rows) {
  const name = r.src.split('cam-')[1].replace('.jpg', '');
  const own = Number(name[3]) - 1;
  r.per.forEach((m, t) => { if (m && t !== own) bad++; if (!m && t === own) miss++; });
  console.log(name.padEnd(36), r.per.map((m) => (m ? ' YES ' : '  -  ')).join(' '));
}
console.log(`wrong-document matches: ${bad}   own document missed: ${miss}`);
await b.close(); srv.close();
