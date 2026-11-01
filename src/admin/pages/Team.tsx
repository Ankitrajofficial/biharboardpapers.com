import { useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, useFetch, type AdminMe } from '../api';
import { Confirm, DataTable, Field, inputCls, selectCls } from '../ui';

type Row = AdminMe & { addedBy: string; addedAt: string };
export default function Team() {
  const { t } = useLang();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Row[] }>('/team'), []);
  const [phone, setPhone] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState<'owner' | 'editor'>('editor');
  const [del, setDel] = useState<Row | null>(null); const [err, setErr] = useState('');
  const add = async () => { setErr(''); try { await adminApi('/team', { phone, name, role }); setPhone(''); setName(''); reload(); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="space-y-4">
      <h1 className="h1">{t('admin.team')}</h1>
      <form className="card-static grid gap-3 sm:grid-cols-4 items-end" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Field label={t('auth.enterNumber')}><input className={inputCls} inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} data-testid="team-phone" /></Field>
        <Field label={t('auth.nameTitle')}><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('admin.team.role')}><select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as 'owner' | 'editor')}><option value="editor">{t('admin.role.editor')}</option><option value="owner">{t('admin.role.owner')}</option></select></Field>
        <button type="submit" className="btn-primary btn-sm" disabled={phone.length !== 10} data-testid="team-add">{t('admin.team.add')}</button>
        {err && <p className="error-line sm:col-span-4">{err}</p>}
      </form>
      <DataTable<Row> columns={[
        { key: 'phoneMasked', label: t('auth.enterNumber'), render: (r) => <span>{r.phoneMasked}{r.name ? ` · ${r.name}` : ''}</span> },
        { key: 'role', label: t('admin.team.role'), render: (r) => t(`admin.role.${r.role}`) },
        { key: 'lastLoginAt', label: t('admin.team.lastLogin'), render: (r) => fmtDate(r.lastLoginAt) },
        { key: 'x', label: '', render: (r) => <button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.team.remove')}</button> },
      ]} rows={data?.rows.map((r) => ({ ...r, id: r.phone })) ?? null} loading={loading} error={error} onRetry={reload} />
      <Confirm open={!!del} name={del?.phoneMasked ?? ''} onCancel={() => setDel(null)} onConfirm={async () => { try { await adminApi(`/team/${del!.phone}`, undefined, 'DELETE'); setDel(null); reload(); } catch (e) { setErr((e as Error).message === 'last_owner' ? t('admin.team.lastOwner') : (e as Error).message); setDel(null); } }} />
    </div>
  );
}
