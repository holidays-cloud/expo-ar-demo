// ALL visible UI text lives here, so wording can change without touching logic.
// Farsi is primary; `en` lines are the optional secondary English line.
// Use {brand} where the Farsi brand name should appear (filled from config.js).
//
// Honesty rule: the banner documents are fixed and their results are prepared in
// advance. Never write that anything is "analysed", "read", "extracted" or processed
// live. Use: reorganized / assigned / mapped / marked.
//
// The text printed ON the documents is part of the artwork and lives in
// js/docs/docN.data.js (changing it requires re-printing).

export const S = {
  appTitle: 'از پراکندگی تا نظم',

  intro: {
    kicker: '{brand}',
    title: 'از پراکندگی تا نظم',
    titleEn: 'From scattered to ordered',
    body: 'دوربین گوشی را روی برگه‌های این بنر بگیرید و ببینید یک کار روزمرهٔ کسب‌وکار چطور مرتب و سازمان‌دهی می‌شود.',
    start: 'شروع',
    fine: 'بدون نصب برنامه و بدون ثبت‌نام',
  },

  tiles: {
    title: 'برگه‌های روی بنر',
    titleEn: 'The documents on the banner',
    progress: '{done} از {total} برگه',
    soon: 'به‌زودی',
    done: 'انجام شد',
    back: 'بازگشت',
  },

  docs: {
    doc1: { title: 'برگهٔ سفارش و شیفت دست‌نویس', en: 'Handwritten order & shift sheet' },
    doc2: { title: 'عکس محیط کار', en: 'Workspace photo' },
    doc3: { title: 'نقشهٔ طبقه', en: 'Floor plan' },
    doc4: { title: 'حواله و فاکتور', en: 'Delivery slip & invoice' },
    doc5: { title: 'کارت ویزیت ما', en: 'Our business card' },
  },

  sheet: {
    camera: 'روی برگهٔ بنر با دوربین',
    cameraHint: 'انیمیشن روی برگهٔ چاپی نمایش داده می‌شود',
    still: 'پخش روی تصویر برگه',
    stillHint: 'بدون دوربین',
    sample: 'دیدن نمونهٔ نتیجه',
    cancel: 'بستن',
  },

  camera: {
    title: 'اجازهٔ استفاده از دوربین',
    body: 'برای اینکه انیمیشن دقیقاً روی برگهٔ چاپی بنر بنشیند، این صفحه به دوربین گوشی نیاز دارد. تصویر دوربین از گوشی شما خارج نمی‌شود و جایی ذخیره نمی‌شود.',
    next: 'مرورگر از شما اجازه می‌خواهد؛ گزینهٔ «اجازه» را بزنید.',
    allow: 'روشن کردن دوربین',
    noCamera: 'بدون دوربین، روی تصویر برگه',
  },

  ar: {
    loading: 'در حال آماده‌سازی…',
    loadingSlow: 'اتصال کند است. می‌توانید صبر کنید یا همین حالا انیمیشن را روی تصویر برگه ببینید.',
    point: 'دوربین را روی برگهٔ «{doc}» در بنر بگیرید',
    lost: 'برگه از کادر خارج شد؛ دوباره آن را در کادر بیاورید',
    notFound: 'برگه پیدا نشد. گوشی را کمی عقب‌تر و صاف نگه دارید و مطمئن شوید نور کافی است.',
    close: 'بستن',
    replay: 'پخش دوباره',
    viewResult: 'دیدن نتیجه',
  },

  errors: {
    denied: 'دسترسی به دوربین داده نشد.',
    deniedHelp: 'اگر نظرتان عوض شد، از تنظیمات مرورگر اجازهٔ دوربین را برای این صفحه روشن کنید. فعلاً می‌توانید همان انیمیشن را روی تصویر برگه ببینید.',
    unsupported: 'این مرورگر یا گوشی از حالت دوربین پشتیبانی نمی‌کند.',
    unsupportedHelp: 'همان انیمیشن را می‌توانید روی تصویر برگه ببینید.',
    insecure: 'دوربین فقط روی نشانی امن (https) کار می‌کند.',
    failed: 'حالت دوربین باز نشد.',
    loadFailed: 'بارگذاری کامل نشد. اتصال اینترنت را بررسی کنید.',
    retry: 'تلاش دوباره',
  },

  still: {
    title: 'نمایش روی تصویر برگه',
  },

  result: {
    preparedNote: 'این یک نمایش از روند کار است. نتیجهٔ این برگه از قبل آماده شده است.',
    back: 'بازگشت به برگه‌ها',
    next: 'برگهٔ بعدی',
  },

  doc1: {
    resultTitle: 'سفارش‌ها و شیفت‌ها، مرتب‌شده',
    resultSub: 'یادداشت‌های دست‌نویس در قالب جدول مرتب شدند، نیروها به شیفت‌ها اختصاص یافتند و یک تداخل علامت خورد.',
    ordersTitle: 'اقلام سفارش',
    cols: { n: 'ردیف', item: 'شرح', qty: 'تعداد', unit: 'واحد', note: 'یادداشت' },
    shiftsTitle: 'برنامهٔ شیفت هفته',
    shiftCorner: 'شیفت',
    notesTitle: 'یادداشت‌ها',
    panelTitle: 'سفارش و برنامهٔ شیفت',
    panelFooter: 'نمونهٔ نمایشی · نتیجهٔ این برگه از قبل آماده شده است',
  },
};
