import { use, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import type { ClassId } from '@/content/types';
import { loadExamCalendar } from '@/content/loader';
import { publicGet } from '@/lib/publicApi';
import type { ExamCalendar } from '@/content/types';
import { daysUntil, formatDate, upcomingExam } from '@/lib/dates';
import { useLang, useHydrated } from '@/lib/hooks';

export function Countdown({ classId }: { classId: ClassId }) {
  const { t, lang } = useLang();
  const fileCal = use(loadExamCalendar());
  const [live, setLive] = useState<ExamCalendar | null>(null);
  useEffect(() => { publicGet<ExamCalendar>('/exam-calendar', 300).then((c) => c.exams?.length && setLive(c)).catch(() => {}); }, []);
  const cal = live ?? fileCal;
  const hydrated = useHydrated();
  const exam = upcomingExam(cal, classId);
  if (!exam) return null;
  const days = hydrated ? daysUntil(exam.start) : null;
  const running = days !== null && days <= 0 && daysUntil(exam.end) >= 0;
  const over = days !== null && daysUntil(exam.end) < 0;
  return (
    <Link to="/exam-calendar" className="card-tap min-h-[96px] gap-4" data-testid="countdown">
      <span className="icon"><CalendarDays size={22} aria-hidden="true" /></span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[18px] leading-snug">
          {over ? t('home.countdown.done') : running ? t('home.countdown.running') : (
            <>
              {t('home.countdown.title')} <span className="text-[26px] tabular-nums inline-block min-w-[2.2ch] text-center">{days ?? '…'}</span> {t('home.countdown.days')}
            </>
          )}
        </p>
        <p className="muted">
          {t(classId === 'class-10' ? 'class.10' : 'class.12')} · {formatDate(exam.start, lang)} · {exam.status === 'official' ? t('home.countdown.official') : t('home.countdown.expected')}
        </p>
      </div>
    </Link>
  );
}
