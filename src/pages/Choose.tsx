import { useNavigate } from 'react-router';
import { Seo } from '@/components/Seo';
import { ClassCards, MediumCards, StreamCards } from '@/components/ChooseCards';
import { useLang } from '@/lib/hooks';
import { setClass, setMedium, setStream } from '@/lib/prefs';
import { track } from '@/lib/analytics';

/** Class → medium → (Class 12) stream. Every tap is saved; returning students skip this. */
export default function ChoosePage() {
  const { t, lang, prefs } = useLang();
  const nav = useNavigate();
  const step = !prefs.classId ? 'class' : !prefs.medium ? 'medium' : prefs.classId === 'class-12' && !prefs.stream ? 'stream' : 'done';
  return (
    <>
      <Seo title={t('choose.class.title')} description={t('choose.saved')} path="/choose" lang={lang} noindex />
      <div className="max-w-md mx-auto py-4 space-y-8">
        <section>
          <h1 className="h1 mb-3">{t('choose.class.title')}</h1>
          <ClassCards value={prefs.classId} onChange={(c) => { setClass(c); track('class_selected', { value: c }); }} />
        </section>
        {step !== 'class' && (
          <section>
            <h2 className="h2 mb-3">{t('choose.medium.title')}</h2>
            <MediumCards value={prefs.medium} onChange={(m) => { setMedium(m); track('medium_selected', { value: m }); }} />
          </section>
        )}
        {prefs.classId === 'class-12' && prefs.medium && (
          <section>
            <h2 className="h2 mb-3">{t('choose.stream.title')}</h2>
            <StreamCards value={prefs.stream} onChange={(s) => { setStream(s); track('stream_selected', { value: s }); }} />
          </section>
        )}
        {step === 'done' && (
          <button type="button" className="btn-primary" onClick={() => nav('/subjects')} data-testid="choose-continue">{t('action.continue')} →</button>
        )}
        <p className="muted">{t('choose.saved')}</p>
      </div>
    </>
  );
}
