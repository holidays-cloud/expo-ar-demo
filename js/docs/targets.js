// Order of documents inside targets/banner.mind (target index = position in this list).
// Used by tools/compile-targets.mjs and by the app. Change it only together with
// re-running `npm run targets`.
export const TARGET_ORDER = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc6'];
export const TARGET_FILE = new URL('../../targets/banner.mind', import.meta.url).href;
