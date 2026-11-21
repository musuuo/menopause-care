import { useEffect, useState } from 'react';
import { getLogsInRange } from '../db';
import { addDays, formatLong, todayKey } from '../date';
import { PageHeader } from '../components/Common';
import { navigate } from '../router';
import { useApp, visibleSorted } from '../store';
import { useDayLog } from '../useDayLog';
import type { DailyLog } from '../types';
import { habitStreak, weekRate } from '../logic/habits';

function cheer(done: number, total: number): string {
  if (total === 0) return '설정에서 챙기고 싶은 습관을 골라 보세요.';
  if (done === total) return '오늘 모두 챙기셨어요! 정말 잘하셨어요 👏';
  if (done > 0) return '좋아요, 잘하고 계세요. 하나만 더 해 볼까요?';
  return '오늘도 괜찮아요. 하나만 해 봐도 충분해요.';
}

export function Habits() {
  const today = todayKey();
  const { habitDefs } = useApp();
  const habits = visibleSorted(habitDefs);
  const { log, update, version } = useDayLog(today);
  const [recent, setRecent] = useState<DailyLog[]>([]);

  useEffect(() => {
    let alive = true;
    getLogsInRange(addDays(today, -400), today).then((ls) => alive && setRecent(ls));
    return () => {
      alive = false;
    };
  }, [today, version]);

  const done = log ? habits.filter((h) => log.habits[h.id]).length : 0;
  const streak = habitStreak(recent, habitDefs, today);
  const rate = weekRate(recent, habitDefs, today);

  return (
    <div className="page">
      <PageHeader
        title="오늘의 습관"
        right={
          <button className="btn btn-small btn-secondary" onClick={() => navigate('/settings/habits')}>
            항목 바꾸기
          </button>
        }
      />
      <p className="date-title">{formatLong(today)}</p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">연속으로 챙긴 날</span>
          <span className="stat-value">{streak}일</span>
          <span className="stat-sub">{streak === 0 ? '오늘부터 시작해요' : '꾸준히 하고 계세요'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">이번 주 달성률</span>
          <span className="stat-value">{rate}%</span>
          <div className="bar" role="progressbar" aria-label="이번 주 달성률" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
            <div className="bar-fill" style={{ width: `${rate}%` }} />
          </div>
        </div>
      </div>

      <p className="cheer" aria-live="polite">{cheer(done, habits.length)}</p>

      {log && (
        <ul className="habit-list">
          {habits.map((h) => {
            const on = !!log.habits[h.id];
            return (
              <li key={h.id}>
                <button
                  className={`habit-item ${on ? 'done' : ''}`}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() =>
                    update((l) => ({ ...l, habits: { ...l.habits, [h.id]: !on } }), on ? '체크를 뺐어요' : '잘하셨어요 ✓')
                  }
                >
                  <span className="habit-check" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="habit-icon" aria-hidden="true">{h.icon}</span>
                  <span className="habit-label">{h.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hint">연속으로 챙긴 날은 습관을 하나라도 한 날을 세요.</p>
    </div>
  );
}
