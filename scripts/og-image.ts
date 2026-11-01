/** Renders public/og.png (1200×630) from inline HTML using Playwright's Chromium. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const html = `<!doctype html><html lang="hi"><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;background:radial-gradient(900px 400px at 50% -100px,rgba(59,130,246,.14),transparent 70%),#F7F9FF;font-family:'Noto Sans Devanagari','Inter',sans-serif;color:#0F1B3D}
.wrap{display:flex;align-items:center;gap:48px;padding:80px}
h1{font-size:64px;margin:0 0 12px;line-height:1.2}
p{font-size:34px;margin:0;color:#475569}
.tag{margin-top:28px;display:inline-block;border:2px solid #3B82F6;color:#2563EB;border-radius:9999px;padding:10px 22px;font-size:28px;background:#fff;box-shadow:0 4px 20px rgba(59,130,246,.25)}
</style></head><body><div class="wrap">
<svg width="260" height="260" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B82F6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><path d="M12 18c6-3 12-3 18 0v30c-6-3-12-3-18 0z" fill="#fff" stroke="url(#g)" stroke-width="3.5" stroke-linejoin="round"/><path d="M52 18c-6-3-12-3-18 0v30c6-3 12-3 18 0z" fill="#fff" stroke="url(#g)" stroke-width="3.5" stroke-linejoin="round"/><path d="M18 26h8M18 32h8M38 26h8M38 32h8" stroke="#0F1B3D" stroke-width="2.5" stroke-linecap="round" opacity=".5"/></svg>
<div><h1>बिहार बोर्ड पढ़ाई</h1><p>कक्षा 10 और 12 की तैयारी · Class 10 &amp; 12 Preparation</p><span class="tag">नोट्स · ऑब्जेक्टिव प्रश्न · मॉडल पेपर · मॉक टेस्ट</span></div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForTimeout(300);
writeFileSync('public/og.png', await page.screenshot({ type: 'png' }));
await browser.close();
console.log('wrote public/og.png');
