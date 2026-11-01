import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown instead of `label` on screens narrower than 360px */
  short?: ReactNode;
  lang?: string;
  testId?: string;
}

interface Props<T extends string> {
  value: T | null;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  label: string;
  icon?: ReactNode;
  testId?: string;
  className?: string;
}

/**
 * Pill-shaped segmented control: white container, 1.5px hairline, 44px tall; the active
 * segment is a gradient pill that slides (200ms) between options. role="radiogroup".
 */
export function Segmented<T extends string>({ value, options, onChange, label, icon, testId, className = '' }: Props<T>) {
  const idx = options.findIndex((o) => o.value === value);
  const n = options.length;
  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={label} data-testid={testId}>
      {icon && <span className="segmented-icon" aria-hidden="true">{icon}</span>}
      <div className="segmented-track" style={{ '--n': n } as React.CSSProperties}>
        {idx >= 0 && <span className="segmented-pill" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            lang={o.lang}
            data-testid={o.testId}
            className="segmented-option"
            onClick={() => onChange(o.value)}
          >
            {o.short ? (
              <>
                <span className="hidden min-[360px]:inline">{o.label}</span>
                <span className="min-[360px]:hidden">{o.short}</span>
              </>
            ) : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
