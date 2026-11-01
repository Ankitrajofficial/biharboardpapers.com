import { describe, expect, it } from 'vitest';
import { hasAccess, objectiveUnlocked, planActive, type Account } from '@/lib/access';
import { plans, planForClass } from '@/config/plans';
import { planPrices } from '../server/payments.ts';
import { planExpiry } from '@/lib/dates';
import { siteConfig } from '@/config/site';

const acct = (id: 'matric' | 'inter' | 'all', validTill: string): Account => ({ id: 'u1', phone: '919999999999', phoneMasked: '99•••••999', identityMasked: '+91 99•••••999', loginChannel: 'whatsapp', contactPhone: null, email: null, name: null, classId: null, medium: null, stream: null, consent: null, receipts: [], plan: { id, validTill, activatedAt: '2026-11-01', receiptId: 'R1', txnid: 'T1', amountPaid: 149, orderId: 'T1', refund: null } });

describe('plan locking and expiry', () => {
  const now = new Date('2026-12-01T10:00:00');

  it('free questions per chapter are open without any plan', () => {
    for (let i = 0; i < siteConfig.freeObjectivePerChapter; i++) expect(objectiveUnlocked(i, null, 'class-12', now)).toBe(true);
    expect(objectiveUnlocked(siteConfig.freeObjectivePerChapter, null, 'class-12', now)).toBe(false);
  });

  it('Matric plan unlocks Class 10 only; All Access unlocks both', () => {
    const m = acct('matric', '2027-02-25');
    expect(hasAccess(m, 'class-10', now)).toBe(true);
    expect(hasAccess(m, 'class-12', now)).toBe(false);
    const all = acct('all', '2027-02-25');
    expect(hasAccess(all, 'class-10', now)).toBe(true);
    expect(hasAccess(all, 'class-12', now)).toBe(true);
  });

  it('a refunded plan gives no access', () => {
    const a = acct('inter', '2027-02-11');
    a.plan!.refund = 'refunded';
    expect(planActive(a, now)).toBe(false);
  });

  it('plan expires at the end of the exam end date', () => {
    const a = acct('inter', '2027-02-11');
    expect(planActive(a, new Date('2027-02-11T20:00:00'))).toBe(true);
    expect(planActive(a, new Date('2027-02-12T00:00:01'))).toBe(false);
    expect(objectiveUnlocked(9, a, 'class-12', new Date('2027-03-01'))).toBe(false);
  });

  it('expiry is derived from the exam calendar, not hard-coded', () => {
    const cal = { _comment: '', updated: '', exams: [
      { class: 'class-12' as const, year: 2027, status: 'expected' as const, start: '2027-02-01', end: '2027-02-11', sourceUrl: '' },
      { class: 'class-10' as const, year: 2027, status: 'expected' as const, start: '2027-02-17', end: '2027-02-25', sourceUrl: '' },
    ] };
    expect(planExpiry(cal, ['class-12'], now)).toBe('2027-02-11');
    expect(planExpiry(cal, ['class-10', 'class-12'], now)).toBe('2027-02-25');
  });

  it('server prices match the frontend plan config', () => {
    for (const p of plans) expect(planPrices[p.id].priceInr, p.id).toBe(p.priceInr);
    expect(planForClass('class-10').priceInr).toBe(149);
    expect(planForClass('class-12').priceInr).toBe(199);
  });
});
