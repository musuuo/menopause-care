import { useEffect, useMemo, useState } from 'react';
import { getLogsInRange } from '../db';
import { addDays, formatShort, fromKey, toKey, todayKey } from '../date';
import { FLOW_LABELS, MOODS } from '../defaults';
import { Choice, PageHeader } from '../components/Common';
import { LineChart } from '../components/LineChart';
import { navigate } from '../router';
import { useApp, visibleSorted } from '../store';
import type { DailyLog } from '../types';
import { periodSentence, series } from '../logic/stats';
import { shortLabel } from '../logic/text';

type View = 'calendar' | 'graph';

export function Records() {
  const [view, setView] = useState<View>(() => (sessionStorageGet('records-view') as View) || 'calendar');
  const choose = (v: View) => {
    setView(v);
    sessionStorageSet('records-view', v);
  };
  return (
    <div className="page">
      <PageHeader title="기록" />
      <Choice<View>
        label="보는 방법"
        columns={2}
        options={[
          { value: 'calendar', label: '달력', icon: '📅' },
          { value: 'graph', label: '그래프', icon: '📈' },
        ]}
        value={view}
        onChange={choose}
      />
      <button className="btn btn-primary btn-block summary-btn" onClick={() => navigate('/records/summary')}>
        <span aria-hidden="true">🏥 </span>병원용 요약 보기
      </button>
      {view === 'calendar' ? <CalendarView /> : <GraphView />}
    </div>
  );
}

function sessionStorageGet(k: string) {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function sessionStorageSet(k: string, v: string) {
  try { sessionStorage.setItem(k, v); } catch { /* 저장 못 해도 괜찮다 */ }
}

const moodFace = (m?: number) => MOODS.find((x) => x.value === m);

function CalendarView() {
  const today = todayKey();
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "YYYY-MM"
  const [logs, setLogs] = useState<Map<string, DailyLog>>(new Map());

  const first = `${month}-01`;
  const firstDate = fromKey(first);
  const lastDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0, 12);
  const last = toKey(lastDate);

  useEffect(() => {
    let alive = true;
    getLogsInRange(first, last).then((ls) => alive && setLogs(new Map(ls.map((l) => [l.date, l]))));
    return () => {
      alive = false;
    };
  }, [first, last]);

  const shiftMonth = (n: number) => {
    const d = new Date(firstDate.getFullYear(), firstDate.getMonth() + n, 1, 12);
    setMonth(toKey(d).slice(0, 7));
  };

  const blanks = firstDate.getDay();
  const days = lastDate.getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: days }, (_, i) => addDays(first, i)),
  ];

  return (
    <section className="section" aria-label="달력">
      <div className="month-nav">
        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="지난달">
          <span aria-hidden="true">◀</span>
        </button>
        <h2>{firstDate.getFullYear()}년 {firstDate.getMonth() + 1}월</h2>
        <button
          className="icon-btn"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
          disabled={month >= today.slice(0, 7)}
        >
          <span aria-hidden="true">▶</span>
        </button>
      </div>
      <div className="calendar">
        {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
          <div key={w} className={`cal-weekday ${i === 0 ? 'sun' : ''}`} aria-hidden="true">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} />;
          const l = logs.get(d);
          const m = moodFace(l?.mood);
          const bleed = (l?.flow ?? 0) > 0;
          const future = d > today;
          const label = [
            formatShort(d),
            m ? `기분 ${m.label}` : null,
            bleed ? `월경 ${FLOW_LABELS[l!.flow!]}` : null,
            l ? '기록 있음' : '기록 없음',
          ].filter(Boolean).join(', ');
          return (
            <button
              key={d}
              className={`cal-day ${d === today ? 'today' : ''} ${l ? 'has-log' : ''}`}
              disabled={future}
              aria-label={label}
              onClick={() => navigate(d === today ? '/today' : `/today/${d}`)}
            >
              <span className="cal-num">{Number(d.slice(8))}</span>
              <span className="cal-mood" aria-hidden="true">{m?.face ?? ''}</span>
              {bleed && <span className="cal-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="legend">
        <span className="cal-dot inline" aria-hidden="true" /> 월경이 있던 날 · 얼굴은 그날 기분이에요.
        <br />날짜를 누르면 그날 기록을 보고 고칠 수 있어요.
      </p>
    </section>
  );
}

const PERIODS = [
  { value: 14, label: '2주' },
  { value: 30, label: '1달' },
  { value: 90, label: '3달' },
] as const;

function GraphView() {
  const today = todayKey();
  const { symptomDefs } = useApp();
  const visible = visibleSorted(symptomDefs);
  const [days, setDays] = useState<14 | 30 | 90>(14);
  const [logs, setLogs] = useState<DailyLog[] | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [limitMsg, setLimitMsg] = useState(false);

  const start = addDays(today, -(days - 1));

  useEffect(() => {
    let alive = true;
    // 한 줄 요약에서 바로 앞 기간과 비교하므로 두 배 길이를 불러온다
    getLogsInRange(addDays(today, -(days * 2 - 1)), today).then((ls) => alive && setLogs(ls));
    return () => {
      alive = false;
    };
  }, [days, today]);

  // 처음에는 이번 기간에 가장 많이 기록된 증상을 최대 3개 골라 둔다
  useEffect(() => {
    if (!logs || selected) return;
    const cur = logs.filter((l) => l.date >= start);
    const scored = visible
      .map((s) => ({ id: s.id, score: cur.reduce((n, l) => n + (l.symptoms[s.id] ?? 0), 0) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.id);
    setSelected(scored.length ? scored : visible.slice(0, 1).map((s) => s.id));
  }, [logs, selected, start, visible]);

  const sel = (selected ?? []).map((id) => symptomDefs.find((s) => s.id === id)).filter((s) => !!s);
  const periodName = PERIODS.find((p) => p.value === days)!.label;

  const chartSeries = useMemo(
    () => (logs ? sel.map((s) => ({ name: shortLabel(s.label), values: series(logs, s.id, start, today) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, selected, start, today],
  );

  const toggle = (id: string) => {
    const cur = selected ?? [];
    if (cur.includes(id)) {
      setSelected(cur.filter((x) => x !== id));
      setLimitMsg(false);
    } else if (cur.length >= 3) {
      setLimitMsg(true);
    } else {
      setSelected([...cur, id]);
      setLimitMsg(false);
    }
  };

  return (
    <section className="section" aria-label="그래프">
      <h2>기간</h2>
      <Choice<14 | 30 | 90> label="기간" options={[...PERIODS]} value={days} onChange={setDays} />

      {logs && (
        <>
          <div className="chart-card">
            <LineChart series={chartSeries} start={start} end={today} />
            <p className="chart-summary">
              <span aria-hidden="true">💬 </span>
              {periodSentence(logs, sel, today, days, periodName)}
            </p>
          </div>

          <h2>볼 증상 고르기 <span className="optional">(3개까지)</span></h2>
          {limitMsg && <p className="hint strong" role="alert">3개까지 고를 수 있어요. 하나를 빼고 다시 골라 주세요.</p>}
          <div className="chip-list">
            {visible.map((s) => {
              const on = (selected ?? []).includes(s.id);
              return (
                <button key={s.id} className={`chip ${on ? 'selected' : ''}`} aria-pressed={on} onClick={() => toggle(s.id)}>
                  <span aria-hidden="true">{on ? '✓ ' : ''}{s.icon} </span>
                  {shortLabel(s.label)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
