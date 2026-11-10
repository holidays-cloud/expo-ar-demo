// Document 2: official "daily site photo report" with a real construction-site photo
// (used with the owner's permission). Shared by tools/print/doc2.print.js and the app.
// Millimetres on an A4 page, origin top-left.
// Changing anything here requires: npm run print && npm run targets

export const PAGE = { w: 210, h: 297 };

// The photo: source file scans/photo.jpg (1000 x 750 px). We use the full width and cut
// the empty sky at the top: crop in source pixels.
export const PHOTO_CROP = { x: 0, y: 60, w: 1000, h: 690 };
const K = 182 / PHOTO_CROP.w; // mm per source pixel
export const PHOTO = { x: 14, y: 46, w: 182, h: Math.round(PHOTO_CROP.h * K * 10) / 10 };
/** source-photo pixels -> page mm */
const px = (x, y) => [PHOTO.x + x * K, PHOTO.y + (y - PHOTO_CROP.y) * K];
const box = (x1, y1, x2, y2) => { const [a, b] = px(x1, y1), [c, d] = px(x2, y2); return [a, b, c - a, d - b]; };

// Labelled spots: `rect` is outlined, `label` is where the card floats (mm).
// Wording is deliberately cautious: this is a demonstration, nothing is measured.
export const SPOTS = [
  { id: 'pump', rect: box(725, 60, 1000, 560), label: [150, 54], title: 'پمپ بتن', sub: 'ظاهراً بتن‌ریزی سقف بالا در جریان است' },
  { id: 'scaffold', rect: box(150, 255, 335, 385), label: [60, 70], title: 'داربست و قالب‌بندی', sub: 'طبقهٔ بالا، سمت چپ ساختمان' },
  { id: 'edge', rect: box(140, 395, 640, 450), label: [85, 128], title: 'لبهٔ سقف‌های باز', sub: 'به نظر می‌رسد نردهٔ ایمنی ندارد', warn: true },
  { id: 'mixer', rect: box(785, 550, 1000, 690), label: [150, 182], title: 'تراک میکسر', sub: 'یک دستگاه کنار ساختمان' },
  { id: 'sand', rect: box(40, 610, 620, 735), label: [62, 182], title: 'دپوی ماسه و شن', sub: 'حدود سه دپو در محوطه' },
];

export const CAPTION = 'نمای کلی ساختمان در حال اجرا · ضلع شمالی';
export const INFO = [
  ['محل:', 'کارگاه نمونه · بلوک ب'], ['تاریخ و ساعت:', '۱۹ آبان، حدود ۱۰:۲۰'],
  ['تهیه‌کننده:', 'دفتر فنی کارگاه'], ['وضعیت هوا:', 'آفتابی'],
  ['جهت دید:', 'شمال'], ['شمارهٔ عکس:', '۰۳ از ۰۶'],
];

// Daily site status report (result card). Cautious wording on purpose.
export const REPORT = {
  meta: 'کارگاه نمونه · بلوک ب · ۱۹ آبان، حدود ساعت ۱۰',
  items: [
    { title: 'پمپ بتن', text: 'به نظر می‌رسد بتن‌ریزی سقف طبقهٔ بالا در جریان است.' },
    { title: 'تراک میکسر', text: 'یک دستگاه کنار ساختمان دیده می‌شود.' },
    { title: 'داربست و قالب‌بندی', text: 'در طبقهٔ بالا، سمت چپ ساختمان، قالب‌بندی برپاست.' },
    { title: 'دیوارچینی', text: 'ظاهراً دیوارچینی آجری طبقه‌های پایین در جریان است.' },
    { title: 'مصالح', text: 'حدود سه دپوی ماسه و شن در محوطه دیده می‌شود.' },
  ],
  followUp: { title: 'نیازمند پیگیری', text: 'به نظر می‌رسد لبهٔ سقف‌های باز نردهٔ ایمنی موقت ندارد. بهتر است پیش از ادامهٔ کار بررسی شود.' },
};
