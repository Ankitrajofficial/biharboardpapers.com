import { randomBytes } from 'node:crypto';
import { data, save, type Admin } from '../db.ts';

/** Records who did what, when, with before/after snapshots. Newest first when listed. */
export function logAudit(admin: Admin, action: string, entity: string, entityId: string, before: unknown, after: unknown, reason: string | null = null) {
  const e = { id: 'au_' + randomBytes(6).toString('hex'), at: new Date().toISOString(), adminPhone: admin.phone, role: admin.role, action, entity, entityId, before: before ?? null, after: after ?? null, reason };
  data().audit.unshift(e);
  if (data().audit.length > 20000) data().audit.length = 20000;
  save();
  return e;
}

export function listAudit(filter: { entity?: string; admin?: string; q?: string } = {}, page = 1, perPage = 25) {
  let rows = data().audit;
  if (filter.entity) rows = rows.filter((r) => r.entity === filter.entity);
  if (filter.admin) rows = rows.filter((r) => r.adminPhone === filter.admin);
  if (filter.q) { const q = filter.q.toLowerCase(); rows = rows.filter((r) => `${r.action} ${r.entity} ${r.entityId} ${r.reason ?? ''}`.toLowerCase().includes(q)); }
  return { total: rows.length, page, perPage, rows: rows.slice((page - 1) * perPage, page * perPage) };
}
