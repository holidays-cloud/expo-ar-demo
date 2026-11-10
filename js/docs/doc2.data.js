// Document 2: a printed "photo" of a workspace (drawn illustration), plus caption strip.
// Shared by tools/print/doc2.print.js and the app (scene + result card).
// Millimetres on an A4 page, origin top-left. All content is fictional.
// Changing anything drawn here requires: npm run print && npm run targets

export const PAGE = { w: 210, h: 297 };

// The photo area on the page
export const PHOTO = { x: 14, y: 30, w: 182, h: 200 };
// Horizon between wall and floor inside the photo
export const HORIZON = 150;

// Labelled spots: `rect` is the area that gets outlined, `label` is where the card floats.
// Wording is deliberately cautious: this is a demonstration, nothing is measured.
export const SPOTS = [
  { id: 'shelf', rect: [122, 52, 66, 108], label: [155, 44], title: 'قفسهٔ الف', sub: 'تقریباً پر به نظر می‌رسد' },
  { id: 'pallet', rect: [80, 150, 42, 52], label: [101, 212], title: 'پالت ورودی', sub: 'حدود ۱۲ کارتن' },
  { id: 'aisle', rect: [126, 186, 52, 30], label: [156, 176], title: 'مسیر عبور', sub: 'ظاهراً بخشی از آن بسته است', warn: true },
  { id: 'ext', rect: [100, 108, 14, 30], label: [100, 99], title: 'کپسول آتش‌نشانی', sub: 'در جای خود دیده می‌شود' },
  { id: 'desk', rect: [20, 112, 60, 42], label: [48, 162], title: 'میز بسته‌بندی', sub: 'به نظر می‌رسد در حال استفاده است' },
];

export const CAPTION = {
  title: 'عکس محیط کار · انبار شمارهٔ ۲',
  when: 'ثبت: ۱۹ آبان، حدود ساعت ۹:۴۰ صبح',
};

// Daily status report (result card). Cautious wording on purpose.
export const REPORT = {
  meta: 'انبار شمارهٔ ۲ · ۱۹ آبان، حدود ساعت ۹:۴۰',
  items: [
    { title: 'قفسهٔ الف', text: 'تقریباً پر به نظر می‌رسد؛ برای کالای ورودی احتمالاً جای کمی مانده است.' },
    { title: 'پالت ورودی', text: 'حدود ۱۲ کارتن روی پالت دیده می‌شود که ظاهراً هنوز چیده نشده‌اند.' },
    { title: 'میز بسته‌بندی', text: 'به نظر می‌رسد در حال استفاده است.' },
    { title: 'کپسول آتش‌نشانی', text: 'در جای خود دیده می‌شود.' },
  ],
  followUp: { title: 'نیازمند پیگیری', text: 'به نظر می‌رسد بخشی از مسیر عبور با چند کارتن بسته شده است. بهتر است بررسی و باز شود.' },
};
