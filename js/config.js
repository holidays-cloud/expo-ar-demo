// One place for everything that is not decided yet.
// Swap these values and nothing else needs to change.
// (BRAND_NAME_FA is shown to visitors, so its placeholder is Farsi.)
// After changing BRAND_NAME_FA, PHONE or SITE_URL, rebuild the business card:
//   npm run print:card   then   npm run targets   (and reprint the card)
export const CONFIG = {
  BRAND_NAME: 'BRAND_NAME',
  BRAND_NAME_FA: 'نام برند',
  BRAND_TAGLINE_FA: 'اتوماسیون و بهینه‌سازی هوشمند کسب‌وکار',
  TELEGRAM_ID: 'BRAND_TELEGRAM',          // without @
  PHONE: '+982100000000',                 // international format, digits only after +
  PHONE_DISPLAY_FA: '۰۲۱ ۰۰۰۰ ۰۰۰۰',      // how the number is printed on the card
  // Which contact button the card shows: 'phone' (works everywhere) or 'telegram'.
  CONTACT_PRIMARY: 'phone',
  // Address printed as a QR code on the business card. PLACEHOLDER: currently the
  // GitHub Pages test address; replace with the final domain before printing the card.
  SITE_URL: 'https://holidays-cloud.github.io/expo-ar-demo/',
  // Bump when the stored progress format changes.
  STORAGE_KEY: 'expoar.progress.v2',
  // Booth staff open the sample results by tapping the logo this many times quickly.
  BOOTH_TAPS: 5,
};
