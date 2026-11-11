// Document 5: our business card (a leave-behind, scanned later at home).
// A6 portrait, 105 x 148 mm. Brand name, tagline, phone and the QR address come from
// js/config.js. Shared by tools/print/doc5.print.js and the app.
// Changing anything here or in those config values requires:
//   npm run print:card && npm run targets   (and reprinting the card)
export const PAGE = { w: 105, h: 148 };

// Pieces that fly in scattered and settle into place (ids of data-piece groups on the card).
export const PIECE_ORDER = ['logo', 'name', 'tagline', 'sub', 'row1', 'row2', 'row3', 'qr', 'scan'];
