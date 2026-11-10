// Tiny zero-dependency static server for local testing (and reused by tools/make-print.mjs).
//   node tools/serve.mjs                    -> http://0.0.0.0:8080
//   node tools/serve.mjs --port 8443 --cert cert.pem --key key.pem   -> https
// Phones only allow the camera on HTTPS (or on "localhost"), see README.md.
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.mind': 'application/octet-stream', '.vcf': 'text/vcard; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.mind', '.txt', '.vcf']);
// Folders that exist in the project but are not part of the website.
const BLOCKED = ['/node_modules', '/tools', '/.git'];

export function createStaticHandler(rootDir, { allowTools = false } = {}) {
  const root = resolve(rootDir);
  const gzCache = new Map(); // path -> {mtime, buf}
  return async (req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!allowTools && BLOCKED.some((b) => urlPath === b || urlPath.startsWith(b + '/'))) return send(res, 404, 'Not found');
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const file = normalize(join(root, urlPath));
      if (file !== root && !file.startsWith(root + sep)) return send(res, 403, 'Forbidden');
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile()) return send(res, 404, 'Not found');
      const ext = extname(file).toLowerCase();
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        // HTML always revalidates; other assets may be cached briefly while testing.
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
      };
      let body = await readFile(file);
      if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        const hit = gzCache.get(file);
        if (hit && hit.mtime === st.mtimeMs) body = hit.buf;
        else { const buf = gzipSync(body, { level: 6 }); gzCache.set(file, { mtime: st.mtimeMs, buf }); body = buf; }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
      }
      headers['Content-Length'] = body.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (e) {
      send(res, 500, 'Server error');
    }
  };
}

function send(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

// Run directly
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
  const port = Number(arg('port', 8080));
  const cert = arg('cert'), key = arg('key');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const handler = createStaticHandler(root);
  const server = cert && key
    ? createHttps({ cert: readFileSync(cert), key: readFileSync(key) }, handler)
    : createHttp(handler);
  server.listen(port, '0.0.0.0', () => console.log(`Serving ${root} on ${cert ? 'https' : 'http'}://0.0.0.0:${port}`));
}
