// Document 1: handwritten-style order page + weekly shift table.
//
// This one file feeds BOTH:
//   - tools/make-print.mjs  (draws the printed sheet in /print)
//   - the app animation and result card (js/docs/doc1.scene.js, js/result.js)
// so the overlay always lines up with the paper.
//
// All units are millimetres on an A4 page (210 x 297), origin at the top-left corner.
// All content is fictional. If you change any handwritten text here you must re-run:
//   npm run print && npm run targets
// (the print file, the web image and the MindAR target all change).
//
// The document's own text lives here (not in strings.fa.js) because it is part of the
// printed artwork; UI wording lives in strings.fa.js.

export const PAGE = { w: 210, h: 297 };

// Shift table geometry on the PAPER (hand-drawn grid).
export const PAPER_GRID = {
  x1: 18, x2: 192, labelW: 24, // label column is on the right (RTL)
  rows: [156, 167, 186, 206], // header | morning | evening
};
const dayCol = (k) => { // k = 0 (Saturday, rightmost) .. 5 (Thursday)
  const w = (PAPER_GRID.x2 - PAPER_GRID.labelW - PAPER_GRID.x1) / 6;
  const right = PAPER_GRID.x2 - PAPER_GRID.labelW - w * k;
  return { cx: right - w / 2, x1: right - w, x2: right };
};
const labelCx = PAPER_GRID.x2 - PAPER_GRID.labelW / 2;

export const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
// Handwriting has no zero-width non-joiner, so the paper spells these with a space.
const DAYS_HAND = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنجشنبه'];
export const SHIFT_NAMES = {
  morning: ['سارا', 'رضا', 'سارا', 'رضا', 'مینا', 'امید'],
  evening: ['امید', 'مینا', 'نگار', 'کاوه', 'نگار', 'کاوه'],
};
// The one conflict: Reza is noted as on leave on Tuesday but is in Tuesday's morning shift.
export const CONFLICT = { row: 'morning', day: 3 };

// Ink colours
const BLUE = '#1f3b8c';
const RED = '#a5281f';

// Handwritten pieces. Each piece is drawn on paper and, in the animation,
// lifts off and flies to the clean-layout rect named in `to`.
//   x: start of the line (right edge, RTL) or centre when align:'middle'
//   y: baseline
//   segs: pieces of text written one after another (right to left)
//         strike: crossed out, circle: circled, underline: underlined twice
export const HAND = [
  // header fields
  { id: 'h_no', x: 44, y: 23, size: 5.2, rot: -1.5, ink: BLUE, segs: [{ t: '۰۴۷' }], to: 'meta' },
  { id: 'h_date', x: 46, y: 33.5, size: 5.2, rot: 1, ink: BLUE, segs: [{ t: '۱۹ آبان' }], to: 'meta' },

  // order lines (baselines sit on the ruled lines)
  { id: 'o1', x: 181, y: 60, size: 6, rot: -0.6, ink: BLUE, segs: [{ t: 'کارتن بسته بندی بزرگ' }, { t: '۱۲ عدد' }], to: 'r1' },
  { id: 'o2', x: 179, y: 70, size: 6, rot: 0.8, ink: BLUE, segs: [{ t: 'نوار چسب پهن' }, { t: 'ــ ۲۴ حلقه' }], to: 'r2' },
  { id: 'o3', x: 182, y: 80, size: 6, rot: -1.2, ink: BLUE, segs: [{ t: 'دستکش کار (سایز بزرگ)' }, { t: '۳ جعبه' }], to: 'r3' },
  { id: 'o4', x: 180, y: 90, size: 6, rot: 0.4, ink: BLUE, segs: [{ t: 'برچسب قیمت' }, { t: '۵ بسته', strike: true }, { t: '←' }, { t: '۸ بسته', circle: true }], to: 'r4' },
  { id: 'o5', x: 178, y: 100, size: 6, rot: -0.3, ink: BLUE, segs: [{ t: 'کاغذ تحریر' }, { t: '۱۰ بند' }], to: 'r5' },
  { id: 'o6', x: 181, y: 110, size: 6, rot: 1.1, ink: BLUE, segs: [{ t: 'ماژیک آبی و مشکی' }, { t: '۲ جعبه' }], to: 'r6' },
  { id: 'o7', x: 180, y: 120, size: 6, rot: -0.9, ink: BLUE, segs: [{ t: 'تونر پرینتر ۱ عدد' }, { t: 'فوری!', underline: true }], to: 'r7' },
  { id: 'o8', x: 128, y: 133, size: 5, rot: -4, ink: BLUE, segs: [{ t: 'سفارش قبل از ظهر ارسال شه' }], to: 'onote' },

  // shift table: day headers, row labels, names
  ...DAYS_HAND.map((d, k) => ({ id: 'd' + k, x: dayCol(k).cx, y: 164, size: 4.4, rot: [-2, 1, -1, 2, -1.5, 1][k], ink: BLUE, align: 'middle', segs: [{ t: d }], to: 'hd' + k })),
  { id: 'l_m', x: labelCx, y: 179, size: 5.4, rot: -2, ink: BLUE, align: 'middle', segs: [{ t: 'صبح' }], to: 'hl_m' },
  { id: 'l_e', x: labelCx, y: 198.5, size: 5.4, rot: 1.5, ink: BLUE, align: 'middle', segs: [{ t: 'عصر' }], to: 'hl_e' },
  ...SHIFT_NAMES.morning.map((n, k) => ({ id: 'cm' + k, x: dayCol(k).cx + [1, -1.5, 2, 0, -1, 1.5][k], y: 179 + [0.5, -0.5, 1, 0, -1, 0.5][k], size: 5.6, rot: [-3, 2, -1, 3, -2, 1][k], ink: BLUE, align: 'middle', segs: [{ t: n }], to: 'cm' + k })),
  ...SHIFT_NAMES.evening.map((n, k) => ({ id: 'ce' + k, x: dayCol(k).cx + [-1, 1.5, -2, 1, 0, -1][k], y: 198 + [-0.5, 1, 0, -1, 0.5, 0][k], size: 5.6, rot: [2, -2, 1, -3, 2, -1][k], ink: BLUE, align: 'middle', segs: [{ t: n + (k === 5 ? '؟' : '') }], to: 'ce' + k })),

  // the manager's red note under the table (source of the conflict)
  { id: 'leave', x: 150, y: 218, size: 5.8, rot: -3, ink: RED, segs: [{ t: 'رضا سه شنبه مرخصیه!', underline: true }], to: 'callout' },

  // notes section
  { id: 'n1', x: 180, y: 244, size: 5.6, rot: -0.7, ink: BLUE, segs: [{ t: 'تحویل بار: چهارشنبه صبح، درب پشتی' }], to: 'n1' },
  { id: 'n2', x: 176, y: 254.5, size: 5.6, rot: 1.2, ink: BLUE, segs: [{ t: 'فاکتور قبلی هنوز نیومده' }], to: 'n2' },
];

// Where the arrow from the red note points (Tuesday column, bottom of grid).
export const LEAVE_ARROW = { from: [94, 214], to: [dayCol(CONFLICT.day).x2 - 4, 182.5] };

// ---------------------------------------------------------------------------
// The CLEAN layout that locks over the page at the end of the animation.
// Same millimetre space as the paper so pieces only travel a short distance.
// ---------------------------------------------------------------------------
export const CLEAN_PANEL = { x: 12, y: 13, w: 186, h: 271 };

export const ORDER_COLS = [ // RTL: first column is rightmost
  { key: 'n', x1: 184, x2: 196 },
  { key: 'item', x1: 122, x2: 184 },
  { key: 'qty', x1: 104, x2: 122 },
  { key: 'unit', x1: 86, x2: 104 },
  { key: 'note', x1: 16, x2: 86 },
];
export const ORDERS = [
  { n: '۱', item: 'کارتن بسته‌بندی بزرگ', qty: '۱۲', unit: 'عدد', note: '' },
  { n: '۲', item: 'نوار چسب پهن', qty: '۲۴', unit: 'حلقه', note: '' },
  { n: '۳', item: 'دستکش کار، سایز بزرگ', qty: '۳', unit: 'جعبه', note: '' },
  { n: '۴', item: 'برچسب قیمت', qty: '۸', unit: 'بسته', note: 'اصلاح روی برگه: ۵ ← ۸' },
  { n: '۵', item: 'کاغذ تحریر', qty: '۱۰', unit: 'بند', note: '' },
  { n: '۶', item: 'ماژیک آبی و مشکی', qty: '۲', unit: 'جعبه', note: '' },
  { n: '۷', item: 'تونر پرینتر', qty: '۱', unit: 'عدد', note: 'فوری', urgent: true },
];
export const ORDER_NOTE = 'ارسال سفارش: پیش از ظهر';
export const META = 'برگهٔ شمارهٔ ۰۴۷، تاریخ ۱۹ آبان';
export const CALLOUT = {
  title: 'تداخل در برنامه',
  body: 'رضا روز سه‌شنبه مرخصی است، اما در شیفت صبح سه‌شنبه نوشته شده.',
  action: 'صبح سه‌شنبه به یک جایگزین نیاز دارد.',
};
export const NOTES = ['تحویل بار: چهارشنبه صبح، درب پشتی', 'فاکتور قبلی هنوز نرسیده است'];
export const ROW_LABELS = { morning: 'صبح', evening: 'عصر' };

// Clean-layout rectangles [x, y, w, h] in mm.
const ROW_H = 10;
const ORDERS_TOP = 45;
export const CLEAN_GRID = { x1: 16, x2: 196, labelW: 24, rows: [143, 153, 169, 185] };
const cleanDay = (k) => {
  const w = (CLEAN_GRID.x2 - CLEAN_GRID.labelW - CLEAN_GRID.x1) / 6;
  const right = CLEAN_GRID.x2 - CLEAN_GRID.labelW - w * k;
  return [right - w, right];
};

export const CLEAN = {
  title: [16, 17, 180, 13],
  meta: [16, 18, 60, 10],
  ordersHeader: [16, 36, 180, 9],
  rows: Object.fromEntries(ORDERS.map((_, i) => ['r' + (i + 1), [16, ORDERS_TOP + i * ROW_H, 180, ROW_H]])),
  onote: [16, 116, 180, 9],
  shiftTitle: [16, 132, 180, 9],
  cells: {
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['hd' + k, [a, CLEAN_GRID.rows[0], b - a, CLEAN_GRID.rows[1] - CLEAN_GRID.rows[0]]]; })),
    hl_m: [CLEAN_GRID.x2 - CLEAN_GRID.labelW, CLEAN_GRID.rows[1], CLEAN_GRID.labelW, CLEAN_GRID.rows[2] - CLEAN_GRID.rows[1]],
    hl_e: [CLEAN_GRID.x2 - CLEAN_GRID.labelW, CLEAN_GRID.rows[2], CLEAN_GRID.labelW, CLEAN_GRID.rows[3] - CLEAN_GRID.rows[2]],
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['cm' + k, [a, CLEAN_GRID.rows[1], b - a, CLEAN_GRID.rows[2] - CLEAN_GRID.rows[1]]]; })),
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['ce' + k, [a, CLEAN_GRID.rows[2], b - a, CLEAN_GRID.rows[3] - CLEAN_GRID.rows[2]]]; })),
  },
  callout: [16, 192, 180, 22],
  notesTitle: [16, 221, 180, 9],
  n1: [16, 230, 180, 9],
  n2: [16, 239, 180, 9],
  footer: [16, 270, 180, 9],
};

// Flat lookup: target id -> rect
export function cleanRect(id) {
  return CLEAN.rows[id] || CLEAN.cells[id] || CLEAN[id];
}
