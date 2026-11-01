/**
 * Admin access: same WhatsApp OTP, but only phones in the `admins` table may enter.
 * Owners are seeded from ADMIN_OWNER_PHONES. Admin sessions expire after 12 hours.
 * Every check here runs on the server; the UI never decides access on its own.
 */
import { randomBytes } from 'node:crypto';
import { data, save, type Admin, type AdminRole } from '../db.ts';
import { AuthError, normalizePhone } from '../auth.ts';

export const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

export function seedOwners(env = process.env.ADMIN_OWNER_PHONES ?? '') {
  const db = data();
  for (const raw of env.split(',')) {
    const phone = normalizePhone(raw.trim());
    if (!phone) continue;
    const existing = db.admins.find((a) => a.phone === phone);
    if (existing) { existing.role = 'owner'; continue; }
    db.admins.push({ phone, role: 'owner', name: null, addedBy: 'env', addedAt: new Date().toISOString(), lastLoginAt: null });
  }
  save();
}

export const findAdmin = (phone: string) => data().admins.find((a) => a.phone === phone) ?? null;

export function createAdminSession(phone: string, now = Date.now()) {
  const token = 'adm_' + randomBytes(24).toString('hex');
  data().adminSessions.push({ token, phone, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ADMIN_SESSION_MS).toISOString() });
  const a = findAdmin(phone);
  if (a) a.lastLoginAt = new Date(now).toISOString();
  save();
  return token;
}

export function adminFromToken(token: string | undefined, now = Date.now()): Admin | null {
  if (!token?.startsWith('adm_')) return null;
  const db = data();
  const s = db.adminSessions.find((x) => x.token === token);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() < now) {
    db.adminSessions = db.adminSessions.filter((x) => x.token !== token);
    save();
    throw new AuthError('session_expired', 401);
  }
  return findAdmin(s.phone);
}

export function dropAdminSession(token: string) {
  const db = data();
  db.adminSessions = db.adminSessions.filter((s) => s.token !== token);
  save();
}

export class Forbidden extends Error {
  status = 403;
  code = 'forbidden';
}

/** Role gate used by every admin endpoint. */
export function requireRole(admin: Admin | null, role: AdminRole = 'editor'): Admin {
  if (!admin) throw new AuthError('unauthorized', 401);
  if (role === 'owner' && admin.role !== 'owner') throw new Forbidden('owner_only');
  return admin;
}

export function addAdmin(by: Admin, rawPhone: string, role: AdminRole, name: string | null) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError('invalid');
  const db = data();
  let a = db.admins.find((x) => x.phone === phone);
  if (a) { a.role = role; if (name) a.name = name; }
  else { a = { phone, role, name, addedBy: by.phone, addedAt: new Date().toISOString(), lastLoginAt: null }; db.admins.push(a); }
  save();
  return a;
}

export function removeAdmin(phone: string) {
  const db = data();
  const target = db.admins.find((a) => a.phone === phone);
  if (!target) return false;
  if (target.role === 'owner' && db.admins.filter((a) => a.role === 'owner').length <= 1) throw new Forbidden('last_owner');
  db.admins = db.admins.filter((a) => a.phone !== phone);
  db.adminSessions = db.adminSessions.filter((s) => s.phone !== phone);
  save();
  return true;
}

export const publicAdmin = (a: Admin) => ({ phone: a.phone, phoneMasked: a.phone.slice(2, 4) + '•••••' + a.phone.slice(-3), role: a.role, name: a.name, addedBy: a.addedBy, addedAt: a.addedAt, lastLoginAt: a.lastLoginAt });
