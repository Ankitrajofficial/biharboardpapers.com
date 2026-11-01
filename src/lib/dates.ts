import type { ClassId, ExamCalendar, ExamDate } from '@/content/types';

/** The next (or currently running) exam for a class. */
export function upcomingExam(cal: ExamCalendar, classId: ClassId, now = new Date()): ExamDate | null {
  const todayIso = now.toISOString().slice(0, 10);
  const list = cal.exams.filter((e) => e.class === classId).sort((a, b) => a.start.localeCompare(b.start));
  return list.find((e) => e.end >= todayIso) ?? list[list.length - 1] ?? null;
}

export function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(dateIso + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Plan expiry = the end of the latest exam among the plan's classes. */
export function planExpiry(cal: ExamCalendar, classes: ClassId[], now = new Date()): string {
  let latest = '';
  for (const c of classes) {
    const e = upcomingExam(cal, c, now);
    if (e && e.end > latest) latest = e.end;
  }
  return latest;
}

export function formatDate(iso: string, lang: 'hi' | 'en'): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
