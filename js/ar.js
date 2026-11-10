// Camera (AR) mode. MindAR + three.js are downloaded only when this runs.
//
// runAR(docModule, container, hooks) -> Promise<controller>
//   hooks.onStatus(state)  'loading' | 'scanning' | 'tracking' | 'lost' | 'notfound'
//   hooks.onDone()         animation reached the end (result can be shown)
// Throws an Error whose .code is 'denied' | 'unsupported' | 'insecure' | 'load' | 'failed'.

const fail = (code, cause) => Object.assign(new Error(code), { code, cause });

/**
 * Ask for the camera ourselves first. MindAR swallows the browser's error, so this
 * is how we tell "permission denied" apart from "no camera". The stream is closed
 * straight away; MindAR then reopens it without a second prompt.
 */
async function probeCamera() {
  if (!window.isSecureContext) throw fail('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw fail('unsupported');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw fail('denied', e);
    if (e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')) throw fail('unsupported', e);
    throw fail('failed', e);
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export async function runAR(doc, container, hooks = {}) {
  const status = (s) => hooks.onStatus && hooks.onStatus(s);
  status('loading');

  // Download libraries while the camera permission prompt is open.
  const libs = Promise.all([
    import('../vendor/three/three.module.min.js'),
    import('../vendor/mindar/mindar-image-three.prod.js'),
  ]).catch((e) => { throw fail('load', e); });
  libs.catch(() => {}); // handled below; avoid an unhandled-rejection warning meanwhile

  const aborted = () => hooks.signal && hooks.signal.aborted;
  await probeCamera();
  const [THREE, { MindARThree }] = await libs;
  if (aborted()) return null;

  const mindar = new MindARThree({
    container,
    imageTargetSrc: doc.target,
    maxTrack: 1,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no', // we draw our own UI
    filterMinCF: 0.0001, filterBeta: 10, // steadier overlay, slightly more lag
  });
  const { renderer, scene, camera } = mindar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  let anim;
  try {
    anim = await doc.createScene(THREE, { mode: 'ar', renderer });
  } catch (e) { renderer.dispose(); container.replaceChildren(); throw fail('load', e); }
  const anchor = mindar.addAnchor(0);
  anchor.group.add(anim.group);

  // Animation clock only runs while the page is in view, so the story never
  // plays out while nobody can see it.
  let t = 0, last = 0, tracking = false, started = false, doneFired = false, stopped = false;
  anchor.onTargetFound = () => { tracking = true; started = true; last = performance.now(); status('tracking'); };
  anchor.onTargetLost = () => { tracking = false; status('lost'); };

  let notFoundTimer = null;
  const controller = {
    replay() { t = 0; doneFired = false; anim.update(0); },
    stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(notFoundTimer);
      renderer.setAnimationLoop(null);
      try { mindar.stop(); } catch (e) { /* camera never started */ }
      mindar.video = null; // MindAR keeps a resize listener; this makes it a no-op
      anim.dispose();
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
  notFoundTimer = setTimeout(() => { if (!started && !stopped) status('notfound'); }, 15000);

  renderer.setAnimationLoop(() => {
    if (tracking) {
      const now = performance.now();
      t += Math.min(0.1, (now - last) / 1000); // clamp big gaps (tab switch)
      last = now;
      anim.update(t);
      if (!doneFired && t >= anim.duration) { doneFired = true; hooks.onDone && hooks.onDone(); }
    }
    renderer.render(scene, camera);
  });

  return controller;
}
