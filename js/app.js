// App shell: screens, tiles, progress, and the camera / still / sample flows.
// Everything heavy (three.js, MindAR, document modules) is imported on demand.
import { S } from './strings.fa.js';
import { CONFIG } from './config.js';
import { h, fmt, toFa, loadProgress, markDone, cameraSupport, webglSupport } from './util.js';
import { DOCS } from './docs/index.js';

const root = document.getElementById('app');
let session = null;       // running AR or still controller
let abort = null;         // AbortController for an AR start that is still in progress

document.title = S.appTitle;

// ---- navigation -----------------------------------------------------------------
// Each screen pushes a history entry so the phone's back button returns to the tiles
// instead of leaving the page.
function go(name, params = {}, { replace = false } = {}) {
  const state = { name, ...params };
  if (replace) history.replaceState(state, '');
  else history.pushState(state, '');
  render(state);
}
window.addEventListener('popstate', (e) => render(e.state || { name: 'intro' }));

function stopSession() {
  if (abort) { abort.abort(); abort = null; }
  if (session) { try { session.stop(); } catch (e) { console.warn(e); } session = null; }
  document.body.classList.remove('immersive');
}

function render(state) {
  stopSession();
  closeSheet();
  const screens = { intro, tiles, camera: cameraPrompt, ar: arScreen, still: stillScreen, result: resultScreen, error: errorScreen };
  const fn = screens[state.name] || intro;
  root.replaceChildren(fn(state));
  window.scrollTo(0, 0);
  const focus = root.querySelector('[data-autofocus]');
  if (focus) focus.focus({ preventScroll: true });
}

const docTitle = (id) => S.docs[id];
const docById = (id) => DOCS.find((d) => d.id === id);
const bilingual = (fa, en, cls = '') => h('span', { class: 'bi ' + cls }, h('span', { class: 'fa' }, fa), en ? h('span', { class: 'en', lang: 'en', dir: 'ltr' }, en) : null);

// ---- 1. intro -----------------------------------------------------------------
function intro() {
  return h('main', { class: 'screen intro' },
    h('div', { class: 'intro-mark', 'aria-hidden': 'true' }, introMark()),
    h('p', { class: 'kicker' }, fmt(S.intro.kicker)),
    h('h1', {}, S.intro.title),
    h('p', { class: 'en-line', lang: 'en', dir: 'ltr' }, S.intro.titleEn),
    h('p', { class: 'lead' }, S.intro.body),
    h('button', { class: 'btn primary wide', onclick: () => go('tiles'), 'data-autofocus': true }, S.intro.start),
    h('p', { class: 'fine' }, S.intro.fine),
  );
}

// Scattered dots settling into a line: a quiet visual of the idea (pure CSS animation).
function introMark() {
  const wrap = h('div', { class: 'dots' });
  for (let i = 0; i < 9; i++) wrap.appendChild(h('i', { style: `--i:${i}` }));
  return wrap;
}

// ---- 2. tiles -------------------------------------------------------------------
function tiles() {
  const progress = loadProgress();
  const done = DOCS.filter((d) => progress.done[d.id]).length;
  return h('main', { class: 'screen tiles' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost small', onclick: () => go('intro') }, S.tiles.back),
      h('span', { class: 'brand' }, CONFIG.BRAND_NAME_FA),
    ),
    h('h2', {}, bilingual(S.tiles.title, S.tiles.titleEn)),
    h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': DOCS.length, 'aria-valuenow': done },
      h('div', { class: 'progress-track' }, h('div', { class: 'progress-fill', style: `width:${(done / DOCS.length) * 100}%` })),
      h('span', {}, fmt(S.tiles.progress, { done: toFa(done), total: toFa(DOCS.length) })),
    ),
    h('ol', { class: 'tile-list' }, DOCS.map((d, i) => {
      const ready = !!d.load, isDone = !!progress.done[d.id];
      const t = docTitle(d.id);
      return h('li', {},
        h('button', {
          class: 'tile' + (isDone ? ' done' : '') + (ready ? '' : ' soon'),
          disabled: !ready, onclick: () => openSheet(d.id),
          'aria-label': `${toFa(i + 1)}. ${t.title}${isDone ? ' – ' + S.tiles.done : ''}${ready ? '' : ' – ' + S.tiles.soon}`,
        },
        h('span', { class: 'tile-num' }, toFa(i + 1)),
        h('span', { class: 'tile-text' }, bilingual(t.title, t.en)),
        h('span', { class: 'tile-state' },
          ready ? h('span', { class: 'marker' + (isDone ? ' filled' : ''), title: isDone ? S.tiles.done : '' }) : h('span', { class: 'soon-label' }, S.tiles.soon)),
        ));
    })),
  );
}

// ---- tile action sheet ---------------------------------------------------------
let sheetEl = null;
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
function openSheet(id) {
  closeSheet();
  const t = docTitle(id);
  const support = cameraSupport();
  sheetEl = h('div', { class: 'sheet-backdrop', onclick: (e) => { if (e.target === sheetEl) closeSheet(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.title },
      h('h3', {}, bilingual(t.title, t.en)),
      support === 'ok'
        ? h('button', { class: 'btn primary wide stacked', onclick: () => go('camera', { id }), 'data-autofocus': true },
          h('span', {}, S.sheet.camera), h('small', {}, S.sheet.cameraHint))
        : null,
      webglSupport()
        ? h('button', { class: 'btn wide stacked', onclick: () => go('still', { id }) }, h('span', {}, S.sheet.still), h('small', {}, S.sheet.stillHint))
        : null,
      h('button', { class: 'btn wide', onclick: () => go('result', { id, sample: true }) }, S.sheet.sample),
      support !== 'ok' ? h('p', { class: 'fine' }, support === 'insecure' ? S.errors.insecure : S.errors.unsupported) : null,
      h('button', { class: 'btn ghost wide', onclick: closeSheet }, S.sheet.cancel),
    ));
  document.body.appendChild(sheetEl);
  sheetEl.querySelector('button')?.focus({ preventScroll: true });
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ---- camera permission explainer ------------------------------------------------
function cameraPrompt({ id }) {
  return h('main', { class: 'screen narrow' },
    h('div', { class: 'cam-icon', 'aria-hidden': 'true' }),
    h('h2', {}, S.camera.title),
    h('p', { class: 'lead' }, S.camera.body),
    h('p', { class: 'fine' }, S.camera.next),
    h('button', { class: 'btn primary wide', onclick: () => go('ar', { id }, { replace: true }), 'data-autofocus': true }, S.camera.allow),
    h('button', { class: 'btn wide', onclick: () => go('still', { id }, { replace: true }) }, S.camera.noCamera),
    h('button', { class: 'btn ghost wide', onclick: () => history.back() }, S.tiles.back),
  );
}

// ---- shared full-screen stage ---------------------------------------------------
function stage(id, { mode }) {
  document.body.classList.add('immersive');
  const view = h('div', { class: 'stage-view' });
  const hint = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  const actions = h('div', { class: 'stage-actions' });
  const el = h('main', { class: 'stage ' + mode },
    view,
    h('div', { class: 'stage-top' },
      h('button', { class: 'btn round', 'aria-label': S.ar.close, onclick: () => history.back() }, '×'),
      h('span', { class: 'stage-title' }, docTitle(id).title),
    ),
    h('div', { class: 'stage-bottom' }, hint, actions),
  );
  const setHint = (text, busy = false) => { hint.textContent = text || ''; hint.classList.toggle('busy', busy); hint.hidden = !text; };
  const setActions = (...btns) => actions.replaceChildren(...btns.filter(Boolean));
  return { el, view, setHint, setActions };
}

function doneButtons(id, replay) {
  return [
    h('button', { class: 'btn primary', onclick: () => { markDone(id); go('result', { id }, { replace: true }); } }, S.ar.viewResult),
    h('button', { class: 'btn', onclick: replay }, S.ar.replay),
  ];
}

// ---- AR screen ---------------------------------------------------------------------
function arScreen({ id }) {
  const st = stage(id, { mode: 'ar' });
  const doc = docById(id);
  const stillBtn = () => h('button', { class: 'btn', onclick: () => go('still', { id }, { replace: true }) }, S.sheet.still);
  const myAbort = new AbortController();
  abort = myAbort;
  let slowTimer = null;

  (async () => {
    st.setHint(S.ar.loading, true);
    slowTimer = setTimeout(() => { st.setHint(S.ar.loadingSlow, true); st.setActions(stillBtn()); }, 9000);
    try {
      const mod = await doc.load();
      if (myAbort.signal.aborted) return;
      const ctrl = await (await import('./ar.js')).runAR(mod, st.view, {
        signal: myAbort.signal,
        onStatus: (s) => {
          if (s === 'loading') return;
          clearTimeout(slowTimer);
          if (s === 'scanning') { st.setHint(fmt(S.ar.point, { doc: docTitle(id).title })); st.setActions(); }
          if (s === 'tracking') { st.setHint(''); }
          if (s === 'lost') st.setHint(S.ar.lost);
          if (s === 'notfound') { st.setHint(S.ar.notFound); st.setActions(stillBtn()); }
        },
        onDone: () => st.setActions(...doneButtons(id, () => { session?.replay(); st.setActions(); })),
      });
      clearTimeout(slowTimer);
      if (!ctrl) return;
      if (myAbort.signal.aborted) { ctrl.stop(); return; }
      session = ctrl;
      abort = null;
    } catch (e) {
      clearTimeout(slowTimer);
      if (myAbort.signal.aborted) return;
      console.warn('AR failed', e);
      go('error', { id, code: e.code || 'failed' }, { replace: true });
    }
  })();
  myAbort.signal.addEventListener('abort', () => clearTimeout(slowTimer));
  return st.el;
}

// ---- still-image screen ---------------------------------------------------------
function stillScreen({ id }) {
  const st = stage(id, { mode: 'still' });
  const doc = docById(id);
  const myAbort = new AbortController();
  abort = myAbort;
  (async () => {
    st.setHint(S.ar.loading, true);
    try {
      const mod = await doc.load();
      const ctrl = await (await import('./still.js')).runStill(mod, st.view, {
        onDone: () => st.setActions(...doneButtons(id, () => { session?.replay(); st.setActions(); })),
      });
      if (myAbort.signal.aborted) { ctrl.stop(); return; }
      session = ctrl;
      abort = null;
      st.setHint('');
    } catch (e) {
      if (myAbort.signal.aborted) return;
      console.warn('Still mode failed', e);
      st.setHint(S.errors.loadFailed);
      st.setActions(
        h('button', { class: 'btn primary', onclick: () => go('still', { id }, { replace: true }) }, S.errors.retry),
        h('button', { class: 'btn', onclick: () => go('result', { id, sample: true }, { replace: true }) }, S.sheet.sample),
      );
    }
  })();
  return st.el;
}

// ---- result card ------------------------------------------------------------------
function resultScreen({ id, sample }) {
  const doc = docById(id);
  const body = h('div', { class: 'result-body' }, h('p', { class: 'hint busy' }, S.ar.loading));
  const head = h('div', { class: 'result-head' });
  const idx = DOCS.findIndex((d) => d.id === id);
  const next = DOCS.slice(idx + 1).find((d) => d.load);
  const el = h('main', { class: 'screen result' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost small', onclick: () => go('tiles', {}, { replace: true }) }, S.tiles.back),
      h('span', { class: 'brand' }, CONFIG.BRAND_NAME_FA),
    ),
    head, body,
    h('p', { class: 'prepared' }, S.result.preparedNote),
    h('div', { class: 'result-actions' },
      next ? h('button', { class: 'btn primary wide', onclick: () => openSheet(next.id) }, S.result.next) : null,
      h('button', { class: next ? 'btn wide' : 'btn primary wide', onclick: () => go('tiles', {}, { replace: true }) }, S.result.back),
    ),
  );
  doc.load().then((mod) => {
    head.replaceChildren(
      h('p', { class: 'kicker' }, docTitle(id).title),
      h('h2', {}, mod.resultTitle()),
      h('p', { class: 'lead' }, mod.resultSub()),
    );
    body.replaceChildren(mod.renderResult());
  }).catch(() => {
    body.replaceChildren(h('p', { class: 'hint' }, S.errors.loadFailed),
      h('button', { class: 'btn', onclick: () => go('result', { id, sample }, { replace: true }) }, S.errors.retry));
  });
  void sample; // sample and post-animation results look the same; only the latter counts as done
  return el;
}

// ---- errors (camera denied, unsupported, load failure) ----------------------------
function errorScreen({ id, code }) {
  const msg = {
    denied: [S.errors.denied, S.errors.deniedHelp],
    unsupported: [S.errors.unsupported, S.errors.unsupportedHelp],
    insecure: [S.errors.insecure, S.errors.unsupportedHelp],
    load: [S.errors.loadFailed, ''],
  }[code] || [S.errors.failed, S.errors.unsupportedHelp];
  return h('main', { class: 'screen narrow' },
    h('h2', {}, msg[0]),
    msg[1] ? h('p', { class: 'lead' }, msg[1]) : null,
    webglSupport() ? h('button', { class: 'btn primary wide', onclick: () => go('still', { id }, { replace: true }), 'data-autofocus': true }, S.sheet.still) : null,
    code === 'load' ? h('button', { class: 'btn wide', onclick: () => go('ar', { id }, { replace: true }) }, S.errors.retry) : null,
    h('button', { class: 'btn wide', onclick: () => go('result', { id, sample: true }, { replace: true }) }, S.sheet.sample),
    h('button', { class: 'btn ghost wide', onclick: () => go('tiles', {}, { replace: true }) }, S.tiles.back),
  );
}

// ---- start ------------------------------------------------------------------------
go(history.state?.name === 'tiles' ? 'tiles' : 'intro', {}, { replace: true });
