/**
 * Pre-renders every public route to static HTML in dist/ (SEO + instant first paint),
 * then writes sitemap.xml. Runs after `vite build` and the SSR build.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { subjects } from '../src/data/subjects.ts';
import { siteConfig } from '../src/config/site.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const index = JSON.parse(readFileSync(join(ROOT, 'src/generated/content-index.json'), 'utf8')) as Array<{ class: string; medium: string; subjectId: string; slug: string }>;
const mocks = JSON.parse(readFileSync(join(ROOT, 'content/mock-tests/index.json'), 'utf8')) as Array<{ id: string }>;

// Content reads from disk during prerender.
globalThis.__bbpReadContent = async (path: string) => JSON.parse(readFileSync(join(ROOT, path.replace(/^\//, '')), 'utf8'));

const routes = new Set<string>(['/', '/choose', '/subjects', '/papers', '/mock-test', '/updates', '/tests', '/syllabus', '/my-plan', '/admit-card', '/exam-calendar', '/sent-up-practical', '/my-study', '/plans', '/login', '/about', '/privacy', '/disclaimer', '/offline', '/404']);
for (const s of subjects) {
  for (const medium of ['hindi', 'english'] as const) {
    const base = `/${s.class}/${medium}/${medium === 'hindi' ? s.slug.hi : s.slug.en}`;
    routes.add(base);
    routes.add(`${base}/objective`);
    routes.add(`${base}/important-questions`);
  }
  routes.add(`/syllabus/${s.class}/${s.slug.en}`);
}
for (const c of index) {
  const s = subjects.find((x) => x.class === c.class && x.id === c.subjectId);
  if (!s) continue;
  const base = `/${c.class}/${c.medium}/${c.medium === 'hindi' ? s.slug.hi : s.slug.en}/${c.slug}`;
  routes.add(base);
  routes.add(`${base}/objective`);
}
for (const m of mocks) routes.add(`/mock-test/${m.id}`);

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
const { render, resourceValue } = (await import(join(ROOT, 'dist-ssr/entry-server.js'))) as { render: (url: string) => Promise<string>; resourceValue: (p: string) => unknown };

const HOISTABLE = /^(?:<(?:title|meta|link)\b[^>]*>(?:[^<]*<\/title>)?)+/;
let n = 0;
for (const route of routes) {
  globalThis.__bbpUsed = new Set<string>();
  let html = await render(route);
  // Inline the JSON this page used so hydration never suspends (and saves a request).
  const data: Record<string, unknown> = {};
  for (const p of globalThis.__bbpUsed) {
    const v = resourceValue(p);
    if (v !== undefined) data[p] = v;
  }
  const inline = Object.keys(data).length ? `<script id="bbp-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : '';
  // React 19 emits hoistable head tags first; move them into <head>.
  let head = '';
  const m = html.match(HOISTABLE);
  if (m) { head = m[0]; html = html.slice(m[0].length); }
  const page = template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html)
    .replace('<!--app-data-->', inline)
    .replace('<html lang="hi">', route.includes('/english/') ? '<html lang="en">' : '<html lang="hi">');
  const out = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  n++;
}

// Static hosts (Cloudflare Pages, Netlify) serve /404.html for unknown paths.
writeFileSync(join(DIST, '404.html'), readFileSync(join(DIST, '404', 'index.html')));

// sitemap.xml with hreflang pairs for subject pages
const today = new Date().toISOString().slice(0, 10);
const noIndex = new Set(['/choose', '/my-study', '/my-plan', '/admit-card', '/login', '/offline', '/404']);
const urls = [...routes].filter((r) => !noIndex.has(r)).map((r) => {
  const alt = r.includes('/hindi/') ? r.replace('/hindi/', '/english/') : r.includes('/english/') ? r.replace('/english/', '/hindi/') : null;
  const pair = alt && routes.has(alt) ? `<xhtml:link rel="alternate" hreflang="${r.includes('/hindi/') ? 'en' : 'hi'}" href="${siteConfig.origin}${alt}"/>` : '';
  return `<url><loc>${siteConfig.origin}${r}</loc><lastmod>${today}</lastmod>${pair}</url>`;
});
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
rmSync(join(ROOT, 'dist-ssr'), { recursive: true, force: true });
console.log(`prerender → ${n} pages, sitemap with ${urls.length} urls`);
