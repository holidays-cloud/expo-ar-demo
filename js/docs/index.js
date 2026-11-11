// The four banner documents, in the same order as inside targets/banner.mind.
// `load` is a dynamic import so a document's code is fetched only when needed.
import { TARGET_ORDER } from './targets.js';

const loaders = {
  doc1: () => import('./doc1.js'),
  doc2: () => import('./doc2.js'),
  doc3: () => import('./doc3.js'),
  doc4: () => import('./doc4.js'),
  doc5: () => import('./doc5.js'),
};
export const DOCS = TARGET_ORDER.map((id, targetIndex) => ({ id, targetIndex, load: loaders[id] }));
