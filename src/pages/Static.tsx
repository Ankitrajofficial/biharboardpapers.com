import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { siteConfig } from '@/config/site';
import { useLang } from '@/lib/hooks';

export function AboutPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('about.title')} description={t('about.body')} path="/about" lang={lang} />
      <article className="max-w-2xl py-4 space-y-4">
        <h1 className="h1">{t('about.title')}</h1>
        <p>{t('about.body')}</p>
        <p>{t('about.team')}</p>
        <p className="card p-4" lang="hi">{t('footer.disclaimer')}</p>
        <p className="card p-4" lang="en">This is an independent study website by AR Group Ventures. It is not affiliated with or endorsed by the Bihar School Examination Board. For official notices, results and admit cards, always visit <a className="link" href={siteConfig.official.home}>biharboardonline.bihar.gov.in</a>.</p>
      </article>
    </>
  );
}

const privacy = {
  hi: [
    ['क्या सेव होता है', 'बिना लॉगिन के: आपकी कक्षा, माध्यम, स्ट्रीम, पढ़े हुए अध्याय, बुकमार्क और टेस्ट के अंक सिर्फ़ आपके फ़ोन में (localStorage) रहते हैं। हमारे सर्वर पर नहीं जाते।'],
    ['लॉगिन करने पर', 'सिर्फ़ आपका मोबाइल नंबर या ईमेल, नाम (अगर आप दें), कक्षा, माध्यम, स्ट्रीम, खरीदा गया प्लान और आपकी प्रगति (ताकि दूसरे फ़ोन पर मिल सके)। हम आधार या कोई पहचान-पत्र कभी नहीं माँगते।'],
    ['भुगतान', 'भुगतान Razorpay/Cashfree जैसी कंपनी के ज़रिये होता है। कार्ड या UPI की जानकारी हमारे पास नहीं आती। हमें सिर्फ़ भुगतान की पुष्टि मिलती है।'],
    ['उपयोग के आँकड़े', 'हम बिना कुकी वाली गिनती रखते हैं — जैसे कितने लोगों ने कौन-सा अध्याय खोला। इसमें आपका नाम या नंबर नहीं होता।'],
    ['WhatsApp', 'सवाल पूछने या गलती बताने पर WhatsApp खुलता है; संदेश आप खुद भेजते हैं।'],
    ['खाता हटाना', '"मेरी पढ़ाई" में "मेरा खाता हटाएँ" दबाते ही आपका खाता, प्लान और प्रगति हमेशा के लिए हट जाती है।'],
    ['संपर्क', `कोई सवाल हो तो ${siteConfig.contact.email} पर लिखें।`],
  ],
  en: [
    ['What is saved', 'Without login: your class, medium, stream, completed chapters, bookmarks and test scores stay only on your phone (localStorage). They are not sent to our server.'],
    ['When you login', 'Only your mobile number or email, name (if you give it), class, medium, stream, the plan you bought and your progress (so it is available on another phone). We never ask for Aadhaar or any ID.'],
    ['Payments', 'Payments are processed by a company like Razorpay/Cashfree. Your card or UPI details never reach us. We only receive a confirmation of payment.'],
    ['Usage counts', 'We keep cookieless counts — for example how many people opened which chapter. These contain no name or number.'],
    ['WhatsApp', 'Asking a doubt or reporting a mistake opens WhatsApp; you send the message yourself.'],
    ['Deleting your account', 'Press "Delete my account" in "My Study" and your account, plan and progress are removed permanently.'],
    ['Contact', `Write to ${siteConfig.contact.email} for any question.`],
  ],
};

export function PrivacyPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('privacy.title')} description={privacy[lang][0][1]} path="/privacy" lang={lang} />
      <article className="max-w-2xl py-4 space-y-4">
        <h1 className="h1">{t('privacy.title')}</h1>
        {privacy[lang].map(([h, b]) => (<section key={h}><h2 className="h2">{h}</h2><p>{b}</p></section>))}
        <p className="muted">{t('chapter.lastReviewed')}: 2026-11-01</p>
      </article>
    </>
  );
}

export function DisclaimerPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('disclaimer.title')} description={t('footer.disclaimer')} path="/disclaimer" lang={lang} />
      <article className="max-w-2xl py-4 space-y-4">
        <h1 className="h1">{t('disclaimer.title')}</h1>
        <p lang="hi">{t('footer.disclaimer')}</p>
        <p lang="en">This is an independent study website by AR Group Ventures. It is not affiliated with or endorsed by the Bihar School Examination Board. For official notices, results and admit cards, always visit <a className="link" href={siteConfig.official.home}>biharboardonline.bihar.gov.in</a>.</p>
        <p>{t('chapter.sampleBadge')}: {t('subject.verify')}</p>
      </article>
    </>
  );
}

export function OfflinePage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('offline.title')} description={t('offline.body')} path="/offline" lang={lang} noindex />
      <div className="max-w-md py-8 space-y-4">
        <h1 className="h1">{t('offline.title')}</h1>
        <p>{t('offline.body')}</p>
        <Link to="/my-study" className="btn-primary">{t('nav.myStudy')}</Link>
      </div>
    </>
  );
}

export function NotFoundPage() {
  const { t, lang } = useLang();
  return (
    <>
      <Seo title={t('notFound.title')} description={t('notFound.body')} path="/404" lang={lang} noindex />
      <div className="max-w-md py-8 space-y-4" data-testid="not-found">
        <h1 className="h1">{t('notFound.title')}</h1>
        <p>{t('notFound.body')}</p>
        <Link to="/" className="btn-primary">{t('action.home')}</Link>
        <Link to="/subjects" className="btn-secondary">{t('nav.subjects')}</Link>
      </div>
    </>
  );
}
