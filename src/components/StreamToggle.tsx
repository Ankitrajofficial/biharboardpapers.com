import { Segmented } from './Segmented';
import { useLang } from '@/lib/hooks';
import { setStream } from '@/lib/prefs';
import type { Stream } from '@/content/types';

/** Class 12 only: Arts | Science | Commerce, shown above the subject grid. */
export function StreamToggle() {
  const { t, prefs } = useLang();
  if (prefs.classId !== 'class-12') return null;
  return (
    <Segmented<Stream>
      value={prefs.stream}
      label={t('choose.stream.title')}
      testId="stream-toggle"
      className="mb-3"
      options={[
        { value: 'arts', label: t('stream.arts'), testId: 'stream-arts' },
        { value: 'science', label: t('stream.science'), testId: 'stream-science' },
        { value: 'commerce', label: t('stream.commerce'), testId: 'stream-commerce' },
      ]}
      onChange={setStream}
    />
  );
}
