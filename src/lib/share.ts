import { siteConfig } from '@/config/site';

export const whatsappUrl = (text: string, number?: string) =>
  number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;

export const mailtoUrl = (subject: string, body: string) =>
  `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const absoluteUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
    return window.location.origin + path;
  return siteConfig.origin + path;
};

export const reportUrl = (text: string) => whatsappUrl(text, siteConfig.contact.whatsappNumber);
export const doubtUrl = (text: string) => whatsappUrl(text, siteConfig.contact.whatsappNumber);

export const formatBytes = (n: number) => {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
