// Contact helpers for the business card: a vCard built on the phone (no server) and the
// contact link (phone or Telegram, from config.js).
import { CONFIG } from './config.js';

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

export function contactLink() {
  return CONFIG.CONTACT_PRIMARY === 'telegram' && CONFIG.TELEGRAM_ID
    ? { href: `https://t.me/${CONFIG.TELEGRAM_ID}`, kind: 'telegram' }
    : { href: `tel:${CONFIG.PHONE}`, kind: 'phone' };
}
