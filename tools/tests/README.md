# Automated checks (headless Chromium + Playwright, no real phone)

These were written during development. Paths are hard-coded to `/home/user/expo-ar` and
`/opt/node22/lib/node_modules/playwright` (the cloud dev box); adjust for another machine.
Most need the dev server running: `node tools/serve.mjs --port 8080`.
FEEDS = any folder for generated fake-camera videos (they are ~120 MB each).

| Script | What it checks |
|---|---|
| `python3 -I mky4m.py FEEDS docN still\|move` | makes a fake camera feed (`FEEDS/docN-still.y4m`): the document perspective-warped on a desk, sensor noise, optional sideways motion |
| `node flow.cjs FEEDS docN` | full visitor flow with that feed: intro → camera → page found → animation → result card (+ "prepared" note) → back to camera, progress dot filled, console errors |
| `node steady.cjs FEEDS docN-still\|docN-move '{json}'` | overlay jitter (still feed) or added lag (moving feed); `{json}` overrides settings via `window.__AR_TUNE` (e.g. `{"lock":false}`) |
| `node confusion.mjs` | matches photos `tools/build/cam-docN-{front,tilt,far}.jpg` against every target in `targets/banner.mind`; expects each to match only itself (uses `confusion.html`; make the photos with the snippet in HANDOFF.md or similar) |
| `node misc.cjs FEEDS` | hidden booth menu (5 taps on logo) for all 4 samples, camera-denied help screen, and a scan for any Latin words on visitor screens |
| `node subpath-test.mjs FEEDS` | simulates GitHub Pages (site only under `/expo-ar-demo/`), runs the camera flow, fails on any request outside the sub-path, checks for Latin digits |
| `python3 -I fakephoto.py` | simulated phone photos of the filled example forms (for testing tools/import-scans.py) |
