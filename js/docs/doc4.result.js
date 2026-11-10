// Result card for Document 4: invoice vs delivery slip, with the one discrepancy.
import { S } from '../strings.fa.js';
import { h, toFa } from '../util.js';
import { ITEMS, RECEIVED, MISMATCH, RESULT } from './doc4.data.js';

export function renderResult() {
  const T = S.doc4;
  return h('article', { class: 'paper' },
    h('div', { class: 'callout', role: 'note' },
      h('strong', {}, `${T.diffLabel}: ${RESULT.title}`),
      h('p', {}, `${T.invoice}: ${RESULT.invoice} · ${T.slip}: ${RESULT.received} · ${RESULT.diff}`),
      h('p', {}, `${T.amountLabel}: ${RESULT.amount}`),
      h('p', { class: 'muted' }, RESULT.next),
    ),
    h('h3', {}, T.compareTitle),
    h('table', { class: 'rt' },
      h('thead', {}, h('tr', {}, h('th', {}, T.cols.item), h('th', { class: 'c-qty' }, T.invoice), h('th', { class: 'c-qty' }, T.slip), h('th', { class: 'c-qty' }, ''))),
      h('tbody', {}, ITEMS.map((it) => {
        const bad = it.id === MISMATCH;
        return h('tr', { class: bad ? 'row-warn' : '' },
          h('td', {}, it.name),
          h('td', { class: 'c-qty' }, toFa(it.qty)),
          h('td', { class: 'c-qty' }, toFa(RECEIVED[it.id])),
          h('td', { class: 'c-unit ' + (bad ? 'warn-mark' : 'ok-mark') }, bad ? '!' : '✓'));
      })),
    ),
  );
}
export const resultTitle = () => S.doc4.resultTitle;
export const resultSub = () => S.doc4.resultSub;
