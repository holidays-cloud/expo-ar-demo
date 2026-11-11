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

// ---- Paper layout of the official form (mm) ----------------------------------------
// Order table: 8 rows under a header row; columns right to left (RTL).
export const ORDER_TABLE = {
  top: 61, rowH: 9, rows: 8,
  cols: { n: [186, 196], item: [124, 186], qty: [88, 124], note: [16, 88] },
};
const rowBase = (i) => ORDER_TABLE.top + i * ORDER_TABLE.rowH + 6.6; // baseline of row i

// Shift table geometry on the paper (days and row labels are printed; names handwritten).
export const PAPER_GRID = {
  x1: 16, x2: 196, labelW: 24, // label column is on the right (RTL)
  rows: [157, 166, 184, 202], // header | morning | evening
};
export const dayCol = (k) => { // k = 0 (Saturday, rightmost) .. 5 (Thursday)
  const w = (PAPER_GRID.x2 - PAPER_GRID.labelW - PAPER_GRID.x1) / 6;
  const right = PAPER_GRID.x2 - PAPER_GRID.labelW - w * k;
  return { cx: right - w / 2, x1: right - w, x2: right };
};

export const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
export const SHIFT_NAMES = {
  morning: ['سارا', 'رضا', 'سارا', 'رضا', 'مینا', 'امید'],
  evening: ['امید', 'مینا', 'نگار', 'کاوه', 'نگار', 'کاوه'],
};
// The one conflict: Reza is noted as on leave on Tuesday but is in Tuesday's morning shift.
export const CONFLICT = { row: 'morning', day: 3 };

// Ink colours
const BLUE = '#1f3b8c';
const RED = '#a5281f';

const C = ORDER_TABLE.cols;
const ITEM_X = C.item[1] - 2, QTY_X = (C.qty[0] + C.qty[1]) / 2, NOTE_X = C.note[1] - 3;

// Handwritten pieces. Each piece is written on the form and, in the animation, lifts off
// and flies to the clean-layout rect named in `to`.
//   x: start of the line (right edge, RTL) or centre when align:'middle'
//   y: baseline
//   segs: text written right to left; seg.x jumps to a table column
//         strike: crossed out, circle: circled, underline: underlined twice
export const HAND = [
  // header fields (left box of the form header)
  { id: 'h_no', x: 47, y: 21.5, size: 5.2, rot: -1.5, ink: BLUE, segs: [{ t: '۰۴۷' }], to: 'meta' },
  { id: 'h_date', x: 48, y: 30, size: 5.2, rot: 1, ink: BLUE, segs: [{ t: '۱۹ آبان' }], to: 'meta' },

  // order table rows: item | quantity | remarks
  { id: 'o1', x: ITEM_X, y: rowBase(0), size: 5.6, rot: -0.6, ink: BLUE, segs: [{ t: 'کارتن بسته بندی بزرگ' }, { t: '۱۲ عدد', x: QTY_X, align: 'middle' }], to: 'r1' },
  { id: 'o2', x: ITEM_X, y: rowBase(1), size: 5.6, rot: 0.6, ink: BLUE, segs: [{ t: 'نوار چسب پهن' }, { t: '۲۴ حلقه', x: QTY_X, align: 'middle' }], to: 'r2' },
  { id: 'o3', x: ITEM_X, y: rowBase(2), size: 5.6, rot: -1, ink: BLUE, segs: [{ t: 'دستکش کار (سایز بزرگ)' }, { t: '۳ جعبه', x: QTY_X, align: 'middle' }], to: 'r3' },
  { id: 'o4', x: ITEM_X, y: rowBase(3), size: 5.6, rot: 0.4, ink: BLUE, segs: [{ t: 'برچسب قیمت' }, { t: '۵ بسته', x: QTY_X, align: 'middle', strike: true }, { t: '۸ بسته', x: NOTE_X, circle: true }, { t: 'اصلاح شد' }], to: 'r4' },
  { id: 'o5', x: ITEM_X, y: rowBase(4), size: 5.6, rot: -0.3, ink: BLUE, segs: [{ t: 'کاغذ تحریر' }, { t: '۱۰ بند', x: QTY_X, align: 'middle' }], to: 'r5' },
  { id: 'o6', x: ITEM_X, y: rowBase(5), size: 5.6, rot: 0.9, ink: BLUE, segs: [{ t: 'ماژیک آبی و مشکی' }, { t: '۲ جعبه', x: QTY_X, align: 'middle' }], to: 'r6' },
  { id: 'o7', x: ITEM_X, y: rowBase(6), size: 5.6, rot: -0.8, ink: BLUE, segs: [{ t: 'تونر پرینتر' }, { t: '۱ عدد', x: QTY_X, align: 'middle' }, { t: 'فوری!', x: NOTE_X, underline: true }], to: 'r7' },
  { id: 'o8', x: 176, y: 140.5, size: 5, rot: -1.5, ink: BLUE, segs: [{ t: 'سفارش قبل از ظهر ارسال شه' }], to: 'onote' },

  // shift names
  ...SHIFT_NAMES.morning.map((n, k) => ({ id: 'cm' + k, x: dayCol(k).cx + [1, -1.5, 2, 0, -1, 1.5][k], y: 177.5 + [0.5, -0.5, 1, 0, -1, 0.5][k], size: 5.6, rot: [-3, 2, -1, 3, -2, 1][k], ink: BLUE, align: 'middle', segs: [{ t: n }], to: 'cm' + k })),
  ...SHIFT_NAMES.evening.map((n, k) => ({ id: 'ce' + k, x: dayCol(k).cx + [-1, 1.5, -2, 1, 0, -1][k], y: 195.5 + [-0.5, 1, 0, -1, 0.5, 0][k], size: 5.6, rot: [2, -2, 1, -3, 2, -1][k], ink: BLUE, align: 'middle', segs: [{ t: n + (k === 5 ? '؟' : '') }], to: 'ce' + k })),

  // the supervisor's red note (source of the conflict)
  { id: 'leave', x: 163, y: 213.5, size: 5.8, rot: -2, ink: RED, segs: [{ t: 'رضا سه شنبه مرخصیه!', underline: true }], to: 'callout' },

  // further notes
  { id: 'n1', x: 178, y: 237, size: 5.4, rot: -0.7, ink: BLUE, segs: [{ t: 'تحویل بار: چهارشنبه صبح، درب پشتی' }], to: 'n1' },
  { id: 'n2', x: 176, y: 247, size: 5.4, rot: 1, ink: BLUE, segs: [{ t: 'فاکتور قبلی هنوز نیومده' }], to: 'n2' },
];

// Where the supervisor's arrow points (Tuesday morning cell).
export const LEAVE_ARROW = { from: [118, 211], to: [dayCol(CONFLICT.day).x2 - 4, 181] };

// ---------------------------------------------------------------------------
// The CLEAN layout that locks over the page at the end of the animation.
// Same millimetre space as the paper so pieces only travel a short distance.
// ---------------------------------------------------------------------------
export const CLEAN_PANEL = { x: 10, y: 12, w: 190, h: 273 };

// The clean panel is read on a phone held at arm's length: when an A4 page fills a 390 px
// wide screen, 1 mm is about 1.86 px, so text here is 7-9 mm (about 13-17 px on screen).
// To fit at that size, the panel uses shortened wording (the full wording is on the
// result card): item + quantity columns only, short day names, short notes.
export const ORDER_COLS = [ // RTL: first column is rightmost
  { key: 'item', x1: 74, x2: 196 },
  { key: 'qty', x1: 14, x2: 74 },
];
export const ORDERS = [
  { n: '۱', item: 'کارتن بسته‌بندی بزرگ', qty: '۱۲', unit: 'عدد', note: '' },
  { n: '۲', item: 'نوار چسب پهن', qty: '۲۴', unit: 'حلقه', note: '' },
  { n: '۳', item: 'دستکش کار، سایز بزرگ', qty: '۳', unit: 'جعبه', note: '' },
  { n: '۴', item: 'برچسب قیمت', qty: '۸', unit: 'بسته', note: 'اصلاح روی برگه: ۵ ← ۸', badge: 'اصلاح‌شده' },
  { n: '۵', item: 'کاغذ تحریر', qty: '۱۰', unit: 'بند', note: '' },
  { n: '۶', item: 'ماژیک آبی و مشکی', qty: '۲', unit: 'جعبه', note: '' },
  { n: '۷', item: 'تونر پرینتر', qty: '۱', unit: 'عدد', note: 'فوری', urgent: true, badge: 'فوری' },
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

// Short forms used only inside the AR panel (big text)
export const PANEL = {
  meta: '۱۹ آبان',
  qtyHead: 'تعداد', itemHead: 'کالا',
  orderNote: 'ارسال: پیش از ظهر',
  days: ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج'],
  callout1: 'تداخل: رضا سه‌شنبه مرخصی است',
  callout2: 'اما شیفت صبح سه‌شنبه با اوست',
  notes: ['تحویل بار: چهارشنبه صبح', 'فاکتور قبلی هنوز نرسیده'],
  footer: 'نمایش از پیش آماده‌شده',
};

// Clean-layout rectangles [x, y, w, h] in mm.
const ROW_H = 12.5;
const ORDERS_TOP = 43;
export const CLEAN_GRID = { x1: 14, x2: 196, labelW: 26, rows: [156, 167, 184, 201] };
const cleanDay = (k) => {
  const w = (CLEAN_GRID.x2 - CLEAN_GRID.labelW - CLEAN_GRID.x1) / 6;
  const right = CLEAN_GRID.x2 - CLEAN_GRID.labelW - w * k;
  return [right - w, right];
};

export const CLEAN = {
  title: [14, 15, 182, 15],
  meta: [14, 15, 50, 15],
  ordersHeader: [14, 33, 182, 10],
  rows: Object.fromEntries(ORDERS.map((_, i) => ['r' + (i + 1), [14, ORDERS_TOP + i * ROW_H, 182, ROW_H]])),
  onote: [14, 131, 182, 11],
  shiftTitle: [14, 144, 182, 11],
  cells: {
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['hd' + k, [a, CLEAN_GRID.rows[0], b - a, CLEAN_GRID.rows[1] - CLEAN_GRID.rows[0]]]; })),
    hl_m: [CLEAN_GRID.x2 - CLEAN_GRID.labelW, CLEAN_GRID.rows[1], CLEAN_GRID.labelW, CLEAN_GRID.rows[2] - CLEAN_GRID.rows[1]],
    hl_e: [CLEAN_GRID.x2 - CLEAN_GRID.labelW, CLEAN_GRID.rows[2], CLEAN_GRID.labelW, CLEAN_GRID.rows[3] - CLEAN_GRID.rows[2]],
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['cm' + k, [a, CLEAN_GRID.rows[1], b - a, CLEAN_GRID.rows[2] - CLEAN_GRID.rows[1]]]; })),
    ...Object.fromEntries(DAYS.map((_, k) => { const [a, b] = cleanDay(k); return ['ce' + k, [a, CLEAN_GRID.rows[2], b - a, CLEAN_GRID.rows[3] - CLEAN_GRID.rows[2]]]; })),
  },
  callout: [14, 205, 182, 24],
  notesTitle: [14, 233, 182, 10],
  n1: [14, 243, 182, 12],
  n2: [14, 255, 182, 12],
  footer: [14, 270, 182, 11],
};

// Flat lookup: target id -> rect
export function cleanRect(id) {
  return CLEAN.rows[id] || CLEAN.cells[id] || CLEAN[id];
}
