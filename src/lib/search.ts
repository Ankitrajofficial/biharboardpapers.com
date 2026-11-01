/**
 * Search that works in Hindi, English and Hinglish. We normalise both the query and the
 * alias list (lowercase, strip diacritics, collapse doubled letters) so "bhautiki",
 * "bhotiki" and "भौतिकी" all find Physics.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/(.)\1+/g, '$1')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Searchable {
  terms: string[];
}

export function matches(query: string, terms: string[]): boolean {
  const q = normalize(query);
  if (!q) return true;
  return terms.some((t) => {
    const n = normalize(t);
    return n.includes(q) || q.includes(n) && n.length >= 3;
  });
}

export function filterSearch<T extends Searchable>(query: string, items: T[]): T[] {
  return items.filter((i) => matches(query, i.terms));
}
