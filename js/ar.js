// Camera (AR) mode: one camera screen that recognises whichever banner document it sees.
// MindAR + three.js are downloaded only when this runs.
//
// runAR(container, hooks) -> Promise<controller | null>
//   hooks.docs              [{id, targetIndex, load}] (js/docs/index.js)
//   hooks.onStatus(state)   'loading' | 'scanning' | 'preparing' | 'tracking' | 'lost'
//   hooks.onDone(docId)     the document's animation reached its end
//   hooks.signal            AbortSignal (visitor left the screen while starting)
// Throws an Error whose .code is 'denied' | 'unsupported' | 'insecure' | 'load' | 'failed'.
//
// controller: pause() / resume() (while a result is shown), reset(docId), stop()
import { TARGET_FILE } from './docs/targets.js';

// ---- Steadiness settings ----------------------------------------------------------
// Two layers smooth the overlay, plus finer tracking (tools/vendor.mjs TRACKING_KEYFRAME = 0,
// i.e. MindAR follows a 256 px copy of the page instead of 128 px). Measurements: CLAUDE.md.
//
// 1) MindAR's own One-Euro filter on the tracked pose.
//    Lower FILTER_MIN_CF = steadier when still; lower FILTER_BETA = slower to follow motion.
//    MindAR defaults: 0.001 / 1000.
const FILTER_MIN_CF = 0.001;
const FILTER_BETA = 1;
//    Frames the page must be tracked before the overlay appears (default 5), and frames it
//    may be missed before the overlay hides (default 5). A higher miss tolerance stops the
//    overlay blinking when tracking drops for a moment.
const WARMUP_TOLERANCE = 6;
const MISS_TOLERANCE = 10;
//
// 2) Our pose "lock" on top: while the change is within a small tolerance (phone held
//    still, only jitter) the overlay barely moves; real movement is followed quickly.
const LOCK_POS = 0.009;          // 0.9 % of the page width
const LOCK_ANGLE = 0.9 * Math.PI / 180;
const LOCK_SLOW = 0.5;           // follow speed inside the tolerance (per second)
const LOCK_FAST = 25;            // follow speed for real movement (per second, ~40 ms)

// Automated tests may override the settings above (never set on the real site).
const TUNE = (typeof window !== 'undefined' && window.__AR_TUNE) || {};

// ---- On-screen labels ----------------------------------------------------------------
// Short labels and callouts are drawn as normal page text (15 px / 13 px, set in app.css),
// pinned to a point on the paper, so they stay readable however far the paper is. A scene
// declares them as `labels: [{x, y, title, sub, warn}]` (x/y in page units) and returns
// their visibility with `labelAlpha(t)`. Boxes are kept inside the screen; a box that would
// cover another visible one is hidden rather than shrunk.
const LABEL_TOP_SAFE = 76, LABEL_BOTTOM_SAFE = 130, LABEL_GAP = 16;
function makeLabelLayer(container) {
  const layer = document.createElement('div');
  layer.className = 'ar-labels';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ar-leaders');
  layer.appendChild(svg);
  container.appendChild(layer);
  return { layer, svg };
}
function buildLabels(L, labels) {
  return labels.map((lb) => {
    if (lb.hit) { // invisible tap area exactly over a part of the paper (the card's contact rows)
      const a = document.createElement('a');
      a.className = 'ar-hit'; a.href = lb.href; a.setAttribute('aria-label', lb.title);
      if (!lb.href.startsWith('tel:')) { a.target = '_blank'; a.rel = 'noopener'; }
      L.layer.appendChild(a);
      return { box: a, dot: document.createElement('i'), line: document.createElementNS('http://www.w3.org/2000/svg', 'line'), hit: true };
    }
    // a label with href is a tappable link pinned on the paper
    const box = document.createElement(lb.href ? 'a' : 'div');
    box.className = 'ar-label' + (lb.warn ? ' warn' : '') + (lb.href ? ' ar-link ar-link-' + (lb.link || '') : '');
    if (lb.href) { box.href = lb.href; if (!lb.href.startsWith('tel:')) { box.target = '_blank'; box.rel = 'noopener'; } }
    const t = document.createElement('span'); t.className = 't'; t.textContent = lb.title; box.appendChild(t);
    if (lb.sub) { const s = document.createElement('span'); s.className = 's'; s.textContent = lb.sub; box.appendChild(s); }
    const dot = document.createElement('i'); dot.className = 'ar-dot' + (lb.warn ? ' warn' : '');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'ar-leader' + (lb.warn ? ' warn' : ''));
    L.layer.appendChild(dot); L.layer.appendChild(box); L.svg.appendChild(line);
    if (lb.center) { dot.style.display = 'none'; line.style.display = 'none'; }
    return { box, dot, line, w: 0, h: 0, center: !!lb.center };
  });
}
function removeLabels(els) { (els || []).forEach((e) => { e.box.remove(); e.dot.remove(); e.line.remove(); }); }
function hideLabels(els) { (els || []).forEach((e) => { if (e.hit) e.box.style.display = 'none'; e.box.style.opacity = e.hit ? '' : '0'; e.dot.style.opacity = '0'; e.line.style.opacity = '0'; }); }
function placeLabels(els, anchors, alphas, W, H) {
  // tap areas follow the projected rectangle of their part of the paper
  els.forEach((e, i) => {
    if (!e.hit) return;
    const a = anchors[i];
    if (!a || alphas[i] < 0.5) { e.box.style.display = 'none'; return; }
    e.box.style.display = 'block';
    e.box.style.transform = `translate(${Math.round(a.l)}px, ${Math.round(a.t)}px)`;
    e.box.style.width = Math.round(a.r - a.l) + 'px'; e.box.style.height = Math.round(a.b - a.t) + 'px';
  });
  els = els.map((e) => (e.hit ? { ...e, skip: true } : e));
  const placed = [];
  const order = alphas.map((a, i) => i).filter((i) => !els[i].skip && alphas[i] > 0.01 && anchors[i]).sort((a, b) => (els[b].center - els[a].center) || alphas[b] - alphas[a] || (els[a].center ? a - b : b - a));
  const shown = new Set();
  for (const i of order) {
    const e = els[i], [ax, ay] = anchors[i];
    if (!e.w) { e.w = e.box.offsetWidth; e.h = e.box.offsetHeight; }
    const w = e.w, h = e.h;
    const cx = Math.max(8 + w / 2, Math.min(W - 8 - w / 2, ax));
    if (e.center) { // centred on its point (link rows); if it would overlap, stack below the previous one
      let t = Math.max(LABEL_TOP_SAFE, Math.min(H - LABEL_BOTTOM_SAFE - h, ay - h / 2));
      for (const p of placed) if (cx - w / 2 < p.r && cx + w / 2 > p.l && t < p.b && t + h > p.t) t = p.b + 4;
      placed.push({ l: cx - w / 2 - 4, r: cx + w / 2 + 4, t: t - 4, b: t + h + 4 });
      shown.add(i);
      e.box.style.transform = `translate(${Math.round(cx - w / 2)}px, ${Math.round(t)}px)`;
      e.box.style.opacity = String(alphas[i]);
      e.box.style.pointerEvents = alphas[i] > 0.5 ? 'auto' : 'none';
      continue;
    }
    const tries = [ay - LABEL_GAP - h, ay + LABEL_GAP];
    let top = null;
    for (const t0 of tries) {
      const t = Math.max(LABEL_TOP_SAFE, Math.min(H - LABEL_BOTTOM_SAFE - h, t0));
      const r = { l: cx - w / 2 - 4, r: cx + w / 2 + 4, t: t - 4, b: t + h + 4 };
      if (!placed.some((p) => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t)) { top = t; placed.push(r); break; }
    }
    if (top === null) continue; // no room without covering another label: skip it for now
    shown.add(i);
    const a = alphas[i];
    e.box.style.transform = `translate(${Math.round(cx - w / 2)}px, ${Math.round(top)}px)`;
    e.box.style.opacity = String(a);
    e.dot.style.transform = `translate(${Math.round(ax - 5)}px, ${Math.round(ay - 5)}px)`;
    e.dot.style.opacity = String(a);
    const ly = top > ay ? top : top + h;
    e.line.setAttribute('x1', ax); e.line.setAttribute('y1', ay); e.line.setAttribute('x2', cx); e.line.setAttribute('y2', ly);
    e.line.style.opacity = String(a * 0.9);
  }
  els.forEach((e, i) => { if (!e.skip && !shown.has(i)) { e.box.style.opacity = '0'; e.dot.style.opacity = '0'; e.line.style.opacity = '0'; } });
}

const fail = (code, cause) => Object.assign(new Error(code), { code, cause });

/**
 * Ask for the camera ourselves first. MindAR swallows the browser's error, so this is how
 * we tell "permission denied" apart from "no camera". The stream is closed straight away;
 * MindAR then reopens it without a second prompt.
 */
async function probeCamera() {
  if (!window.isSecureContext) throw fail('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw fail('unsupported');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw fail('denied', e);
    if (e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError' || e.name === 'NotReadableError')) throw fail('unsupported', e);
    throw fail('failed', e);
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

/** Keeps the overlay locked while only jitter is present (see settings above). */
function makeSmoother(THREE) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const rp = new THREE.Vector3(), rq = new THREE.Quaternion(), rs = new THREE.Vector3();
  let ready = false;
  const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return {
    reset() { ready = false; },
    apply(raw, dt, out) {
      raw.decompose(rp, rq, rs);
      if (!ready) { p.copy(rp); q.copy(rq); s.copy(rs); ready = true; }
      else {
        const width = Math.abs(rs.x) || 1; // anchor scale = page width in camera units
        const lp = TUNE.lockPos ?? LOCK_POS, la = TUNE.lockAngle ?? LOCK_ANGLE, ls = TUNE.lockSlow ?? LOCK_SLOW, lf = TUNE.lockFast ?? LOCK_FAST;
        const motion = Math.max(rp.distanceTo(p) / width / lp, q.angleTo(rq) / la);
        const speed = ls + (lf - ls) * smoothstep(0.6, 3, motion);
        const a = 1 - Math.exp(-speed * dt);
        p.lerp(rp, a); q.slerp(rq, a); s.lerp(rs, a);
      }
      out.compose(p, q, s);
    },
  };
}

export async function runAR(container, hooks = {}) {
  const status = (s) => hooks.onStatus && hooks.onStatus(s);
  const aborted = () => hooks.signal && hooks.signal.aborted;
  status('loading');

  // Download libraries while the camera permission prompt is open.
  const libs = Promise.all([
    import('../vendor/three/three.module.min.js'),
    import('../vendor/mindar/mindar-image-three.prod.js'),
  ]).catch((e) => { throw fail('load', e); });
  libs.catch(() => {});
  // Fetch the documents' code early too (small).
  hooks.docs.forEach((d) => d.load().catch(() => {}));

  await probeCamera();
  const [THREE, { MindARThree }] = await libs;
  if (aborted()) return null;

  const mindar = new MindARThree({
    container,
    imageTargetSrc: TARGET_FILE,
    maxTrack: 1,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no', // we draw our own UI
    filterMinCF: TUNE.minCF ?? FILTER_MIN_CF, filterBeta: TUNE.beta ?? FILTER_BETA,
    warmupTolerance: TUNE.warmup ?? WARMUP_TOLERANCE, missTolerance: TUNE.miss ?? MISS_TOLERANCE,
  });
  const { renderer, scene, camera } = mindar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const labelLayer = makeLabelLayer(container);
  const tmpV = new THREE.Vector3();
  let rotateShown = false;

  // One anchor per document; the visible content lives in a separate, smoothed group.
  const slots = hooks.docs.map((doc) => {
    const anchor = mindar.addAnchor(doc.targetIndex);
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    holder.visible = false;
    scene.add(holder);
    return { doc, anchor, holder, smoother: makeSmoother(THREE), anim: null, loading: null, t: 0, done: false };
  });

  let current = null, paused = false, stopped = false, last = performance.now();

  function disposeAnim(slot) {
    removeLabels(slot.labelEls); slot.labelEls = null;
    if (slot.anim) { slot.holder.remove(slot.anim.group); slot.anim.dispose(); }
    slot.anim = null; slot.loading = null; slot.t = 0; slot.done = false;
  }

  async function prepare(slot) {
    if (slot.anim || slot.loading) return;
    slot.loading = (async () => {
      const mod = await slot.doc.load();
      const anim = await mod.createScene(THREE, { mode: 'ar', renderer });
      if (stopped || slot.loading === null) { anim.dispose(); return; }
      slot.anim = anim;
      slot.pageH = anim.pageH || 297 / 210; // page height in page-width units
      slot.holder.add(anim.group);
      if (anim.labels && anim.labels.length) slot.labelEls = buildLabels(labelLayer, anim.labels);
    })().catch((e) => { console.warn('scene failed', e); slot.loading = null; });
  }

  slots.forEach((slot) => {
    slot.anchor.onTargetFound = () => {
      if (paused || stopped) return;
      if (current && current !== slot) disposeAnim(current); // free memory of the previous page
      current = slot;
      slot.smoother.reset();
      last = performance.now();
      if (!slot.anim) { status('preparing'); prepare(slot); } else status('tracking');
    };
    slot.anchor.onTargetLost = () => {
      rotateShown = false;
      if (current === slot && !paused) status('lost');
    };
  });

  const controller = {
    pause() { paused = true; renderer.domElement.style.visibility = 'hidden'; },
    resume() { paused = false; renderer.domElement.style.visibility = ''; last = performance.now(); status(current && current.anchor.visible ? 'tracking' : 'scanning'); },
    reset(docId) { const s = slots.find((x) => x.doc.id === docId); if (s) disposeAnim(s); if (current && current.doc.id === docId) current = null; },
    stop() {
      if (stopped) return;
      stopped = true;
      renderer.setAnimationLoop(null);
      try { mindar.stop(); } catch (e) { /* camera never started */ }
      mindar.video = null; // MindAR keeps a resize listener; this makes it a no-op
      slots.forEach(disposeAnim);
      renderer.dispose();
      container.replaceChildren();
    },
  };

  try {
    await mindar.start();
  } catch (e) {
    controller.stop();
    throw fail('failed', e);
  }
  if (aborted()) { controller.stop(); return null; }
  status('scanning');

  const dbg = window.__AR_DEBUG; // only set by automated tests
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000); // clamp big gaps (tab switch)
    last = now;
    for (const slot of slots) {
      // MindAR keeps group.visible true through short tracking drops (MISS_TOLERANCE)
      const visible = !paused && slot === current && slot.anchor.group.visible && !!slot.anim;
      slot.holder.visible = visible;
      if (!visible) { hideLabels(slot.labelEls); continue; }
      if (TUNE.lock === false) slot.holder.matrix.copy(slot.anchor.group.matrix);
      else slot.smoother.apply(slot.anchor.group.matrix, dt, slot.holder.matrix);
      slot.holder.matrixWorldNeedsUpdate = true;
      if (slot.t === 0) status('tracking');
      slot.t += dt;
      // page and screen size in CSS px, for scenes that adapt text size to the screen
      slot.holder.updateMatrixWorld(true);
      const W = container.clientWidth, H = container.clientHeight;
      const toScreen = (x, y) => { tmpV.set(x, y, 0).applyMatrix4(slot.holder.matrixWorld).project(camera); return tmpV.z < 1 ? [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H] : null; };
      const pa = toScreen(-0.5, 0), pb = toScreen(0.5, 0), pc = toScreen(0, -slot.pageH / 2), pd = toScreen(0, slot.pageH / 2);
      const view = pa && pb && pc && pd ? { pageW: Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), pageH: Math.hypot(pd[0] - pc[0], pd[1] - pc[1]), screenW: W, screenH: H } : null;
      slot.anim.update(slot.t, view);
      const rectToScreen = (r) => { const c = [toScreen(r[0], r[1]), toScreen(r[2], r[1]), toScreen(r[2], r[3]), toScreen(r[0], r[3])]; if (c.some((q) => !q)) return null; const xs = c.map((q) => q[0]), ys = c.map((q) => q[1]); return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }; };
      if (slot.labelEls) placeLabels(slot.labelEls, slot.anim.labels.map((lb) => (lb.rect ? rectToScreen(lb.rect) : toScreen(lb.x, lb.y))), slot.anim.labelAlpha(slot.t), W, H);
      const wantRotate = !!slot.anim.prefersPortrait && W > H * 1.15;
      if (wantRotate !== rotateShown) { rotateShown = wantRotate; status(wantRotate ? 'rotate' : 'tracking'); }
      if (!slot.done && slot.t >= slot.anim.duration) { slot.done = true; hooks.onDone && hooks.onDone(slot.doc.id); }
      if (dbg) dbg.push({ t: now, doc: slot.doc.id, raw: slot.anchor.group.matrix.elements.slice(), stable: slot.holder.matrix.elements.slice(), proj: camera.projectionMatrix.elements.slice(), unf: unfiltered(slot) });
    }
    renderer.render(scene, camera);
  });

  // Test-only: the pose before any filtering, to measure how much lag smoothing adds.
  function unfiltered(slot) {
    const st = mindar.controller.trackingStates[slot.doc.targetIndex];
    if (!st || !st.currentModelViewTransform) return null;
    const m = new THREE.Matrix4();
    m.elements = [...mindar.controller.getWorldMatrix(st.currentModelViewTransform, slot.doc.targetIndex)];
    m.multiply(mindar.postMatrixs[slot.doc.targetIndex]);
    return m.elements.slice();
  }

  return controller;
}
