// Document 5 animation (business card, variant "scattered pieces"): the brand pieces printed
// scattered on the front lift off and swoop into place. Engine: card-scene.js.
import { createCardScene, DURATION } from './card-scene.js';
import { PAGE, ORDER } from './doc5.data.js';
import { ELEMENTS, ATLAS_MM } from './doc5.layout.js';

export { DURATION };
export function createScene(THREE, opts) {
  return createCardScene(THREE, opts, {
    variant: 'pieces', PAGE, ORDER, ELEMENTS, ATLAS_MM,
    orderedUrl: new URL('../../img/doc5-ordered.jpg', import.meta.url).href,
    atlasUrl: new URL('../../img/doc5-atlas.png', import.meta.url).href,
  });
}
