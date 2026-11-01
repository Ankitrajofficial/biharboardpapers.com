import { data } from '../db.ts';
import { planActive } from '../payments.ts';
import { liveStatus } from './tests.ts';
import { updateState } from './updates.ts';

const day = (iso: string) => iso.slice(0, 10);
export function stats(now = new Date(), includeRevenue = true) {
  const db = data();
  const today = day(now.toISOString());
  const d7 = day(new Date(now.getTime() - 7 * 86_400_000).toISOString());
  const month = today.slice(0, 7);
  const paid = db.orders.filter((o) => o.status === 'success' || o.status === 'refund_requested' || o.status === 'refund_processing');
  const series = Array.from({ length: 30 }, (_, i) => day(new Date(now.getTime() - (29 - i) * 86_400_000).toISOString())).map((d) => ({
    date: d, signups: db.users.filter((u) => day(u.createdAt) === d).length, revenue: paid.filter((o) => day(o.updatedAt) === d).reduce((s, o) => s + o.amount, 0),
  }));
  return {
    users: { total: db.users.length, today: db.users.filter((u) => day(u.createdAt) === today).length, last7: db.users.filter((u) => day(u.createdAt) >= d7).length },
    plans: { matric: db.users.filter((u) => planActive(u, now) && u.plan!.id === 'matric').length, inter: db.users.filter((u) => planActive(u, now) && u.plan!.id === 'inter').length, all: db.users.filter((u) => planActive(u, now) && u.plan!.id === 'all').length },
    revenue: includeRevenue ? { today: paid.filter((o) => day(o.updatedAt) === today).reduce((s, o) => s + o.amount, 0), month: paid.filter((o) => day(o.updatedAt).startsWith(month)).reduce((s, o) => s + o.amount, 0) } : null,
    tests: { attemptedToday: db.attempts.filter((a) => day(a.submittedAt) === today).length, upcoming: db.tests.filter((t) => liveStatus(t, now.getTime()) === 'scheduled').sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? '')).slice(0, 5).map((t) => ({ id: t.id, title: t.title, startAt: t.startAt })), live: db.tests.filter((t) => liveStatus(t, now.getTime()) === 'live').length },
    updates: db.updates.filter((u) => updateState(u, now.getTime()) === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map((u) => ({ id: u.id, title: u.title, category: u.category, updatedAt: u.updatedAt })),
    reports: { open: db.reports.filter((r) => r.status === 'open').length },
    series: includeRevenue ? series : series.map((s) => ({ ...s, revenue: 0 })),
  };
}
