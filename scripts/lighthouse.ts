/** Runs Lighthouse (mobile, simulated slow 4G) against the preview server for key pages. */
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';

const base = process.env.LH_BASE ?? 'http://localhost:4173';
const pages = ['/', '/class-12/hindi/bhautiki', '/class-12/hindi/bhautiki/vaidyut-aavesh-tatha-kshetra', '/class-10/english/science/chemical-reactions-and-equations/objective'];
mkdirSync('lighthouse-report', { recursive: true });
const chrome = process.env.CHROME_PATH ? `--chrome-path="${process.env.CHROME_PATH}"` : '';
const rows: string[] = [];
for (const p of pages) {
  const out = `lighthouse-report/${p === '/' ? 'home' : p.slice(1).replace(/\//g, '_')}.json`;
  execSync(`npx --yes lighthouse "${base}${p}" --quiet --output=json --output-path=${out} --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless=new --no-sandbox" ${chrome}`, { stdio: 'inherit' });
  const r = JSON.parse(readFileSync(out, 'utf8'));
  const c = r.categories;
  const a = r.audits;
  rows.push(`${p} | perf ${Math.round(c.performance.score * 100)} | a11y ${Math.round(c.accessibility.score * 100)} | best-practices ${Math.round(c['best-practices'].score * 100)} | seo ${Math.round(c.seo.score * 100)} | LCP ${a['largest-contentful-paint'].displayValue} | CLS ${a['cumulative-layout-shift'].displayValue} | TBT ${a['total-blocking-time'].displayValue}`);
}
console.log(rows.join('\n'));
