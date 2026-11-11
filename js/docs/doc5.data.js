// Document 5: our business card (a leave-behind, scanned later at home).
// A6 portrait, 105 x 148 mm. FRONT = scattered night sky (the AR target), BACK = QR only.
// ORDER describes where every piece sits once the card "makes sense" (mm, from top-left).
// Brand name, tagline and contact details come from js/config.js.
// Changing anything here or in those config values requires:
//   npm run print:card && npm run targets   (and reprinting the card)
export const PAGE = { w: 105, h: 148 };

export const ORDER = {
  // brand mark: three points joined by two lines (unit coordinates, scaled by k)
  logo: { x: 52.5, y: 33, k: 1.3, pts: [[-12, 7, 3.0], [0, -8, 3.5], [12, 3, 3.0]] },
  // constellation stars around the logo: [x, y, radius]; lines are drawn between
  // consecutive stars of each chain during the animation
  stars: [[14, 22, 0.9], [22, 13, 1.2], [31, 19, 0.8], [27, 30, 1.0], [76, 16, 1.0], [85, 9, 1.3], [94, 18, 0.9], [88, 28, 0.8], [12, 47, 0.8], [20, 56, 1.1], [92, 46, 1.0], [84, 57, 0.8]],
  chains: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11]],
  name: { y: 66, size: 9.5 },
  divider: { y: 74, x1: 33, x2: 72, n: 9 },
  tagline: { text: 'از پراکندگی تا نظم', y: 83, size: 5 },
  sub: { y: 91, size: 3.3 },
  // contact rows: icon on the right; the tappable link is placed on screen by the app
  iconX: 88,
  links: [{ id: 'phone', y: 106 }, { id: 'telegram', y: 119 }, { id: 'web', y: 132 }],
};

// Size (mm) of the transparent sheet holding every piece upright (img/doc5-atlas.png).
export const ATLAS_SIZE = [160, 120];
