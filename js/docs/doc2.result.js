// Result card for Document 2: a daily status report in cautious wording.
import { S } from '../strings.fa.js';
import { h } from '../util.js';
import { REPORT } from './doc2.data.js';

export function renderResult() {
  return h('article', { class: 'paper' },
    h('p', { class: 'paper-meta' }, REPORT.meta),
    h('h3', {}, S.doc2.reportTitle),
    h('ul', { class: 'report-list' }, REPORT.items.map((it) => h('li', {}, h('strong', {}, it.title), h('span', {}, it.text)))),
    h('div', { class: 'callout', role: 'note' }, h('strong', {}, REPORT.followUp.title), h('p', {}, REPORT.followUp.text)),
  );
}
export const resultTitle = () => S.doc2.resultTitle;
export const resultSub = () => S.doc2.resultSub;
