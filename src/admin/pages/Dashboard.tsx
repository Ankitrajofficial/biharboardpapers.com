import { Link } from 'react-router';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, useFetch } from '../api';
import { LineChart } from '../ui';
import { ErrorState, Skeleton } from '@/components/Loading';

interface Stats { users: { total: number; today: number; last7: number }; plans: { matric: number; inter: number; all: number }; revenue: { today: number; month: number } | null; tests: { attemptedToday: number; upcoming: Array<{ id: string; title: { hi: string; en: string }; startAt: string | null }>; live: number }; updates: Array<{ id: string; title: { hi: string; en: string }; category: string; updatedAt: string }>; reports: { open: number }; series: Array<{ date: string; signups: number; revenue: number }> }

const Card = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="card-static"><p className="meta">{label}</p><p className="price">{value}</p>{sub && <p className="meta">{sub}</p>}</div>
);

export default function Dashboard() {
  const { t, p } = useLang();
  const { data, loading, error, reload } = useFetch(() => adminApi<Stats>('/stats'), []);
  if (loading && !data) return <Skeleton lines={6} />;
  if (error || !data) return <ErrorState text={error ?? t('admin.error')} onRetry={reload} retryLabel={t('admin.retry')} />;
  return (
    <div className="space-y-4">
      <h1 className="h1">{t('admin.dashboard')}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label={t('admin.stat.users')} value={data.users.total} sub={`${t('admin.stat.today')} ${data.users.today} · ${t('admin.stat.7d')} ${data.users.last7}`} />
        <Card label={t('admin.stat.plans')} value={data.plans.matric + data.plans.inter + data.plans.all} sub={`₹149 ${data.plans.matric} · ₹199 ${data.plans.inter} · ₹299 ${data.plans.all}`} />
        {data.revenue && <Card label={t('admin.stat.revenue')} value={`₹${data.revenue.today}`} sub={`${t('admin.stat.month')} ₹${data.revenue.month}`} />}
        <Card label={t('admin.stat.attempts')} value={data.tests.attemptedToday} sub={`${t('admin.status.live')} ${data.tests.live}`} />
        <Card label={t('admin.stat.reports')} value={data.reports.open} />
      </div>
      <LineChart points={data.series} aKey="signups" bKey="revenue" aLabel={t('admin.stat.users')} bLabel={t('admin.stat.revenue')} />
      <div className="grid md:grid-cols-2 gap-3">
        <section className="card-static"><h2 className="h2 mb-2">{t('admin.stat.upcoming')}</h2>
          {data.tests.upcoming.length ? <ul className="space-y-1">{data.tests.upcoming.map((x) => <li key={x.id}><Link className="link" to={`/admin/tests/${x.id}`}>{p(x.title)}</Link> <span className="meta">{fmtDate(x.startAt)}</span></li>)}</ul> : <p className="meta">{t('admin.empty')}</p>}
        </section>
        <section className="card-static"><h2 className="h2 mb-2">{t('admin.stat.latest')}</h2>
          {data.updates.length ? <ul className="space-y-1">{data.updates.map((x) => <li key={x.id}><Link className="link" to="/admin/updates">{p(x.title)}</Link> <span className="meta">{fmtDate(x.updatedAt)}</span></li>)}</ul> : <p className="meta">{t('admin.empty')}</p>}
        </section>
      </div>
    </div>
  );
}
