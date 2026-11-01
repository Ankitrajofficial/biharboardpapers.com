import { siteConfig } from '@/config/site';

interface Props {
  title: string;
  description: string;
  path: string;
  /** Alternate-language URL pairs for hreflang */
  alternates?: { hi?: string; en?: string };
  lang: 'hi' | 'en';
  jsonLd?: object | object[];
  noindex?: boolean;
}

/**
 * React 19 hoists <title>, <meta> and <link> into <head> on both server and client,
 * so each page simply renders its own tags.
 */
export function Seo({ title, description, path, alternates, lang, jsonLd, noindex }: Props) {
  const url = siteConfig.origin + path;
  const fullTitle = title.includes(siteConfig.name.en) || title.includes(siteConfig.name.hi) ? title : `${title} | ${siteConfig.name[lang]}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      {alternates?.hi && <link rel="alternate" hrefLang="hi" href={siteConfig.origin + alternates.hi} />}
      {alternates?.en && <link rel="alternate" hrefLang="en" href={siteConfig.origin + alternates.en} />}
      {alternates?.hi && <link rel="alternate" hrefLang="x-default" href={siteConfig.origin + alternates.hi} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${siteConfig.origin}/og.png`} />
      <meta property="og:locale" content={lang === 'hi' ? 'hi_IN' : 'en_IN'} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  );
}
