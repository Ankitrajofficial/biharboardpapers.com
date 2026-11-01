import { useRef, useState } from 'react';
import { useLang } from '@/lib/hooks';
import { adminApi, fmtDate, fromLocalInput, toLocalInput, useFetch } from '../api';
import { BiInput, Confirm, DataTable, Field, inputCls, selectCls } from '../ui';

type Bi = { hi: string; en: string };
interface Poster { id: string; image: string; title: Bi; link: string | null; class: 'class-10' | 'class-12' | 'both'; startAt: string | null; endAt: string | null; order: number; active: boolean; updatedAt: string }
const blank = (): Partial<Poster> => ({ image: '', title: { hi: '', en: '' }, link: '/subjects', class: 'both', startAt: null, endAt: null, order: 0, active: true });

/** Resize to 1900×600 (cover) and encode as WebP under 120 KB, lowering quality until it fits. */
export async function compressPoster(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const W = 1900, H = 600;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  for (let q = 0.85; q >= 0.3; q -= 0.1) {
    const url = canvas.toDataURL('image/webp', q);
    if (url.length * 0.75 < 120 * 1024) return url;
  }
  return canvas.toDataURL('image/webp', 0.25);
}

export default function Posters() {
  const { t, p } = useLang();
  const { data, loading, error, reload } = useFetch(() => adminApi<{ rows: Poster[] }>('/posters'), []);
  const [edit, setEdit] = useState<Partial<Poster> | null>(null); const [errs, setErrs] = useState<string[]>([]); const [del, setDel] = useState<Poster | null>(null); const [busy, setBusy] = useState(false); const [bytes, setBytes] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => { setBusy(true); setErrs([]); try { const dataUrl = await compressPoster(f); const r = await adminApi<{ url: string; bytes: number }>('/posters/upload', { dataUrl }); setEdit((e) => ({ ...e!, image: r.url })); setBytes(r.bytes); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } finally { setBusy(false); } };
  const save = async () => { setErrs([]); try { if (edit!.id) await adminApi(`/posters/${edit!.id}`, edit, 'PUT'); else await adminApi('/posters', edit); setEdit(null); reload(); } catch (e) { setErrs((e as { errors?: string[] }).errors ?? [(e as Error).message]); } };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><h1 className="h1 flex-1">{t('admin.posters')}</h1><button type="button" className="btn-primary btn-sm" onClick={() => { setEdit(blank()); setBytes(null); }} data-testid="poster-new">{t('admin.new')}</button></div>
      {edit && (
        <form className="card-static space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }} data-testid="poster-form">
          <div className="aspect-[19/6] rounded-2xl overflow-hidden bg-[#EEF2FB] border border-line">{edit.image ? <img src={edit.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center meta">1900 × 600</div>}</div>
          <div className="flex flex-wrap items-center gap-2"><input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /><button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => file.current?.click()}>{t('admin.posters.upload')}</button><span className="meta">{t('admin.posters.hint')}{bytes ? ` · ${Math.round(bytes / 1024)} KB` : ''}</span></div>
          <BiInput label={t('admin.posters.alt')} value={edit.title!} onChange={(title) => setEdit({ ...edit, title })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label={t('admin.upd.link')}><input className={inputCls} value={edit.link ?? ''} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="/subjects" /></Field>
            <Field label={t('papers.filter.class')}><select className={selectCls} value={edit.class} onChange={(e) => setEdit({ ...edit, class: e.target.value as Poster['class'] })}><option value="both">10 + 12</option><option value="class-10">10</option><option value="class-12">12</option></select></Field>
            <Field label={t('admin.posters.order')}><input className={inputCls} type="number" value={edit.order ?? 0} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></Field>
            <Field label={t('admin.test.start')}><input className={inputCls} type="datetime-local" value={toLocalInput(edit.startAt ?? null)} onChange={(e) => setEdit({ ...edit, startAt: fromLocalInput(e.target.value) })} /></Field>
            <Field label={t('admin.test.end')}><input className={inputCls} type="datetime-local" value={toLocalInput(edit.endAt ?? null)} onChange={(e) => setEdit({ ...edit, endAt: fromLocalInput(e.target.value) })} /></Field>
            <label className="flex items-end gap-2 min-h-12 pb-2"><input type="checkbox" className="w-5 h-5" checked={!!edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> {t('admin.posters.active')}</label>
          </div>
          {errs.length > 0 && <ul className="error-line list-disc pl-5" role="alert">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="flex gap-2"><button type="submit" className="btn-primary btn-sm" disabled={busy} data-testid="poster-save">{t('admin.save')}</button><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>{t('admin.cancel')}</button></div>
        </form>
      )}
      <DataTable<Poster> columns={[
        { key: 'image', label: '', render: (r) => <img src={r.image} alt={p(r.title)} className="w-28 aspect-[19/6] object-cover rounded-lg" loading="lazy" /> },
        { key: 'title', label: t('admin.posters.alt'), render: (r) => <span>{p(r.title)}<span className="meta block">{r.link ?? '—'} · {r.class} · #{r.order}</span></span> },
        { key: 'active', label: t('admin.posters.active'), render: (r) => <span>{r.active ? '✓' : '✗'}{r.startAt || r.endAt ? <span className="meta block">{fmtDate(r.startAt)} → {fmtDate(r.endAt)}</span> : null}</span> },
        { key: 'x', label: '', render: (r) => <span className="flex gap-1"><button type="button" className="btn-ghost btn-sm" onClick={() => { setEdit(r); setBytes(null); }}>{t('admin.edit')}</button><button type="button" className="btn-ghost btn-sm btn-danger" onClick={() => setDel(r)}>{t('admin.delete')}</button></span> },
      ]} rows={data?.rows ?? null} loading={loading} error={error} onRetry={reload} />
      <Confirm open={!!del} name={del ? p(del.title) : ''} onCancel={() => setDel(null)} onConfirm={async () => { await adminApi(`/posters/${del!.id}`, undefined, 'DELETE'); setDel(null); reload(); }} />
    </div>
  );
}
