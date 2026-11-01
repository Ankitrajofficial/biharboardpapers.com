import type { ClassId } from '@/content/types';
import { planById } from '@/config/plans';
import { siteConfig } from '@/config/site';

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
export interface Receipt { orderId: string; planId: string; kind: 'new' | 'upgrade'; amount: number; status: string; receiptId: string | null; at: string }
export interface Account {
  id: string;
  phone: string | null;
  phoneMasked: string | null;
  identityMasked: string;
  loginChannel: 'whatsapp' | 'email';
  contactPhone: string | null;
  email: string | null;
  name: string | null;
  classId: string | null;
  medium: string | null;
  stream: string | null;
  consent: { granted: boolean; at: string } | null;
  district?: string | null;
  leaderboardOptIn?: boolean;
  plan: Entitlement | null;
  receipts: Receipt[];
}

export type Feature = 'objective_full' | 'important' | 'mock_full' | 'sentup' | 'pdf';

/** A plan is active when it exists, is not refunded, and its validTill (board exam end) has not passed. */
export function planActive(account: Account | null, now = new Date()): boolean {
  if (!account?.plan || account.plan.refund === 'refunded') return false;
  return new Date(account.plan.validTill + 'T23:59:59').getTime() >= now.getTime();
}

/** Does the account's plan unlock this class? */
export function hasAccess(account: Account | null, classId: ClassId, now = new Date()): boolean {
  if (!planActive(account, now)) return false;
  const plan = planById(account!.plan!.id);
  return !!plan && plan.classes.includes(classId);
}

/** Objective question index `i` (0-based) is free below the free limit; beyond it the plan is needed. */
export function objectiveUnlocked(i: number, account: Account | null, classId: ClassId, now = new Date()): boolean {
  if (i < siteConfig.freeObjectivePerChapter) return true;
  return hasAccess(account, classId, now);
}

export function featureUnlocked(feature: Feature, account: Account | null, classId: ClassId, now = new Date()): boolean {
  void feature; // every paid feature is unlocked by the class plan
  return hasAccess(account, classId, now);
}

/** Plan expired (had one, now past validTill)? Used for the "your plan has ended" line. */
export const planEnded = (account: Account | null, now = new Date()) => !!account?.plan && !planActive(account, now);
