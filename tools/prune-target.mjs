// Drops matching levels wider than MAX_W from a compiled .mind file.
// Phone camera frames given to MindAR are usually 640x480, so a document never appears
// wider than that in the frame; levels above it are only download weight.
// Tracking data is untouched.   node tools/prune-target.mjs targets/banner.mind [maxWidth]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { decode, encode } = require('@msgpack/msgpack');
const file = process.argv[2] || 'targets/banner.mind';
const MAX_W = Number(process.argv[3] || 720);
const before = readFileSync(file);
const data = decode(before);
for (const t of data.dataList) t.matchingData = t.matchingData.filter((k) => k.width <= MAX_W);
const after = encode(data);
writeFileSync(file, after);
console.log(`${file}: ${(before.length / 1024).toFixed(0)} KB -> ${(after.length / 1024).toFixed(0)} KB (matching levels <= ${MAX_W} px kept)`);
