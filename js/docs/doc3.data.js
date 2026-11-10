// Document 3: floor plan with printed dimensions (scale 1:100, so 1 m = 10 mm on paper).
// Shared by tools/print/doc3.print.js and the app. All content is fictional.
// Changing anything here requires: npm run print && npm run targets

export const PAGE = { w: 210, h: 297 };

// Building origin on paper (top-left outer corner) and scale
export const ORIGIN = { x: 25, y: 52 };
export const MM_PER_M = 10;
export const BUILDING = { w: 16, h: 15 }; // metres

// Rooms in metres: [x, y, w, h] from the building's top-left corner.
// Areas are computed from these numbers, so plan, animation and result always agree.
export const ROOMS = [
  { id: 'hall', name: 'سالن کار', m: [0, 0, 10, 8] },
  { id: 'store', name: 'انبار', m: [10, 0, 6, 8] },
  { id: 'corridor', name: 'راهرو', m: [0, 8, 16, 2] },
  { id: 'office', name: 'دفتر مدیریت', m: [0, 10, 6, 5] },
  { id: 'meeting', name: 'اتاق جلسه', m: [6, 10, 5, 5] },
  { id: 'kitchen', name: 'آشپزخانه', m: [11, 10, 5, 3] },
  { id: 'wc', name: 'سرویس', m: [11, 13, 5, 2] },
].map((r) => ({ ...r, area: r.m[2] * r.m[3], rect: toPaper(r.m) }));

export const TOTAL_AREA = ROOMS.reduce((s, r) => s + r.area, 0); // 240

export function toPaper([x, y, w, h]) {
  return [ORIGIN.x + x * MM_PER_M, ORIGIN.y + y * MM_PER_M, w * MM_PER_M, h * MM_PER_M];
}

// Title block (bottom of the sheet) where the total appears in the animation
export const TITLE_BLOCK = [16, 236, 178, 44];

// Draft list for the result card. Wording is cautious: a draft to review, not a quote.
export const MATERIALS = [
  { item: 'کف‌پوش برای سالن کار، انبار و راهرو', qty: 'حدود ۱۶۰ متر مربع، به‌اضافهٔ کمی برای برش' },
  { item: 'چراغ سقفی', qty: 'حدود ۲۴ عدد (تقریباً یکی برای هر ۱۰ متر مربع)' },
  { item: 'قفسه‌بندی دور دیوارهای انبار', qty: 'حدود ۲۴ متر طول' },
  { item: 'کپسول آتش‌نشانی', qty: '۴ عدد (تقریباً یکی برای هر ۶۰ متر مربع)' },
  { item: 'میز و صندلی دفتر و اتاق جلسه', qty: 'یک میز مدیریت، یک میز جلسهٔ ۶ نفره' },
];
