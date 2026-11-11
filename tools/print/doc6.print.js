// Document 6: business card, variant "out of the sky": the front is only a night sky, and
// everything (logo, name, tagline, icons) forms out of its stars in the animation.
// Same pieces, ordered layout and back (QR only) as doc5; see doc5.print.js.
import { buildCard } from './doc5.print.js';
export const build = (svg, opts = {}) => buildCard(svg, { ...opts, variant: 'sky' });
