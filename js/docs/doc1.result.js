// Result card for Document 1 (plain DOM, no three.js needed).
// Used after the animation and by the "view sample result" button.
import { S } from '../strings.fa.js';
import { h } from '../util.js';
import { ORDERS, ORDER_NOTE, DAYS, SHIFT_NAMES, ROW_LABELS, CONFLICT, CALLOUT, NOTES, META } from './doc1.data.js';

export function renderResult() {
  const T = S.doc1;
  const cols = ['n', 'item', 'qty', 'unit', 'note'];

  const orders = h('table', { class: 'rt rt-orders' },
    h('thead', {}, h('tr', {}, cols.map((c) => h('th', { class: 'c-' + c }, T.cols[c])))),
    h('tbody', {}, ORDERS.map((o) => h('tr', {}, cols.map((c) => h('td', { class: 'c-' + c + (c === 'note' && o.urgent ? ' urgent' : '') }, o[c] || ''))))),
  );

  const isConflict = (row, k) => row === CONFLICT.row && k === CONFLICT.day;
  const shifts = h('div', { class: 'rt-scroll' }, h('table', { class: 'rt rt-shifts' },
    h('thead', {}, h('tr', {}, h('th', {}, T.shiftCorner), DAYS.map((d) => h('th', {}, d)))),
    h('tbody', {}, ['morning', 'evening'].map((row) => h('tr', {},
      h('th', { scope: 'row' }, ROW_LABELS[row]),
      SHIFT_NAMES[row].map((n, k) => h('td', { class: isConflict(row, k) ? 'conflict' : '' }, n)),
    ))),
  ));

  return h('article', { class: 'paper result-doc1' },
    h('p', { class: 'paper-meta' }, META),
    h('h3', {}, T.ordersTitle),
    orders,
    h('p', { class: 'paper-note' }, ORDER_NOTE),
    h('h3', {}, T.shiftsTitle),
    shifts,
    h('div', { class: 'callout', role: 'note' },
      h('strong', {}, CALLOUT.title),
      h('p', {}, CALLOUT.body),
      h('p', { class: 'muted' }, CALLOUT.action),
    ),
    h('h3', {}, T.notesTitle),
    h('ul', { class: 'paper-list' }, NOTES.map((n) => h('li', {}, n))),
  );
}

export const resultTitle = () => S.doc1.resultTitle;
export const resultSub = () => S.doc1.resultSub;
