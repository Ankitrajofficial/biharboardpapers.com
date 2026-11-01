/**
 * Single place for identity, links and switches. Nothing here is hard-coded in the UI.
 * The site is an independent study website by AR Group Ventures and is NOT affiliated
 * with the Bihar School Examination Board.
 */
export const siteConfig = {
  name: { hi: 'बिहार बोर्ड पढ़ाई', en: 'Bihar Board Padhai' },
  shortName: 'BB Padhai',
  tagline: { hi: 'कक्षा 10 और 12 की तैयारी', en: 'Class 10 & 12 Preparation' },
  owner: 'AR Group Ventures',
  /** Canonical origin used for SEO tags, sitemap and share links */
  origin: 'https://biharboardpadhai.in',
  /** Thin optional glow on the active item. The site looks complete with this off. */
  accents: true,
  /** Objective questions shown free per chapter before the plan lock appears */
  freeObjectivePerChapter: 5,
  /** First exam year this edition targets (used in titles like "... 2027") */
  targetExamYear: 2027,
  contact: {
    /** Number in international format without '+', used for doubts and mistake reports */
    whatsappNumber: '919999999999',
    email: 'help@biharboardpadhai.in',
    whatsappChannel: 'https://whatsapp.com/channel/REPLACE_WITH_CHANNEL_ID',
    telegramGroup: 'https://t.me/REPLACE_WITH_GROUP',
  },
  official: {
    home: 'https://biharboardonline.bihar.gov.in',
    results: 'https://biharboardonline.bihar.gov.in',
    admitCard: 'https://biharboardonline.bihar.gov.in',
    registration: 'https://biharboardonline.bihar.gov.in',
    notices: 'https://biharboardonline.bihar.gov.in',
    modelPaperInter: 'https://biharboardonline.com/modelpaperinter.html',
    modelPaperMatric: 'https://biharboardonline.com/modelpapermatric.html',
  },
  analytics: {
    provider: (import.meta.env?.VITE_ANALYTICS_PROVIDER ?? 'none') as 'none' | 'plausible' | 'umami' | 'cloudflare',
    domain: import.meta.env?.VITE_ANALYTICS_DOMAIN ?? '',
    script: import.meta.env?.VITE_ANALYTICS_SCRIPT ?? '',
  },
  payments: {
    razorpayKeyId: import.meta.env?.VITE_RAZORPAY_KEY_ID ?? '',
  },
} as const;

export type SiteConfig = typeof siteConfig;
