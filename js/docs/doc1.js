// Document 1 module: everything the app needs to run this scan.
export { createScene, DURATION } from './doc1.scene.js';
export { renderResult, resultTitle, resultSub } from './doc1.result.js';
export const id = 'doc1';
export const target = new URL('../../targets/doc1.mind', import.meta.url).href;
export const image = new URL('../../img/doc1.jpg', import.meta.url).href;
