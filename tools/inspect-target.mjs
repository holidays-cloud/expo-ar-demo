// Prints how many feature points a compiled MindAR target has at each scale.
// Tracking (frame-to-frame) uses the 256 px keyframe (we patch MindAR, see vendor.mjs), so that number matters most:
// very low counts mean the overlay will be shaky or keep getting lost.
//   node tools/inspect-target.mjs targets/doc1.mind
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { decode } = require('@msgpack/msgpack');
const file = process.argv[2] || 'targets/banner.mind';
const data = decode(readFileSync(file));
for (const [i, t] of data.dataList.entries()) {
  console.log(`target ${i}: ${t.targetImage.width}x${t.targetImage.height}`);
  t.trackingData.forEach((k, j) => console.log(`  tracking keyframe ${j}: ${k.width}x${k.height}  points=${k.points.length}${j === 0 ? '   <- used for tracking (256 px, see tools/vendor.mjs)' : ''}`));
  t.matchingData.forEach((k, j) => console.log(`  matching level ${j}: ${k.width}x${k.height}  maxima=${k.maximaPoints.length} minima=${k.minimaPoints.length}`));
}
