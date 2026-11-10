// App shell: intro -> one camera screen (recognises any of the four documents) -> results.
// No tiles, no explanations, no camera-free mode for visitors.
// Booth staff can open sample results by tapping the logo several times (CONFIG.BOOTH_TAPS).
import { S } from './strings.fa.js';
import { CONFIG } from './config.js';
import { h, fmt, toFa, loadProgress, markDone } from './util.js';
import { DOCS } from './docs/index.js';

const root = document.getElementById('app');
let session = null;   // running AR controller
let abort = null;     // AbortController for an AR start still in progress
let overlay = null;   // open result / booth overlay element

document.title = S.appTitle;

// ---- navigation ---------------------------------------------------------------------
// The camera screen and each overlay push a history entry, so the phone's back button
// closes an overlay first, then leaves the camera.
window.addEventListener('popstate', (e) => {
  if (overlay) { closeOverlay(); return; }
  const name = e.state && e.state.name;
  if (name === 'scan') showScan(false); else showIntro();
});

function stopSession() {
  if (abort) { abort.abort(); abort = null; }
  if (session) { try { session.stop(); } catch (e) { console.warn(e); } session = null; }
  document.body.classList.remove('immersive');
}

function mount(el) {
  stopSession();
  root.replaceChildren(el);
  window.scrollTo(0, 0);
}

// ---- logo (also the hidden booth gesture) -------------------------------------------
function logo(extraClass = '') {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  // Placeholder mark: three ordered points (replace with the real logo later).
  [['M8 28 L20 12 L32 24', 'none']].forEach(([d]) => { const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', d); p.setAttribute('class', 'logo-line'); svg.appendChild(p); });
  [[8, 28], [20, 12], [32, 24]].forEach(([cx, cy]) => { const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 3.4); c.setAttribute('class', 'logo-dot'); svg.appendChild(c); });
  let taps = [];
  const el = h('div', { class: 'logo ' + extraClass },
    svg, h('span', { class: 'logo-name' }, CONFIG.BRAND_NAME_FA));
  el.addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 3000).concat(now);
    if (taps.length >= CONFIG.BOOTH_TAPS) { taps = []; openBooth(); }
  });
  return el;
}

// ---- 1. intro ----------------------------------------------------------------------
function showIntro() {
  closeOverlay(true);
  mount(h('main', { class: 'screen intro' },
    logo('logo-intro'),
    h('h1', {}, S.intro.title),
    h('p', { class: 'lead' }, S.intro.body),
    h('button', { class: 'btn primary wide', onclick: () => { history.pushState({ name: 'scan' }, ''); showScan(true); } }, S.intro.start),
    h('p', { class: 'fine' }, S.intro.fine),
  ));
}

// ---- 2. camera screen -----------------------------------------------------------------
function progressDots() {
  const p = loadProgress();
  const done = DOCS.filter((d) => p.done[d.id]).length;
  return h('div', { class: 'dots-progress', 'aria-label': fmt(S.scan.progress, { done: toFa(done), total: toFa(DOCS.length) }) },
    DOCS.map((d) => p.done[d.id]
      ? h('button', { class: 'pdot filled', 'aria-label': S.docs[d.id], onclick: () => openResult(d.id) })
      : h('span', { class: 'pdot' })),
  );
}

function showScan() {
  document.body.classList.add('immersive');
  const view = h('div', { class: 'stage-view' });
  const hint = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  const actions = h('div', { class: 'stage-actions' });
  const dotsWrap = h('div', { class: 'stage-progress' }, progressDots());
  const el = h('main', { class: 'stage' },
    view,
    h('div', { class: 'stage-top' },
      logo('logo-stage'),
      dotsWrap,
      h('button', { class: 'btn round', 'aria-label': S.scan.close, onclick: () => history.back() }, '×'),
    ),
    h('div', { class: 'stage-bottom' }, hint, actions),
  );
  const setHint = (text, busy = false) => { hint.textContent = text || ''; hint.classList.toggle('busy', busy); hint.hidden = !text; };
  const refreshDots = () => dotsWrap.replaceChildren(progressDots());
  mount(el);
  document.body.classList.add('immersive');

  const myAbort = new AbortController();
  abort = myAbort;
  let slowTimer = setTimeout(() => setHint(S.scan.slow, true), 9000);
  let holdTimer = null;
  const armHold = () => { clearTimeout(holdTimer); holdTimer = setTimeout(() => setHint(S.scan.hold), 12000); };
  myAbort.signal.addEventListener('abort', () => { clearTimeout(slowTimer); clearTimeout(holdTimer); });
  setHint(S.scan.loading, true);

  (async () => {
    try {
      const { runAR } = await import('./ar.js');
      const ctrl = await runAR(view, {
        docs: DOCS,
        signal: myAbort.signal,
        onStatus: (s) => {
          if (s === 'loading') return;
          clearTimeout(slowTimer);
          if (s === 'scanning') { setHint(S.scan.point); actions.replaceChildren(); armHold(); }
          if (s === 'preparing') { clearTimeout(holdTimer); setHint(S.scan.loading, true); }
          if (s === 'tracking') { clearTimeout(holdTimer); setHint(''); }
          if (s === 'lost') { setHint(S.scan.lost); armHold(); }
        },
        onDone: (docId) => {
          actions.replaceChildren(h('button', { class: 'btn primary', onclick: () => {
            markDone(docId);
            refreshDots();
            actions.replaceChildren();
            openResult(docId, { fromScan: true });
          } }, S.scan.viewResult));
        },
      });
      if (!ctrl || myAbort.signal.aborted) { ctrl && ctrl.stop(); return; }
      session = ctrl;
      abort = null;
      refreshDotsFn = refreshDots;
      if (overlay) ctrl.pause(); // e.g. booth menu opened while the camera was starting
    } catch (e) {
      clearTimeout(slowTimer);
      if (myAbort.signal.aborted) return;
      console.warn('AR failed', e);
      showCameraHelp(e.code || 'failed');
    }
  })();
}

// ---- result overlay (after a scan, from a progress dot, or from the booth menu) --------
// replace: swap the open overlay's content without adding a history entry.
function openResult(docId, { fromScan = false, sample = false, replace = false } = {}) {
  const doc = DOCS.find((d) => d.id === docId);
  const body = h('div', { class: 'result-body' }, h('p', { class: 'hint busy' }, S.scan.loading));
  const head = h('div', { class: 'result-head' });
  const allDone = DOCS.every((d) => loadProgress().done[d.id]);
  const panel = h('section', { class: 'overlay result', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'overlay-inner' },
      head, body,
      h('p', { class: 'prepared' }, S.result.prepared),
      !sample && allDone ? h('p', { class: 'lead center' }, S.result.allDone) : null,
      h('button', { class: 'btn primary wide', onclick: () => history.back() }, sample || allDone ? S.result.close : S.result.next),
    ));
  showOverlay(panel, { fromScan, docId }, replace);
  doc.load().then((mod) => {
    head.replaceChildren(h('p', { class: 'kicker' }, S.docs[docId]), h('h2', {}, mod.resultTitle()), h('p', { class: 'lead' }, mod.resultSub()));
    body.replaceChildren(mod.renderResult());
  }).catch(() => body.replaceChildren(h('p', { class: 'hint' }, S.cameraHelp.network)));
}

// ---- hidden booth menu: sample results without scanning ----------------------------
function openBooth() {
  if (overlay) return;
  const panel = h('section', { class: 'overlay booth', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'overlay-inner' },
      h('h2', {}, S.booth.title),
      h('p', { class: 'fine' }, S.booth.note),
      DOCS.map((d) => h('button', { class: 'btn wide', onclick: () => openResult(d.id, { sample: true, replace: true }) }, S.docs[d.id])),
      h('button', { class: 'btn ghost wide', onclick: () => history.back() }, S.booth.close),
    ));
  showOverlay(panel, null, false);
}

// Each overlay owns one history entry; its close button calls history.back(), and the
// popstate handler closes it (so the phone's back button behaves the same way).
function showOverlay(panel, info, replace) {
  const wasOpen = !!overlay;
  if (overlay) { overlay.remove(); overlay = null; }
  if (session) session.pause();
  overlay = panel;
  overlay._info = info;
  document.body.appendChild(panel);
  document.body.classList.add('has-overlay');
  if (!(replace && wasOpen)) history.pushState({ ...(history.state || {}), overlay: true }, '');
  panel.querySelector('button')?.focus({ preventScroll: true });
}
function closeOverlay(silent = false) {
  if (!overlay) return;
  const info = overlay._info;
  overlay.remove();
  overlay = null;
  document.body.classList.remove('has-overlay');
  if (silent || !session) return;
  if (info && info.fromScan) session.reset(info.docId); // scanning the same page again replays it
  session.resume();
  if (refreshDotsFn) refreshDotsFn();
}
let refreshDotsFn = null;

// ---- camera unavailable / denied: one plain screen ---------------------------------
function showCameraHelp(code) {
  const network = code === 'load';
  const title = network ? S.cameraHelp.titleNetwork : code === 'denied' ? S.cameraHelp.titleDenied : S.cameraHelp.titleUnavailable;
  mount(h('main', { class: 'screen narrow help' },
    logo('logo-intro'),
    h('h2', {}, title),
    network ? h('p', { class: 'lead' }, S.cameraHelp.network) : [
      h('p', { class: 'lead' }, S.cameraHelp.intro),
      h('ol', { class: 'steps' }, S.cameraHelp.steps.map((s, i) => h('li', {}, h('span', { class: 'step-n' }, toFa(i + 1)), h('span', {}, s)))),
      h('p', { class: 'lead' }, S.cameraHelp.inApp),
    ],
    h('p', { class: 'staff' }, S.cameraHelp.staff),
    h('button', { class: 'btn primary wide', onclick: () => showScan() }, S.cameraHelp.retry),
  ));
}

// ---- start ----------------------------------------------------------------------------
history.replaceState({ name: 'intro' }, '');
showIntro();
