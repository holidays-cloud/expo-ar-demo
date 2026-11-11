// Document 6 animation (business card, variant "out of the sky"): the front is only sky;
// every piece launches from one of the printed stars as a point of light and flies to its
// place like a comet, growing and turning. Engine: card-scene.js.
import { createCardScene, DURATION } from './card-scene.js';
import { PAGE, ORDER } from './doc6.data.js';
import { ELEMENTS, ATLAS_MM, STARS } from './doc6.layout.js';

export { DURATION };
export function createScene(THREE, opts) {
  return createCardScene(THREE, opts, {
    variant: 'sky', PAGE, ORDER, ELEMENTS, ATLAS_MM, STARS,
    orderedUrl: new URL('../../img/doc6-ordered.jpg', import.meta.url).href,
    atlasUrl: new URL('../../img/doc6-atlas.png', import.meta.url).href,
  });
}
