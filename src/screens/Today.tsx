import { useEffect, useRef, useState } from 'react';
import { getAllLogs, getDismissedWarnings, saveDismissedWarnings } from '../db';
import { addDays, formatLong, todayKey } from '../date';
import { FLOW_LABELS, LEVEL_LABELS, MOODS, SLEEPS } from '../defaults';
import { Choice } from '../components/Common';
import { WarningCards } from '../components/WarningCards';
import { navigate } from '../router';
import { useApp, visibleSorted } from '../store';
import { useDayLog } from '../useDayLog';
import type { Flow, Level, Mood, Sleep } from '../types';
import { detectWarnings, recentWarnings, warningId, type Warning } from '../logic/warnings';

const LEVEL_DOTS = ['○○○', '●○○', '●●○', '●●●'];

export function Today({ date: dateParam }: { date?: string }) {
  const today = todayKey();
  const date = dateParam && dateParam <= today ? dateParam : today;
  const isToday = date === today;
  const { symptomDefs } = useApp();
  const { log, update, version } = useDayLog(date);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  useEffect(() => {
    if (!isToday) return setWarnings([]);
    let alive = true;
    Promise.all([getAllLogs(), getDismissedWarnings()]).then(([logs, dismissed]) => {
      if (alive) setWarnings(recentWarnings(detectWarnings(logs), today, dismissed));
    });
    return () => {
      alive = false;
    };
  }, [isToday, today, version]);

  const dismiss = async (w: Warning) => {
    const ids = await getDismissedWarnings();
    await saveDismissedWarnings([...ids, warningId(w)]);
    setWarnings((ws) => ws.filter((x) => x !== w));
  };

  const goto = (d: string) => navigate(d === today ? '/today' : `/today/${d}`);

  return (
    <div className="page">
      <header className="today-header">
        <div className="day-nav">
          <button className="btn btn-small btn-secondary" onClick={() => goto(addDays(date, -1))}>
            ◀ {isToday ? '어제' : '전날'}
          </button>
          {!isToday && (
            <button className="btn btn-small btn-secondary" onClick={() => goto(addDays(date, 1))}>
              다음 날 ▶
            </button>
          )}
          <button className="icon-btn settings-btn" onClick={() => navigate('/settings')} aria-label="설정">
            <span aria-hidden="true">⚙️</span>
          </button>
        </div>
        <p className="date-title">{formatLong(date)}</p>
        <h1>{isToday ? '오늘 몸은 어떠세요?' : '이날 몸은 어떠셨어요?'}</h1>
        {!isToday && (
          <button className="link-btn" onClick={() => goto(today)}>
            오늘 기록으로 돌아가기
          </button>
        )}
      </header>

      <WarningCards warnings={warnings} onDismiss={dismiss} />

      {!log ? (
        <p className="loading">불러오는 중이에요…</p>
      ) : (
        <>
          <section className="section" aria-labelledby="mood-h">
            <h2 id="mood-h">기분</h2>
            <div className="mood-row" role="group" aria-label="기분">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  className={`mood-btn ${log.mood === m.value ? 'selected' : ''}`}
                  aria-pressed={log.mood === m.value}
                  aria-label={m.label}
                  onClick={() => update((l) => ({ ...l, mood: m.value as Mood }))}
                >
                  <span className="mood-face" aria-hidden="true">{m.face}</span>
                  <span className="mood-label" aria-hidden="true">{m.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="sym-h">
            <h2 id="sym-h">증상</h2>
            <p className="hint">누를 때마다 없음 → 조금 → 보통 → 심함 순서로 바뀌어요.</p>
            <div className="symptom-grid">
              {visibleSorted(symptomDefs).map((s) => {
                const level = (log.symptoms[s.id] ?? 0) as Level;
                return (
                  <button
                    key={s.id}
                    className={`symptom-card level-${level}`}
                    aria-label={`${s.label}, 지금 ${LEVEL_LABELS[level]}`}
                    onClick={() =>
                      update((l) => ({ ...l, symptoms: { ...l.symptoms, [s.id]: ((level + 1) % 4) as Level } }))
                    }
                  >
                    <span className="symptom-icon" aria-hidden="true">{s.icon}</span>
                    <span className="symptom-name">{s.label}</span>
                    <span className="symptom-level" aria-hidden="true">
                      <span className="dots">{LEVEL_DOTS[level]}</span> {LEVEL_LABELS[level]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="section" aria-labelledby="sleep-h">
            <h2 id="sleep-h">어젯밤 잠은?</h2>
            <Choice<Sleep>
              label="어젯밤 잠"
              options={SLEEPS.map((s) => ({ value: s.value, label: s.label, icon: s.icon }))}
              value={log.sleep}
              onChange={(v) => update((l) => ({ ...l, sleep: v }))}
            />
          </section>

          <section className="section" aria-labelledby="flow-h">
            <h2 id="flow-h">월경</h2>
            <Choice<Flow>
              label="월경 양"
              options={FLOW_LABELS.map((label, i) => ({ value: i as Flow, label }))}
              value={log.flow}
              onChange={(v) => update((l) => ({ ...l, flow: v }))}
            />
          </section>

          <section className="section" aria-labelledby="note-h">
            <h2 id="note-h">메모 <span className="optional">(쓰고 싶을 때만)</span></h2>
            <NoteInput
              key={date}
              initial={log.note ?? ''}
              onSave={(note) => update((l) => ({ ...l, note: note || undefined }), '메모를 저장했어요 ✓')}
            />
          </section>
        </>
      )}
    </div>
  );
}

function NoteInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);
  const timer = useRef<number | undefined>(undefined);

  const flush = (v: string) => {
    window.clearTimeout(timer.current);
    if (v.trim() === saved.current.trim()) return;
    saved.current = v;
    onSave(v.trim());
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <input
      className="text-input"
      type="text"
      aria-labelledby="note-h"
      placeholder="예: 오늘 회사에서 열이 많이 났어요"
      maxLength={200}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => flush(v), 1200);
      }}
      onBlur={() => flush(value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}
