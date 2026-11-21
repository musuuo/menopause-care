import type { ReactNode } from 'react';
import { MEDICAL_NOTICE } from '../defaults';

export function MedicalNotice() {
  return (
    <p className="notice" role="note">
      <span aria-hidden="true">ℹ️ </span>
      {MEDICAL_NOTICE}
    </p>
  );
}

export function PageHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="page-header">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로 가기">
          <span aria-hidden="true">◀</span>
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/** 여러 개 중 하나를 고르는 큰 버튼 묶음 */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 3,
}: {
  label: string;
  options: { value: T; label: string; icon?: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div className="choice" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={`choice-btn ${value === o.value ? 'selected' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <span className="choice-icon" aria-hidden="true">{o.icon}</span>}
          <span>{o.label}</span>
          {value === o.value && <span className="check" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  );
}
