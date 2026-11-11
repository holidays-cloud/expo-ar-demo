// "Result" for our business card: a contact card with the three actions.
// (No "prepared in advance" note here: nothing is being demonstrated, it is our contact.)
import { S } from '../strings.fa.js';
import { CONFIG } from '../config.js';
import { h } from '../util.js';
import { saveContact, contactLinks } from '../contact.js';

/**
 * Buttons for the card. In the camera view the three contact links are pinned on the card
 * itself (tappable), so only "save contact" and "try your own card" are needed; elsewhere
 * (booth demo, contact card) pass {links: true} to also get the three links as buttons.
 */
export function cardActions({ onTryOwnCard, links = false } = {}) {
  const short = { phone: S.card.callSub, telegram: S.card.telegramShort, web: S.card.webShort };
  const linkRow = links ? [h('div', { class: 'link-row' }, contactLinks().map((l) => h('a', { class: 'btn link-btn', href: l.href, target: l.kind === 'phone' ? null : '_blank', rel: 'noopener' }, short[l.kind])))] : [];
  return [
    ...linkRow,
    h('button', { class: 'btn primary wide', onclick: () => saveContact() }, S.card.saveContact),
    h('button', { class: 'btn wide', onclick: () => onTryOwnCard && onTryOwnCard() }, S.card.tryOwn),
  ];
}

export function renderResult(opts = {}) {
  return h('article', { class: 'paper contact-card' },
    h('div', { class: 'contact-brand' }, CONFIG.BRAND_NAME_FA),
    h('p', { class: 'contact-tag' }, S.ownCard.tagline),
    h('p', { class: 'paper-note' }, CONFIG.BRAND_TAGLINE_FA),
    h('div', { class: 'contact-actions' }, cardActions({ ...opts, links: true })),
  );
}
export const resultTitle = () => S.card.title;
export const resultSub = () => S.card.sub;
export const kind = 'card';
