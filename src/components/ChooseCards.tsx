import { GraduationCap, Languages, Palette, FlaskConical, Briefcase } from 'lucide-react';
import type { ClassId, Medium, Stream } from '@/content/types';
import { useLang } from '@/lib/hooks';

type CardProps = { selected?: boolean; onClick: () => void; children: React.ReactNode; testId?: string };
function BigCard({ selected, onClick, children, testId }: CardProps) {
  return (
    <button type="button" data-testid={testId} aria-pressed={selected} onClick={onClick} className={`card-tap min-h-[72px] text-[18px] font-bold ${selected ? 'selected' : ''}`}>
      {children}
    </button>
  );
}

export function ClassCards({ value, onChange }: { value: ClassId | null; onChange: (c: ClassId) => void }) {
  const { t } = useLang();
  return (
    <div className="grid gap-3" role="group" aria-label={t('choose.class.title')}>
      <BigCard testId="choose-class-10" selected={value === 'class-10'} onClick={() => onChange('class-10')}>
        <GraduationCap aria-hidden="true" /> {t('choose.class.10')}
      </BigCard>
      <BigCard testId="choose-class-12" selected={value === 'class-12'} onClick={() => onChange('class-12')}>
        <GraduationCap aria-hidden="true" /> {t('choose.class.12')}
      </BigCard>
    </div>
  );
}

export function MediumCards({ value, onChange }: { value: Medium | null; onChange: (m: Medium) => void }) {
  const { t } = useLang();
  return (
    <div className="grid gap-3" role="group" aria-label={t('choose.medium.title')}>
      <BigCard testId="choose-medium-hindi" selected={value === 'hindi'} onClick={() => onChange('hindi')}>
        <Languages aria-hidden="true" /> <span lang="hi">{t('choose.medium.hindi')}</span>
      </BigCard>
      <BigCard testId="choose-medium-english" selected={value === 'english'} onClick={() => onChange('english')}>
        <Languages aria-hidden="true" /> <span lang="en">{t('choose.medium.english')}</span>
      </BigCard>
    </div>
  );
}

export function StreamCards({ value, onChange }: { value: Stream | null; onChange: (s: Stream) => void }) {
  const { t } = useLang();
  return (
    <div className="grid gap-3" role="group" aria-label={t('choose.stream.title')}>
      <BigCard testId="choose-stream-arts" selected={value === 'arts'} onClick={() => onChange('arts')}>
        <Palette aria-hidden="true" /> {t('choose.stream.arts')}
      </BigCard>
      <BigCard testId="choose-stream-science" selected={value === 'science'} onClick={() => onChange('science')}>
        <FlaskConical aria-hidden="true" /> {t('choose.stream.science')}
      </BigCard>
      <BigCard testId="choose-stream-commerce" selected={value === 'commerce'} onClick={() => onChange('commerce')}>
        <Briefcase aria-hidden="true" /> {t('choose.stream.commerce')}
      </BigCard>
    </div>
  );
}
