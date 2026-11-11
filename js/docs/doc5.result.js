// "Result" for our business card: a contact card with the three actions.
// (No "prepared in advance" note here: nothing is being demonstrated, it is our contact.)
import { S } from '../strings.fa.js';
import { CONFIG } from '../config.js';
import { h } from '../util.js';
import { saveContact, contactLink } from '../contact.js';

export function cardActions({ onTryOwnCard } = {}) {
  const link = contactLink();
  return [
    h('button', { class: 'btn primary wide', onclick: () => saveContact() }, S.card.saveContact),
    h('a', { class: 'btn wide', href: link.href, target: link.kind === 'telegram' ? '_blank' : null, rel: 'noopener' }, link.kind === 'telegram' ? S.card.telegram : S.card.call),
    h('button', { class: 'btn wide', onclick: () => onTryOwnCard && onTryOwnCard() }, S.card.tryOwn),
  ];
}

export function renderResult(opts = {}) {
  return h('article', { class: 'paper contact-card' },
    h('div', { class: 'contact-brand' }, CONFIG.BRAND_NAME_FA),
    h('p', { class: 'contact-tag' }, S.ownCard.tagline),
    h('p', { class: 'paper-note' }, CONFIG.BRAND_TAGLINE_FA),
    h('div', { class: 'contact-actions' }, cardActions(opts)),
  );
}
export const resultTitle = () => S.card.title;
export const resultSub = () => S.card.sub;
export const kind = 'card';
