// ALL visitor-facing text lives here, in Farsi only (no English words).
// Use {brand} where the brand name should appear (filled from config.js).
//
// Honesty rule: the banner documents are fixed and their results are prepared in
// advance. Never write that anything is "analysed", "read", "extracted" or processed
// live. Use: reorganized / assigned / mapped / marked. No percentages, no savings claims.
//
// The text printed ON the documents is part of the artwork and lives in
// js/docs/docN.data.js (changing it requires re-printing).

export const S = {
  appTitle: 'از پراکندگی تا نظم',

  intro: {
    title: 'از پراکندگی تا نظم',
    body: 'دوربین گوشی را روی یکی از برگه‌های این بنر بگیرید.',
    start: 'باز کردن دوربین',
    fine: 'تصویر دوربین فقط روی گوشی شما می‌ماند و جایی ذخیره یا ارسال نمی‌شود.',
  },

  scan: {
    loading: 'در حال آماده‌سازی…',
    slow: 'اتصال کند است؛ چند لحظه صبر کنید…',
    point: 'دوربین را روی یکی از برگه‌های بنر بگیرید',
    hold: 'گوشی را کمی عقب‌تر و ثابت نگه دارید',
    lost: 'برگه را دوباره در کادر بیاورید',
    rotate: 'برای خواندن راحت‌تر، گوشی را عمودی بگیرید',
    viewResult: 'دیدن نتیجه',
    close: 'بستن',
    progress: '{done} از {total} برگه',
  },

  result: {
    prepared: 'این یک نمایش است؛ نتیجهٔ این برگه از قبل آماده شده است.',
    next: 'اسکن برگهٔ بعدی',
    allDone: 'همهٔ برگه‌ها را دیدید. سپاس از همراهی شما.',
    tryOwn: 'کارت خودتان را هم امتحان کنید',
    close: 'بستن',
  },

  // One plain screen when the camera cannot be used.
  cameraHelp: {
    titleDenied: 'اجازهٔ دوربین داده نشده است',
    titleUnavailable: 'دوربین در دسترس نیست',
    titleNetwork: 'بارگذاری کامل نشد',
    intro: 'این نمایش فقط با دوربین گوشی کار می‌کند. برای روشن کردن آن:',
    steps: [
      'بالای صفحه، روی نماد کنار نشانی سایت بزنید.',
      'بخش «دوربین» را روی «اجازه» بگذارید.',
      'صفحه را دوباره باز کنید یا دکمهٔ زیر را بزنید.',
    ],
    inApp: 'اگر صفحه را داخل تلگرام، اینستاگرام یا برنامهٔ دیگری باز کرده‌اید، آن را در مرورگر گوشی (کروم یا سافاری) باز کنید.',
    network: 'اتصال اینترنت ضعیف است. چند لحظه بعد دوباره امتحان کنید.',
    staff: 'اگر باز هم نشد، از همکاران ما در غرفه کمک بخواهید.',
    retry: 'تلاش دوباره',
  },

  // Our business card (Doc 5)
  card: {
    title: 'کارت ویزیت ما',
    sub: 'نام و شمارهٔ ما را در گوشی خود ذخیره کنید.',
    saveContact: 'ذخیرهٔ مخاطب',
    call: 'تماس با ما',
    telegram: 'پیام در تلگرام',
    tryOwn: 'کارت خودتان را هم امتحان کنید',
  },

  // Visitor's own card -> constellation. Never say the card is "read" or "analysed":
  // a constellation is "assigned" to it.
  ownCard: {
    camButton: 'کارت شما',
    hint: 'کارت ویزیت خودتان را داخل کادر بگیرید',
    capture: 'گرفتن عکس',
    privacy: 'عکس از گوشی شما خارج نمی‌شود و جایی ذخیره نمی‌شود.',
    assigned: 'صورت فلکی نسبت‌داده‌شده به کارت شما',
    assignedPoster: 'صورت فلکی نسبت‌داده‌شده به کارت من',
    tagline: 'از پراکندگی تا نظم',
    saveImage: 'ذخیرهٔ تصویر',
    link: 'لینک صورت فلکی من',
    linkCopied: 'لینک کپی شد',
    linkHint: 'با این لینک، صورت فلکی شما هر وقت دوباره ساخته می‌شود.',
    again: 'یک کارت دیگر',
    backToCamera: 'بازگشت به اسکن برگه‌ها',
    yours: 'صورت فلکی شما',
    starting: 'در حال باز کردن دوربین…',
  },

  booth: {
    title: 'نمونهٔ نتیجه‌ها',
    note: 'ویژهٔ همکاران غرفه',
    cardDemo: 'انیمیشن کارت ویزیت',
    close: 'بستن',
  },

  docs: {
    doc1: 'برگهٔ سفارش و شیفت',
    doc2: 'عکس کارگاه',
    doc3: 'نقشهٔ طبقه',
    doc4: 'فاکتور و حوالهٔ تحویل',
    doc5: 'کارت ویزیت ما',
  },

  units: { m2: 'متر مربع' },

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
  doc2: {
    resultTitle: 'گزارش وضعیت روزانهٔ کارگاه',
    resultSub: 'بخش‌های اصلی عکس برچسب خوردند و در قالب یک گزارش کوتاه مرتب شدند.',
    reportTitle: 'وضعیت کارگاه',
  },
  doc3: {
    resultTitle: 'اتاق‌ها، مساحت‌ها و فهرست اولیه',
    resultSub: 'اتاق‌ها یکی‌یکی روی نقشه مشخص شدند و مساحت هر کدام از روی ابعاد چاپ‌شده نوشته شد.',
    roomsTitle: 'اتاق‌ها',
    cols: { room: 'اتاق', dims: 'ابعاد (متر)', area: 'مساحت' },
    totalLabel: 'جمع زیربنا',
    materialsTitle: 'فهرست اولیهٔ مصالح و تجهیزات',
    draftNote: 'این فهرست پیش‌نویس است و پیش از خرید باید بازبینی شود.',
  },
  doc4: {
    resultTitle: 'یک اختلاف بین فاکتور و حواله',
    resultSub: 'ردیف‌های فاکتور به ردیف‌های حوالهٔ تحویل وصل شدند و یک ردیف ناهمخوان علامت خورد.',
    diffLabel: 'اختلاف',
    invoice: 'فاکتور',
    slip: 'حواله',
    amountLabel: 'مبلغ ردیف اختلاف',
    compareTitle: 'مقایسهٔ ردیف‌ها',
    cols: { item: 'کالا' },
  },
};
