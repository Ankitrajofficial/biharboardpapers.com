import { ExternalLink } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useLang } from '@/lib/hooks';
import { siteConfig } from '@/config/site';

/** Placeholder until the admit-card feature ships; points to the official source. */
export default function AdmitCardPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('nav.admitCard')} description={t('admitCard.soon')} path="/admit-card" lang={lang} noindex />
      <h1 className="h1 py-4">{t('nav.admitCard')}</h1>
      <div className="notice-card space-y-3 max-w-md" data-testid="admit-card-page">
        <p>{t('admitCard.soon')}</p>
        <a className="btn-secondary" href={siteConfig.official.admitCard} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden="true" /> {t('home.official.admit')} (BSEB) ↗</a>
      </div>
    </>
  );
}
