/** Poster board: admin-managed carousel images. Images are stored as WebP under server/data/uploads. */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { data, save, type Admin, type Poster } from '../db.ts';
import { ValidationError } from './tests.ts';

const here = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
export const UPLOADS = join(dirname(here), '..', 'data', 'uploads');
const MAX_BYTES = 120 * 1024;
const now = () => new Date().toISOString();

/** Accepts a data URL (image/webp preferred; png/jpeg allowed) already compressed by the admin UI. */
export function savePosterImage(dataUrl: string): { url: string; bytes: number } {
  const m = dataUrl.match(/^data:(image\/(webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new ValidationError(['image must be a data URL (webp, png or jpeg)']);
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > MAX_BYTES) throw new ValidationError([`image is ${Math.round(buf.length / 1024)} KB; the limit is 120 KB (the admin page compresses to WebP automatically)`]);
  mkdirSync(UPLOADS, { recursive: true });
  const name = 'po_' + randomBytes(6).toString('hex') + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]);
  writeFileSync(join(UPLOADS, name), buf);
  return { url: `/api/uploads/${name}`, bytes: buf.length };
}

export function readUpload(name: string): { body: Buffer; type: string } | null {
  if (!/^[\w.-]+$/.test(name)) return null;
  const p = join(UPLOADS, name);
  if (!existsSync(p)) return null;
  const type = name.endsWith('.webp') ? 'image/webp' : name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { body: readFileSync(p), type };
}

export function upsertPoster(admin: Admin, input: Partial<Poster>, existing?: Poster): Poster {
  const errs: string[] = [];
  const image = String(input.image ?? '').trim();
  if (!image) errs.push('image is required (upload first)');
  const t = (input.title ?? {}) as { hi?: string; en?: string };
  const title = { hi: String(t.hi ?? '').trim() || String(t.en ?? '').trim(), en: String(t.en ?? '').trim() || String(t.hi ?? '').trim() };
  if (!title.hi) errs.push('title (alt text) is required');
  const link = input.link ? String(input.link).trim() : null;
  if (link && !/^(\/|https?:\/\/)/.test(link)) errs.push('link must be an internal route (/…) or http(s) URL');
  const cls = (['class-10', 'class-12', 'both'].includes(String(input.class ?? 'both')) ? input.class ?? 'both' : 'both') as Poster['class'];
  const startAt = input.startAt ? new Date(input.startAt).toISOString() : null;
  const endAt = input.endAt ? new Date(input.endAt).toISOString() : null;
  if (startAt && endAt && endAt <= startAt) errs.push('end must be after start');
  if (errs.length) throw new ValidationError(errs);
  const p: Poster = { id: existing?.id ?? 'po_' + randomBytes(5).toString('hex'), image, title, link, class: cls, startAt, endAt, order: Number(input.order ?? existing?.order ?? 0), active: input.active !== false, createdAt: existing?.createdAt ?? now(), updatedAt: now(), createdBy: existing?.createdBy ?? admin.phone };
  const db = data();
  if (existing) db.posters = db.posters.map((x) => (x.id === p.id ? p : x)); else db.posters.push(p);
  save();
  return p;
}
export function deletePoster(id: string) {
  const db = data();
  const p = db.posters.find((x) => x.id === id);
  db.posters = db.posters.filter((x) => x.id !== id);
  if (p?.image.startsWith('/api/uploads/') && !db.posters.some((x) => x.image === p.image)) { try { unlinkSync(join(UPLOADS, p.image.replace('/api/uploads/', ''))); } catch { /* ignore */ } }
  save();
}
/** Active posters for a class, inside their date window, in display order. */
export function livePosters(cls: string | null, at = Date.now()) {
  return data().posters
    .filter((p) => p.active && (!cls || p.class === 'both' || p.class === cls) && (!p.startAt || new Date(p.startAt).getTime() <= at) && (!p.endAt || new Date(p.endAt).getTime() > at))
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ id: p.id, image: p.image, title: p.title, link: p.link, class: p.class }));
}
/** Seed three sample posters (gradient SVGs) the first time so the carousel is visible. Replace them from /admin/posters. */
export function seedPoster() {
  const db = data();
  if (db.posters.length) return;
  const base = { class: 'both' as const, startAt: null, endAt: null, active: true, createdAt: now(), updatedAt: now(), createdBy: 'seed' };
  db.posters.push(
    { id: 'po_sample', image: '/posters/sample-2027.svg', title: { hi: 'बोर्ड परीक्षा 2027 की तैयारी शुरू करें', en: 'Start your Board Exam 2027 preparation' }, link: '/subjects', order: 0, ...base },
    { id: 'po_sample_tests', image: '/posters/sample-tests.svg', title: { hi: 'हर हफ़्ते नया मॉक टेस्ट — BSEB पैटर्न', en: 'A new mock test every week — BSEB pattern' }, link: '/tests', order: 1, ...base },
    { id: 'po_sample_updates', image: '/posters/sample-updates.svg', title: { hi: 'एडमिट कार्ड, डेट-शीट, रिज़ल्ट — ताज़ा अपडेट', en: 'Admit card, date sheet, results — latest updates' }, link: '/updates', order: 2, ...base },
  );
  save();
}
