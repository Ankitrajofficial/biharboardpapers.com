/**
 * Tiny JSON-file store for the MVP backend. Swap for Supabase/Firebase by re-implementing
 * load/save; nothing else in the server depends on the storage.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type RefundState = null | 'requested' | 'processing' | 'refunded';
export interface Entitlement {
  id: 'matric' | 'inter' | 'all';
  validTill: string;
  activatedAt: string;
  receiptId: string;
  txnid: string;
  amountPaid: number;
  orderId: string;
  refund: RefundState;
}
export type AdminRole = 'owner' | 'editor';
export interface Admin { phone: string; role: AdminRole; name: string | null; addedBy: string; addedAt: string; lastLoginAt: string | null }
export interface AdminSession { token: string; phone: string; createdAt: string; expiresAt: string }
export interface AuditEntry { id: string; at: string; adminPhone: string; role: AdminRole; action: string; entity: string; entityId: string; before: unknown; after: unknown; reason: string | null }

export type Bilingual = { hi: string; en: string };
export type PlanIdT = 'matric' | 'inter' | 'all';
export interface TestSeries {
  id: string; title: Bilingual; description: Bilingual; class: 'class-10' | 'class-12'; stream: 'arts' | 'science' | 'commerce' | 'all';
  subjectIds: string[]; medium: 'hindi' | 'english' | 'both'; access: 'free' | 'plan'; plans: PlanIdT[]; color: string;
  createdAt: string; updatedAt: string; createdBy: string;
}
export interface AdminTest {
  id: string; seriesId: string; title: Bilingual; type: 'chapter' | 'full' | 'quick'; durationMin: number; totalQuestions: number; attemptLimit: number;
  marksPerQuestion: number; negativeMarks: number; instructions: Bilingual; questionIds: string[];
  status: 'draft' | 'scheduled' | 'closed'; startAt: string | null; endAt: string | null; resultsVisible: 'instant' | 'after_end'; leaderboard: boolean;
  notifiedAt: string | null; createdAt: string; updatedAt: string; createdBy: string;
}
export interface BankQuestion {
  id: string; question: Bilingual; options: { hi: string[]; en: string[] }; answer: number; explanation: Bilingual;
  class: 'class-10' | 'class-12'; subjectId: string; chapter: string | null; difficulty: 'easy' | 'medium' | 'hard';
  source: { type: 'sample' | 'pyq_pattern' | 'official_model_paper'; citation: string | null }; status: 'draft' | 'reviewed';
  createdAt: string; updatedAt: string; createdBy: string;
}
export interface Attempt {
  id: string; testId: string; userId: string; answers: Record<string, number>; score: number; maxMarks: number; correct: number; wrong: number; skipped: number; overLimit: number;
  startedAt: string; submittedAt: string; perQuestion: Array<{ id: string; chosen: number | null; correct: number; result: 'right' | 'wrong' | 'skipped' | 'not_counted' }>;
}
export type UpdateCategory = 'exam_date' | 'admit_card' | 'result' | 'model_paper' | 'notice' | 'site_update';
export interface Update {
  id: string; title: Bilingual; text: Bilingual; category: UpdateCategory; class: 'class-10' | 'class-12' | 'both'; link: string | null;
  attachment: { url: string; kind: 'image' | 'pdf' } | null; pinned: boolean; important: boolean; source: string;
  status: 'draft' | 'published'; publishAt: string | null; expiresAt: string | null; notifiedAt: string | null;
  createdAt: string; updatedAt: string; createdBy: string;
}
export interface ExamDateRow { id: string; class: 'class-10' | 'class-12'; subject: string | null; date: string; shift: 'morning' | 'afternoon' | null; status: 'official' | 'expected'; note: string | null; sourceUrl: string | null }
export interface MistakeReport { id: string; at: string; userId: string | null; phone: string | null; page: string; refId: string; message: string; status: 'open' | 'resolved'; reply: string | null; resolvedBy: string | null; resolvedAt: string | null }
export interface Poster { id: string; image: string; title: Bilingual; link: string | null; class: 'class-10' | 'class-12' | 'both'; startAt: string | null; endAt: string | null; order: number; active: boolean; createdAt: string; updatedAt: string; createdBy: string }
export interface NotificationJob { id: string; createdAt: string; scheduledAt: string; sentAt: string | null; kind: string; audience: { class: string | null; plans: string[] | null }; text: string; count: number; status: 'scheduled' | 'sent'; createdBy: string }

export interface User {
  id: string;
  /** WhatsApp login identity ('91XXXXXXXXXX'); null for email-only accounts */
  phone: string | null;
  /** Email login identity or receipt email */
  email: string | null;
  /** Mobile given at checkout by an email-only account (PayU needs one); not a login identity */
  contactPhone?: string | null;
  name: string | null;
  classId: string | null;
  medium: string | null;
  stream: string | null;
  ref: string | null;
  consent: { granted: boolean; at: string; source: string; templateCategory: string } | null;
  plan: Entitlement | null;
  progress: Record<string, unknown> | null;
  createdAt: string;
  blocked?: boolean;
  district?: string | null;
  leaderboardOptIn?: boolean;
  admitCard?: { uploadedAt: string } | null;
}
export type OrderStatus = 'created' | 'pending' | 'success' | 'failed' | 'duplicate' | 'refund_requested' | 'refund_processing' | 'refunded';
export interface Order {
  id: string; // PayU txnid
  userId: string;
  planId: 'matric' | 'inter' | 'all';
  kind: 'new' | 'upgrade';
  amount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  mihpayid?: string;
  receiptId?: string;
  events: Array<{ at: string; type: string; detail?: string }>;
}
export interface Session { token: string; userId: string; createdAt: string; expiresAt: string; lastUsedAt: string }
export interface SecurityEvent { at: string; type: string; detail: string }

interface Db {
  users: User[]; orders: Order[]; sessions: Session[]; security: SecurityEvent[];
  admins: Admin[]; adminSessions: AdminSession[]; audit: AuditEntry[];
  series: TestSeries[]; tests: AdminTest[]; questions: BankQuestion[]; attempts: Attempt[];
  updates: Update[]; examDates: ExamDateRow[]; reports: MistakeReport[]; notifications: NotificationJob[]; posters: Poster[];
}
const empty = (): Db => ({ users: [], orders: [], sessions: [], security: [], admins: [], adminSessions: [], audit: [], series: [], tests: [], questions: [], attempts: [], updates: [], examDates: [], reports: [], notifications: [], posters: [] });

const here = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
const DIR = join(dirname(here), 'data');
const FILE = join(DIR, process.env.DB_FILE ?? 'db.json');
let db: Db = empty();

export function load() {
  mkdirSync(DIR, { recursive: true });
  if (existsSync(FILE)) {
    try { db = { ...empty(), ...JSON.parse(readFileSync(FILE, 'utf8')) }; } catch { /* start fresh */ }
  }
}
export function save() {
  if (process.env.DB_MEMORY === '1') return;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}
export const data = () => db;
export function reset() { db = empty(); }
