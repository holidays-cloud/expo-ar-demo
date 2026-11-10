// The five banner documents. `load` is a dynamic import so nothing heavy is
// downloaded until the visitor taps a tile.
export const DOCS = [
  { id: 'doc1', load: () => import('./doc1.js') },
  { id: 'doc2', load: null }, // step 3
  { id: 'doc3', load: null }, // step 3
  { id: 'doc4', load: null }, // step 3
  { id: 'doc5', load: null }, // step 3
];
