/**
 * WhatsApp broadcasts to opted-in students (approved utility template). Respects STOP
 * (consent.granted === false) and quiet hours 21:00–08:00 IST (queued until 08:00).
 */
import { randomBytes } from 'node:crypto';
import { data, save, type Admin, type NotificationJob } from '../db.ts';
import { provider } from '../providers/whatsapp.ts';
import { planActive } from '../payments.ts';

const IST_OFFSET_MIN = 330;
export function istHour(d = new Date()) { return ((d.getUTCHours() * 60 + d.getUTCMinutes() + IST_OFFSET_MIN) / 60) % 24; }
export function isQuietHours(d = new Date()) { const h = istHour(d); return h >= 21 || h < 8; }
/** Next 08:00 IST at or after `d`. */
export function nextSendTime(d = new Date()): Date {
  if (!isQuietHours(d)) return d;
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  const next = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + (ist.getUTCHours() >= 21 ? 1 : 0), 8, 0, 0) - IST_OFFSET_MIN * 60_000);
  return next;
}

export function audienceFor(cls: string | null, plans: string[] | null) {
  return data().users.filter((u) => u.phone && u.consent?.granted && !u.blocked && (!cls || cls === 'both' || u.classId === cls) && (!plans || !plans.length || (planActive(u) && plans.includes(u.plan!.id))));
}

export function queueBroadcast(admin: Admin, kind: string, cls: string | null, plans: string[] | null, text: string, now = new Date()): NotificationJob {
  const job: NotificationJob = { id: 'ntf_' + randomBytes(5).toString('hex'), createdAt: now.toISOString(), scheduledAt: nextSendTime(now).toISOString(), sentAt: null, kind, audience: { class: cls, plans }, text, count: audienceFor(cls, plans).length, status: 'scheduled', createdBy: admin.phone };
  data().notifications.push(job);
  save();
  return job;
}

export async function runDueNotifications(now = new Date()) {
  const due = data().notifications.filter((j) => j.status === 'scheduled' && new Date(j.scheduledAt).getTime() <= now.getTime());
  for (const j of due) {
    const users = audienceFor(j.audience.class, j.audience.plans);
    let n = 0;
    for (const u of users) { if (u.phone && (await provider().sendUtility(u.phone, j.text))) n++; }
    j.count = n; j.sentAt = new Date().toISOString(); j.status = 'sent';
  }
  if (due.length) save();
  return due.length;
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startNotificationLoop() {
  if (timer) return;
  timer = setInterval(() => { runDueNotifications().catch((e) => console.error('[notify]', e)); }, 60_000);
}
