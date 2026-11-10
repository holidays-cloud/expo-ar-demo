// Still-image mode: the same animation, played over a picture of the document.
// Used when the camera is denied, AR fails, or the visitor just prefers it.
export async function runStill(doc, container, hooks = {}) {
  const THREE = await import('../vendor/three/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  const anim = await doc.createScene(THREE, { mode: 'still', renderer });
  scene.add(anim.group);

  const pageH = 297 / 210; // page height in units (width = 1)
  function fit() {
    const w = container.clientWidth || window.innerWidth;
    const hgt = container.clientHeight || window.innerHeight;
    renderer.setSize(w, hgt, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = hgt + 'px';
    camera.aspect = w / hgt;
    // distance so the whole page (plus a margin) fits, whichever side is tighter
    const vFov = (camera.fov * Math.PI) / 180;
    const needH = pageH * 1.12, needW = 1.12;
    const distH = needH / 2 / Math.tan(vFov / 2);
    const distW = needW / 2 / Math.tan(vFov / 2) / camera.aspect;
    const d = Math.max(distH, distW);
    // look from slightly below so the lift towards the viewer reads as depth
    camera.position.set(0, -d * 0.16, d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  fit();
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  let t0 = performance.now(), doneFired = false, stopped = false;
  renderer.setAnimationLoop(() => {
    const t = (performance.now() - t0) / 1000;
    anim.group.rotation.y = Math.sin(t * 0.5) * 0.035; // gentle sway
    anim.update(t);
    if (!doneFired && t >= anim.duration) { doneFired = true; hooks.onDone && hooks.onDone(); }
    renderer.render(scene, camera);
  });

  return {
    replay() { t0 = performance.now(); doneFired = false; },
    stop() {
      if (stopped) return;
      stopped = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      anim.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
