// Result card for Document 3: rooms with areas, total, and a draft materials list.
import { S } from '../strings.fa.js';
import { h, toFa } from '../util.js';
import { ROOMS, TOTAL_AREA, MATERIALS } from './doc3.data.js';

export function renderResult() {
  const T = S.doc3;
  return h('article', { class: 'paper' },
    h('h3', {}, T.roomsTitle),
    h('table', { class: 'rt' },
      h('thead', {}, h('tr', {}, h('th', {}, T.cols.room), h('th', { class: 'c-qty' }, T.cols.dims), h('th', { class: 'c-qty' }, T.cols.area))),
      h('tbody', {}, ROOMS.map((r) => h('tr', {},
        h('td', {}, r.name),
        h('td', { class: 'c-unit' }, `${toFa(r.m[2])} × ${toFa(r.m[3])}`),
        h('td', { class: 'c-qty' }, `${toFa(r.area)} ${S.units.m2}`)))),
      h('tfoot', {}, h('tr', {}, h('th', { colspan: 2 }, T.totalLabel), h('th', { class: 'c-qty' }, `${toFa(TOTAL_AREA)} ${S.units.m2}`))),
    ),
    h('h3', {}, T.materialsTitle),
    h('ul', { class: 'report-list' }, MATERIALS.map((m) => h('li', {}, h('strong', {}, m.item), h('span', {}, m.qty)))),
    h('p', { class: 'paper-note' }, T.draftNote),
  );
}
export const resultTitle = () => S.doc3.resultTitle;
export const resultSub = () => S.doc3.resultSub;
