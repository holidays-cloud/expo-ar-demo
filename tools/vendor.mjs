// Copies the runtime libraries and fonts from node_modules into /vendor and /fonts
// so the site never loads anything from a CDN. Run: npm run vendor
//
// MindAR's three.js bundle imports the bare specifier "three". Instead of relying on an
// import map (missing on iOS < 16.4), we rewrite those imports to relative paths here.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(root, 'node_modules', p);
const out = (p) => { const f = join(root, p); mkdirSync(dirname(f), { recursive: true }); return f; };

// three.js r160 (MindAR 1.2.5 still imports sRGBEncoding, removed in r162)
copyFileSync(nm('three/build/three.module.min.js'), out('vendor/three/three.module.min.js'));
copyFileSync(nm('three/LICENSE'), out('vendor/three/LICENSE'));
const css3d = readFileSync(nm('three/examples/jsm/renderers/CSS3DRenderer.js'), 'utf8')
  .replace(/from\s*'three'/g, "from '../../three.module.min.js'");
writeFileSync(out('vendor/three/addons/renderers/CSS3DRenderer.js'), css3d);

// MindAR image tracking (three.js flavour) and its chunks.
// TRACKING_KEYFRAME: MindAR follows the page on a reduced copy of the target:
//   1 = 128 px wide (MindAR default), 0 = 256 px wide (finer: less jitter, a little more GPU work).
// Chosen by measurement, see CLAUDE.md "Steadiness".
const TRACKING_KEYFRAME = Number(process.env.TRACKING_KEYFRAME ?? 0);
const mindFiles = ['mindar-image-three.prod.js', 'controller-mGt1s8dJ.js', 'ui-fBadYuor.js'];
for (const f of mindFiles) {
  let src = readFileSync(nm('mind-ar/dist/' + f), 'utf8');
  src = src
    .replace(/from\s*"three\/addons\/renderers\/CSS3DRenderer\.js"/g, 'from "../three/addons/renderers/CSS3DRenderer.js"')
    .replace(/from\s*"three"/g, 'from "../three/three.module.min.js"');
  if (/from\s*"three/.test(src)) throw new Error('Unpatched three import left in ' + f);
  if (f.startsWith('controller')) {
    const before = src;
    src = src.replace(/U5 = 0\.8, Y5 = \d,/, `U5 = 0.8, Y5 = ${TRACKING_KEYFRAME},`);
    if (src === before && TRACKING_KEYFRAME !== 1) throw new Error('Could not set the tracking keyframe (MindAR build changed?)');
  }
  writeFileSync(out('vendor/mindar/' + f), src);
}
copyFileSync(nm('mind-ar/LICENSE'), out('vendor/mindar/LICENSE'));

// Fonts (both SIL OFL)
copyFileSync(nm('vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2'), out('fonts/Vazirmatn-wght.woff2'));
copyFileSync(nm('vazirmatn/OFL.txt'), out('fonts/Vazirmatn-OFL.txt'));
copyFileSync(nm('@fontsource/aref-ruqaa/files/aref-ruqaa-arabic-400-normal.woff2'), out('fonts/ArefRuqaa-Regular.woff2'));
copyFileSync(nm('@fontsource/aref-ruqaa/files/aref-ruqaa-arabic-700-normal.woff2'), out('fonts/ArefRuqaa-Bold.woff2'));
copyFileSync(nm('@fontsource/aref-ruqaa/LICENSE'), out('fonts/ArefRuqaa-LICENSE.txt'));

console.log('Vendored three r160, MindAR 1.2.5, Vazirmatn, Aref Ruqaa.');
