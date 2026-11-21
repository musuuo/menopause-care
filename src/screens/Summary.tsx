import { useEffect, useMemo, useState } from 'react';
import { getAllLogs } from '../db';
import { addDays, formatFull, formatShort, todayKey } from '../date';
import { MOODS, SLEEPS } from '../defaults';
import { Choice, MedicalNotice, PageHeader } from '../components/Common';
import { navigate } from '../router';
import { useApp } from '../store';
import type { DailyLog } from '../types';
import { buildSummary, TREND_ICONS, TREND_LABELS } from '../logic/stats';
import { WARNING_TEXT } from '../logic/warnings';

type Preset = '30' | '90' | 'custom';
const PRINT_NOTE_LIMIT = 10; // A4 한 장에 들어가도록 인쇄할 때는 최근 메모만

export function Summary() {
  const today = todayKey();
  const { symptomDefs } = useApp();
  const [logs, setLogs] = useState<DailyLog[] | null>(null);
  const [preset, setPreset] = useState<Preset>('30');
  const [customStart, setCustomStart] = useState(addDays(today, -29));
  const [customEnd, setCustomEnd] = useState(today);

  useEffect(() => {
    getAllLogs().then(setLogs);
  }, []);

  let start = preset === 'custom' ? customStart : addDays(today, -(Number(preset) - 1));
  let end = preset === 'custom' ? customEnd : today;
  if (start > end) [start, end] = [end, start];

  const s = useMemo(() => (logs ? buildSummary(logs, symptomDefs, start, end) : null), [logs, symptomDefs, start, end]);

  return (
    <div className="page summary-page">
      <div className="no-print">
        <PageHeader title="병원용 요약" onBack={() => navigate('/records')} />
        <p className="hint">진료 받을 때 이 화면을 의사 선생님께 보여 드리거나 인쇄해 가세요.</p>
        <h2>기간</h2>
        <Choice<Preset>
          label="기간"
          options={[
            { value: '30', label: '최근 1달' },
            { value: '90', label: '최근 3달' },
            { value: 'custom', label: '직접 선택' },
          ]}
          value={preset}
          onChange={setPreset}
        />
        {preset === 'custom' && (
          <div className="date-pickers">
            <label>
              시작하는 날
              <input type="date" className="text-input" value={customStart} max={today} onChange={(e) => e.target.value && setCustomStart(e.target.value)} />
            </label>
            <label>
              끝나는 날
              <input type="date" className="text-input" value={customEnd} max={today} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} />
            </label>
          </div>
        )}
        <button className="btn btn-primary btn-block" onClick={() => window.print()}>
          <span aria-hidden="true">🖨️ </span>인쇄하기 / 파일로 저장
        </button>
      </div>

      {!s ? (
        <p className="loading">불러오는 중이에요…</p>
      ) : (
        <article className="report" aria-label="요약 내용">
          <h1 className="report-title">갱년기 증상 기록 요약</h1>
          <p className="report-meta">
            기간: {formatFull(s.start)} ~ {formatFull(s.end)} ({s.totalDays}일 중 {s.loggedDays}일 기록)
          </p>

          <h2>월경</h2>
          <table className="report-table">
            <tbody>
              <tr><th scope="row">마지막 월경일</th><td>{s.lastPeriod ? formatFull(s.lastPeriod) : '기록 없음'}</td></tr>
              <tr><th scope="row">이 기간 월경 일수</th><td>{s.periodDaysInRange}일</td></tr>
              <tr><th scope="row">최근 월경 간격</th><td>{s.recentCycle ? `${s.recentCycle}일` : '기록 부족'}</td></tr>
              {s.periodStarts.length > 0 && (
                <tr><th scope="row">이 기간 월경 시작일</th><td>{s.periodStarts.map(formatShort).join(', ')}</td></tr>
              )}
            </tbody>
          </table>

          <h2>증상</h2>
          <table className="report-table symptom-table">
            <thead>
              <tr><th scope="col">증상</th><th scope="col">있었던 날</th><th scope="col">보통 이상</th><th scope="col">추세</th></tr>
            </thead>
            <tbody>
              {s.symptoms.map((x) => (
                <tr key={x.def.id}>
                  <th scope="row">{x.def.label}</th>
                  <td>{x.recordedDays}일</td>
                  <td>{x.moderateDays}일</td>
                  <td className={`trend trend-${x.trend}`}>
                    <span aria-hidden="true">{TREND_ICONS[x.trend]} </span>{TREND_LABELS[x.trend]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-foot">추세는 기간 앞쪽 절반과 뒤쪽 절반의 평균을 비교한 것이에요.</p>

          <div className="report-two">
            <div>
              <h2>기분</h2>
              <table className="report-table">
                <tbody>
                  {[...MOODS].reverse().map((m) => (
                    <tr key={m.value}><th scope="row"><span aria-hidden="true">{m.face} </span>{m.label}</th><td>{s.mood[m.value]}일</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2>수면</h2>
              <table className="report-table">
                <tbody>
                  {SLEEPS.map((x) => (
                    <tr key={x.value}><th scope="row">{x.label}</th><td>{s.sleep[x.value]}일</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h2>병원 상담이 필요할 수 있는 기록</h2>
          {s.warnings.length ? (
            <ul className="report-list">
              {s.warnings.map((w) => (
                <li key={`${w.kind}-${w.start}`}>
                  {w.start === w.end ? formatShort(w.start) : `${formatShort(w.start)} ~ ${formatShort(w.end)}`}: {WARNING_TEXT[w.kind].title}
                </li>
              ))}
            </ul>
          ) : (
            <p>해당하는 기록이 없어요.</p>
          )}

          <h2>메모</h2>
          {s.notes.length ? (
            <ul className="report-list">
              {[...s.notes].reverse().map((n, i) => (
                <li key={n.date} className={i >= PRINT_NOTE_LIMIT ? 'no-print' : ''}>
                  <strong>{formatShort(n.date)}</strong> {n.note}
                </li>
              ))}
              {s.notes.length > PRINT_NOTE_LIMIT && (
                <li className="print-only">그 밖의 메모 {s.notes.length - PRINT_NOTE_LIMIT}개는 앱에서 볼 수 있어요.</li>
              )}
            </ul>
          ) : (
            <p>메모가 없어요.</p>
          )}

          <p className="report-foot">
            본인이 휴대폰 앱에 날마다 직접 기록한 내용입니다. 의학적 진단이 아닙니다. (만든 날: {formatFull(today)})
          </p>
        </article>
      )}
      <div className="no-print">
        <MedicalNotice />
      </div>
    </div>
  );
}
