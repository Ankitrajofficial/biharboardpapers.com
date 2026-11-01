import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
// Content reads from disk in tests (no fetch).
globalThis.__bbpReadContent = async (path: string) => JSON.parse(readFileSync(join(ROOT, path.replace(/^\//, '')), 'utf8'));

// jsdom lacks matchMedia / scrollTo
window.scrollTo = () => {};
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
