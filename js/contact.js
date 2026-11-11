// Contact helpers for the business card: a vCard built on the phone (no server) and the
// contact link (phone or Telegram, from config.js).
import { CONFIG } from './config.js';
import { S } from './strings.fa.js';

export function vcardText() {
  const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(CONFIG.BRAND_NAME_FA)}`,
    `ORG:${esc(CONFIG.BRAND_NAME_FA)}`,
    `NOTE:${esc(CONFIG.BRAND_TAGLINE_FA)}`,
    `TEL;TYPE=WORK,VOICE:${CONFIG.PHONE}`,
    `URL:${CONFIG.SITE_URL}`,
    CONFIG.TELEGRAM_ID ? `X-SOCIALPROFILE;TYPE=telegram:https://t.me/${CONFIG.TELEGRAM_ID}` : null,
    'END:VCARD',
  ].filter(Boolean).join('\r\n') + '\r\n';
}

/** Saves the vCard: the share sheet where available (best on phones), otherwise a download. */
export async function saveContact() {
  const blob = new Blob([vcardText()], { type: 'text/vcard;charset=utf-8' });
  const file = (() => { try { return new File([blob], 'contact.vcf', { type: 'text/vcard' }); } catch (e) { return null; } })();
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'contact.vcf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** The three contact links shown on the assembled card (and as buttons where there is no AR). */
export function contactLinks() {
  return [
    { kind: 'phone', href: `tel:${CONFIG.PHONE}`, label: CONFIG.PHONE_DISPLAY_FA, sub: S.card.callSub },
    { kind: 'telegram', href: `https://t.me/${CONFIG.TELEGRAM_ID}`, label: S.card.telegram, sub: S.card.telegramSub },
    { kind: 'web', href: CONFIG.SITE_URL, label: S.card.web, sub: S.card.webSub },
  ];
}

export function contactLink() {
  return CONFIG.CONTACT_PRIMARY === 'telegram' && CONFIG.TELEGRAM_ID
    ? { href: `https://t.me/${CONFIG.TELEGRAM_ID}`, kind: 'telegram' }
    : { href: `tel:${CONFIG.PHONE}`, kind: 'phone' };
}
