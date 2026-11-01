import type { Plugin } from 'vite';
import { cpSync, existsSync, statSync, createReadStream, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

/** Serves /content/* from the repo's content folder in dev and copies it into dist on build. */
export function contentPlugin(root: string): Plugin {
  const dir = join(root, 'content');
  return {
    name: 'bbp-content',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/content/')) return next();
        const rel = normalize(decodeURIComponent(req.url.split('?')[0].slice('/content/'.length)));
        if (rel.includes('..')) { res.statusCode = 400; return res.end(); }
        const file = join(dir, rel);
        if (!existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; return res.end('not found'); }
        res.setHeader('content-type', file.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream');
        res.setHeader('cache-control', 'no-cache');
        createReadStream(file).pipe(res);
      });
    },
    /** Preview behaves like Cloudflare Pages / Netlify: /path → /path/index.html, unknown → 404.html. */
    configurePreviewServer(server) {
      const dist = join(root, 'dist');
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0];
        if (req.method !== 'GET' || url.startsWith('/api/') || /\.[a-z0-9]+$/i.test(url)) return next();
        const clean = url.replace(/\/$/, '') || '/';
        const file = clean === '/' ? join(dist, 'index.html') : join(dist, clean, 'index.html');
        if (existsSync(file)) {
          res.setHeader('content-type', 'text/html; charset=utf-8');
          return res.end(readFileSync(file));
        }
        const nf = join(dist, '404.html');
        if (existsSync(nf)) {
          res.statusCode = 404;
          res.setHeader('content-type', 'text/html; charset=utf-8');
          return res.end(readFileSync(nf));
        }
        next();
      });
    },
    closeBundle() {
      if (process.env.SSR_BUILD) return;
      cpSync(dir, join(root, 'dist', 'content'), { recursive: true });
    },
  };
}
