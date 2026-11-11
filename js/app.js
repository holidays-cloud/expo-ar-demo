// App shell: intro -> one camera screen (recognises any of the five documents) -> results,
// plus the visitor's own card -> constellation flow.
// No tiles, no explanations, no camera-free mode for visitors, no forms.
// Booth staff can open sample results by tapping the logo several times (CONFIG.BOOTH_TAPS).
//
// Entry points of the own-card flow: the small button on the camera screen, the button
// under every result card, the third button after our card's animation, and the direct
// links ?mode=card (to print as a QR on the banner) and ?c=<code> (a personal replay link).
import { S } from './strings.fa.js';
import { CONFIG } from './config.js';
import { h, fmt, toFa, loadProgress, markDone } from './util.js';
import { DOCS } from './docs/index.js';
import { TARGET_FILE } from './docs/targets.js';

const root = document.getElementById('app');
let session = null;   // running AR controller, or own-card controller
let abort = null;     // AbortController for an AR start still in progress
let overlay = null;   // open result / booth overlay element
let refreshDotsFn = null;

document.title = S.appTitle;

// ---- navigation ---------------------------------------------------------------------
// Screens and overlays push history entries, so the phone's back button closes an overlay
// first, then goes back one screen.
window.addEventListener('popstate', (e) => {
  if (overlay) { closeOverlay(); return; }
  route(e.state || { name: 'intro' });
});
function route(state) {
  if (state.name === 'scan') showScan();
  else if (state.name === 'cardlanding') showCardLanding();
  else if (state.name === 'owncard') showOwnCard(state);
  else showIntro();
}
function go(name, extra = {}, { replace = false } = {}) {
  const state = { name, ...extra };
  if (replace) history.replaceState(state, ''); else history.pushState(state, '');
  route(state);
}

function stopSession() {
  if (abort) { abort.abort(); abort = null; }
  if (session) { try { session.stop(); } catch (e) { console.warn(e); } session = null; }
  refreshDotsFn = null;
  document.body.classList.remove('immersive');
}

function mount(el) {
  stopSession();
  closeOverlay(true);
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
  const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', 'M8 28 L20 12 L32 24'); p.setAttribute('class', 'logo-line'); svg.appendChild(p);
  [[8, 28], [20, 12], [32, 24]].forEach(([cx, cy]) => { const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 3.4); c.setAttribute('class', 'logo-dot'); svg.appendChild(c); });
  let taps = [];
  const el = h('div', { class: 'logo ' + extraClass }, svg, h('span', { class: 'logo-name' }, CONFIG.BRAND_NAME_FA));
  el.addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 3000).concat(now);
    if (taps.length >= CONFIG.BOOTH_TAPS) { taps = []; openBooth(); }
  });
  return el;
}

// ---- background preload --------------------------------------------------------------------
// After the intro shows, quietly download the AR libraries, the tracking file and the
// document code, so the first camera open is fast. Skipped when the phone asks to save data.
let preloaded = false;
function preloadAR() {
  if (preloaded) return;
  preloaded = true;
  if (navigator.connection && navigator.connection.saveData) return;
  const run = () => {
    import('./ar.js').catch(() => {});
    import('../vendor/three/three.module.min.js').catch(() => {});
    import('../vendor/mindar/mindar-image-three.prod.js').catch(() => {});
    fetch(TARGET_FILE, { cache: 'force-cache' }).then((r) => r.arrayBuffer()).catch(() => {});
    DOCS.forEach((d) => d.load().catch(() => {}));
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2500 }); else setTimeout(run, 1200);
}

// ---- 1. intro ----------------------------------------------------------------------
async function showIntro() {
  const { hasCard } = await import('./owncard.js');
  const saved = hasCard();
  mount(h('main', { class: 'screen intro' },
    logo('logo-intro'),
    h('h1', {}, S.intro.title),
    h('p', { class: 'lead' }, S.intro.body),
    h('button', { class: 'btn primary wide', onclick: () => go('scan') }, S.intro.start),
    saved ? h('button', { class: 'btn wide yours', onclick: () => go('owncard', { replay: true }) }, '✦ ', S.ownCard.yours) : null,
    h('p', { class: 'fine' }, S.intro.fine),
  ));
  preloadAR();
}

// ---- 1b. opened from the QR on the back of our card: scan the card, or your own -----------
function showCardLanding() {
  mount(h('main', { class: 'screen intro card-landing' },
    logo('logo-intro'),
    h('h1', {}, S.cardLanding.title),
    h('p', { class: 'lead' }, S.cardLanding.body),
    h('button', { class: 'btn primary wide', onclick: () => go('scan') }, S.cardLanding.scanCard),
    h('button', { class: 'btn wide yours', onclick: () => go('owncard') }, '✦ ', S.cardLanding.ownCard),
    h('p', { class: 'fine' }, S.intro.fine),
  ));
  preloadAR();
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
  const view = h('div', { class: 'stage-view' });
  const hint = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  const actions = h('div', { class: 'stage-actions' });
  const dotsWrap = h('div', { class: 'stage-progress' }, progressDots());
  const el = h('main', { class: 'stage' },
    view,
    h('div', { class: 'stage-top' },
      logo('logo-stage'),
      dotsWrap,
      h('button', { class: 'btn pill', onclick: () => go('owncard') }, h('span', { 'aria-hidden': 'true' }, '✦ '), S.ownCard.camButton),
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
  const slowTimer = setTimeout(() => setHint(S.scan.slow, true), 9000);
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
          if (s === 'rotate') setHint(S.scan.rotate);
        },
        onDone: async (docId) => {
          if (docId === 'doc5' || docId === 'doc6') {
            // our business card: save contact + own card (the links are pinned on the card)
            markDone(docId); refreshDots();
            const mod = await DOCS.find((d) => d.id === docId).load();
            actions.replaceChildren(h('div', { class: 'card-actions' }, mod.cardActions({ onTryOwnCard: () => go('owncard') })));
            return;
          }
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
      showCameraHelp(e.code || 'failed', () => showScan());
    }
  })();
}

// ---- result overlay (after a scan, from a progress dot, or from the booth menu) --------
// replace: swap the open overlay's content without adding a history entry.
function openResult(docId, { fromScan = false, sample = false, replace = false } = {}) {
  const doc = DOCS.find((d) => d.id === docId);
  const body = h('div', { class: 'result-body' }, h('p', { class: 'hint busy' }, S.scan.loading));
  const head = h('div', { class: 'result-head' });
  const foot = h('div', { class: 'result-foot' });
  const panel = h('section', { class: 'overlay result', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'overlay-inner' }, head, body, foot));
  showOverlay(panel, { fromScan, docId }, replace);
  const tryOwn = () => { closeOverlay(true); go('owncard', {}, { replace: true }); };
  doc.load().then((mod) => {
    head.replaceChildren(h('p', { class: 'kicker' }, S.docs[docId]), h('h2', {}, mod.resultTitle()), h('p', { class: 'lead' }, mod.resultSub()));
    if (mod.kind === 'card') {
      body.replaceChildren(mod.renderResult({ onTryOwnCard: tryOwn }));
      foot.replaceChildren(h('button', { class: 'btn ghost wide', onclick: () => history.back() }, S.result.close));
      return;
    }
    body.replaceChildren(mod.renderResult());
    const allDone = DOCS.every((d) => loadProgress().done[d.id]);
    foot.replaceChildren(...[
      h('p', { class: 'prepared' }, S.result.prepared),
      !sample && allDone ? h('p', { class: 'lead center' }, S.result.allDone) : null,
      h('button', { class: 'btn primary wide', onclick: () => history.back() }, sample || allDone ? S.result.close : S.result.next),
      h('button', { class: 'btn wide', onclick: tryOwn }, h('span', { 'aria-hidden': 'true' }, '✦ '), S.result.tryOwn),
    ].filter(Boolean)); // (native replaceChildren would print a null as the text "null")
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
      h('button', { class: 'btn wide', onclick: () => openCardDemo('doc5') }, '✦ ', S.booth.cardDemo),
      h('button', { class: 'btn wide', onclick: () => openCardDemo('doc6') }, '✦ ', S.booth.cardDemo2),
      h('button', { class: 'btn ghost wide', onclick: () => history.back() }, S.booth.close),
    ));
  showOverlay(panel, null, false);
}

// Booth only: our card's animation played on screen (no camera), with the card itself
// drawn underneath, then the same three buttons as after a real scan.
async function openCardDemo(docId = 'doc5') {
  const view = h('div', { class: 'demo-view' });
  const actions = h('div', { class: 'stage-actions demo-actions' });
  const panel = h('section', { class: 'overlay demo', role: 'dialog', 'aria-modal': 'true' },
    view, h('button', { class: 'btn round demo-close', 'aria-label': S.scan.close, onclick: () => history.back() }, '×'),
    h('div', { class: 'stage-bottom' }, actions));
  showOverlay(panel, null, true);
  const [THREE, mod] = await Promise.all([import('../vendor/three/three.module.min.js'), DOCS.find((d) => d.id === docId).load()]);
  if (overlay !== panel) return;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  const anim = await mod.createScene(THREE, { mode: 'ar', renderer });
  // the "real" card under the animation
  const tex = await new Promise((res) => new THREE.TextureLoader().load(new URL(`../img/${docId}.jpg`, import.meta.url).href, res));
  tex.colorSpace = THREE.SRGBColorSpace;
  const H = anim.pageH;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, H), new THREE.MeshBasicMaterial({ map: tex }));
  card.renderOrder = 0;
  scene.add(card, anim.group);
  const fit = () => {
    const w = view.clientWidth, hh = view.clientHeight;
    renderer.setSize(w, hh);
    camera.aspect = w / hh;
    const v = (camera.fov * Math.PI) / 180, d = Math.max((H * 1.25) / 2 / Math.tan(v / 2), 1.25 / 2 / Math.tan(v / 2) / camera.aspect);
    camera.position.set(0, -d * 0.12, d); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  };
  fit();
  window.addEventListener('resize', fit);
  const t0 = performance.now();
  let done = false;
  renderer.setAnimationLoop(() => {
    const t = (performance.now() - t0) / 1000;
    anim.update(t);
    if (!done && t >= anim.duration) { done = true; actions.replaceChildren(h('div', { class: 'card-actions' }, mod.cardActions({ links: true, onTryOwnCard: () => { closeOverlay(true); go('owncard', {}, { replace: true }); } }))); }
    renderer.render(scene, camera);
  });
  panel._dispose = () => { renderer.setAnimationLoop(null); window.removeEventListener('resize', fit); anim.dispose(); tex.dispose(); card.geometry.dispose(); card.material.dispose(); renderer.dispose(); };
}

// Each overlay owns one history entry; its close button calls history.back(), and the
// popstate handler closes it (so the phone's back button behaves the same way).
function showOverlay(panel, info, replace) {
  const wasOpen = !!overlay;
  if (overlay) { if (overlay._dispose) overlay._dispose(); overlay.remove(); overlay = null; }
  if (session && session.pause) session.pause();
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
  if (overlay._dispose) overlay._dispose();
  overlay.remove();
  overlay = null;
  document.body.classList.remove('has-overlay');
  if (silent || !session || !session.resume) return;
  if (info && info.fromScan && session.reset) session.reset(info.docId); // scanning the same page again replays it
  session.resume();
  if (refreshDotsFn) refreshDotsFn();
}

// ---- 3. the visitor's own card: it comes apart and is put back together ----------------
async function showOwnCard(state = {}) {
  const oc = await import('./owncard.js');
  const stage = h('main', { class: 'stage owncard' });
  mount(stage);
  document.body.classList.add('immersive');
  const top = h('div', { class: 'stage-top' }, logo('logo-stage'), h('span'), h('button', { class: 'btn round', 'aria-label': S.scan.close, onclick: () => history.back() }, '×'));

  // Replay the card kept on this phone
  if (state.replay) {
    const photo = await oc.recallCard();
    if (!stage.isConnected) return;
    if (photo) { animate(stage, top, photo); return; }
  }

  // Capture: live camera with a card-shaped frame
  const video = h('video', { class: 'oc-video', playsinline: true, muted: true, autoplay: true });
  const frame = h('div', { class: 'card-frame' }, h('i', { class: 'c1' }), h('i', { class: 'c2' }), h('i', { class: 'c3' }), h('i', { class: 'c4' }));
  const hint = h('p', { class: 'hint busy' }, S.ownCard.starting);
  const shot = h('button', { class: 'shutter', 'aria-label': S.ownCard.capture, disabled: true });
  stage.replaceChildren(video, frame, top, h('div', { class: 'stage-bottom' }, hint, shot, h('p', { class: 'fine on-dark' }, S.ownCard.privacy)));
  let stopCam = null;
  session = { stop() { if (stopCam) stopCam(); stopCam = null; } };
  try {
    stopCam = await oc.openCamera(video);
  } catch (e) {
    if (!stage.isConnected) return; // the visitor already left this screen
    console.warn('camera failed', e);
    showCameraHelp(e.code || 'failed', () => showOwnCard(state));
    return;
  }
  if (!stage.isConnected) { stopCam(); return; }
  hint.classList.remove('busy'); hint.textContent = S.ownCard.hint;
  shot.disabled = false;
  shot.addEventListener('click', () => {
    const photo = oc.captureFrame(video, frame.getBoundingClientRect());
    stopCam(); stopCam = null;
    oc.rememberCard(photo);
    history.replaceState({ name: 'owncard', replay: true }, ''); // back/refresh replays instead of reopening the camera
    animate(stage, top, photo);
  }, { once: true });
}

async function animate(stage, top, photo) {
  const { playCardRebuild } = await import('./card-rebuild.js');
  const sky = h('div', { class: 'sky' });
  const actions = h('div', { class: 'stage-actions oc-actions' });
  stage.replaceChildren(sky, top, h('div', { class: 'stage-bottom' }, actions));
  if (session) session.stop();
  const text = { title: S.ownCard.title, posterTitle: S.ownCard.posterTitle, tagline: S.ownCard.tagline };
  const ctrl = playCardRebuild(sky, { photo, brandName: CONFIG.BRAND_NAME_FA, text, onDone: () => showActions() });
  session = ctrl;
  function showActions() {
    actions.replaceChildren(
      h('div', { class: 'oc-row' },
        h('button', { class: 'btn primary', onclick: async () => saveBlob(await ctrl.poster(), 'my-card.png') }, S.ownCard.saveImage),
        h('button', { class: 'btn', onclick: () => animate(stage, top, photo) }, S.ownCard.replay)),
      h('div', { class: 'oc-row' },
        h('button', { class: 'btn ghost', onclick: () => go('owncard', {}, { replace: true }) }, S.ownCard.again),
        h('button', { class: 'btn ghost', onclick: () => go('scan', {}, { replace: true }) }, S.ownCard.backToCamera)),
    );
  }
}

async function saveBlob(blob, name) {
  const file = (() => { try { return new File([blob], name, { type: blob.type }); } catch (e) { return null; } })();
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// ---- camera unavailable / denied: one plain screen ---------------------------------
function showCameraHelp(code, retry) {
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
    h('button', { class: 'btn primary wide', onclick: () => (retry ? retry() : showScan()) }, S.cameraHelp.retry),
  ));
}

// ---- start ----------------------------------------------------------------------------
// ?mode=card opens the own-card camera (old ?c= constellation links do the same).
{
  const params = new URLSearchParams(location.search);
  history.replaceState({ name: 'intro' }, '');
  if (params.get('mode') === 'card' || params.get('c')) go('owncard');
  else if (params.get('from') === 'card') go('cardlanding', {}, { replace: true });
  else showIntro();
}
