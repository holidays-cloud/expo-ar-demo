// Document 4: supplier invoice (top) and the delivery slip that came with the goods (bottom).
// Shared by tools/print/doc4.print.js and the app. All content is fictional.
// Changing anything here requires: npm run print && npm run targets

export const PAGE = { w: 210, h: 297 };

export const ITEMS = [
  { id: 'pallet', name: 'پالت چوبی', unit: 'عدد', qty: 10, price: 450000 },
  { id: 'carton', name: 'کارتن بسته‌بندی بزرگ', unit: 'عدد', qty: 40, price: 28000 },
  { id: 'tape', name: 'نوار چسب پهن', unit: 'حلقه', qty: 24, price: 65000 },
  { id: 'stretch', name: 'فیلم استرچ', unit: 'رول', qty: 6, price: 380000 },
  { id: 'gloves', name: 'دستکش کار', unit: 'جعبه', qty: 3, price: 240000 },
  { id: 'labels', name: 'برچسب بارکد', unit: 'بسته', qty: 5, price: 150000 },
];
export const TOTAL = ITEMS.reduce((s, i) => s + i.qty * i.price, 0); // 10,930,000

// The slip lists the same goods in a different order, with handwritten received quantities.
export const SLIP_ORDER = ['tape', 'carton', 'pallet', 'gloves', 'stretch', 'labels'];
export const RECEIVED = { pallet: 10, carton: 36, tape: 24, stretch: 6, gloves: 3, labels: 5 };
export const MISMATCH = 'carton';

// ---- paper geometry (mm) ---------------------------------------------------------
export const INVOICE = {
  x1: 18, x2: 194,
  headerY: 50, rowH: 9, // table header row 50..58, rows from 58
  cols: { n: [184, 194], name: [130, 184], qty: [112, 130], unit: [96, 112], price: [64, 96], sum: [18, 64] },
};
export const SLIP = {
  x: 24, y: 160, w: 162, h: 120,
  headerY: 190, rowH: 10, // table header 190..198, rows from 198
  cols: { n: [174, 182], name: [118, 174], qty: [88, 118], note: [28, 88] },
};

export const invoiceRowRect = (id) => {
  const i = ITEMS.findIndex((it) => it.id === id);
  const y = INVOICE.headerY + 8 + i * INVOICE.rowH;
  return [INVOICE.x1, y, INVOICE.x2 - INVOICE.x1, INVOICE.rowH];
};
export const slipRowRect = (id) => {
  const j = SLIP_ORDER.indexOf(id);
  const y = SLIP.headerY + 8 + j * SLIP.rowH;
  return [SLIP.cols.note[0], y, SLIP.cols.n[1] - SLIP.cols.note[0], SLIP.rowH];
};

export const RESULT = {
  title: 'کارتن بسته‌بندی بزرگ',
  invoice: '۴۰ عدد',
  received: '۳۶ عدد',
  diff: '۴ عدد کمتر تحویل شده',
  amount: '۱۱۲٬۰۰۰ تومان', // 4 × 28,000
  next: 'پیش از پرداخت، با تأمین‌کننده هماهنگ شود.',
};
