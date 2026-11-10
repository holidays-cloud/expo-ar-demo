# Expo AR demo

Plain static site (ES modules, no build step) plus a few Node scripts in `tools/` that produce the print files and AR targets. The full spec is in `CLAUDE.md`.

## Run locally

```bash
npm run serve
```

This serves the project on port 8080. On a laptop browser, `http://localhost:8080` works fully, camera included, because `localhost` counts as a secure origin.

## Test on a phone (the camera needs HTTPS)

Pick one:

**A. Your VPS with a real certificate (closest to the expo).** Copy the site files (everything except `node_modules/`, `tools/`, `print/`) to the server and serve them with nginx. Get a certificate from Let's Encrypt (`apt install nginx certbot python3-certbot-nginx`, then `certbot --nginx -d your.domain`) or install the Parspack certificate. Full deployment notes come in step 7.

**B. Android phone over USB, no certificate.** Run `npm run serve` on the laptop, connect the phone with USB debugging on, open `chrome://inspect` on the laptop, and enable *Port forwarding* `8080 → localhost:8080`. Then open `http://localhost:8080` in Chrome on the phone. The phone treats it as localhost, so the camera is allowed.

**C. Same Wi-Fi with a self-signed certificate.**
```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -keyout key.pem -out cert.pem -subj "/CN=expo-test"
```
```bash
node tools/serve.mjs --port 8443 --cert cert.pem --key key.pem
```
Open `https://<laptop-ip>:8443` on the phone and accept the warning. Android Chrome allows the camera after that. iPhone Safari usually does too; if it doesn't, use option A.

Over plain `http://<laptop-ip>:8080` everything except the camera works: the still-image mode and the sample results.

## Print

`print/doc1.pdf` (vector) or `print/doc1.png` (2480 × 3508 px, 300 DPI) is A4 portrait. It can be printed larger on the banner as long as the proportions stay the same (MindAR doesn't care about size). Use matte material, since gloss reflections break tracking.

## Rebuild after changing a document

```bash
npm install --ignore-scripts
```
```bash
npm run vendor
```
```bash
npm run print
```
```bash
npm run targets
```
```bash
node tools/inspect-target.mjs targets/doc1.mind
```

`print` regenerates the print files, the web image and the measured positions of the handwritten pieces. `targets` recompiles the MindAR target. Reprint the banner whenever the artwork changes, because the old print will no longer match the target.
