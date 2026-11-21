import { DEFAULT_SYMPTOMS } from '../defaults';
import { buildSummary, compareTrend, periodSentence, periodStarts, series } from './stats';
import { days, log } from '../test/helpers';

const hot = DEFAULT_SYMPTOMS.find((s) => s.id === 'hotflash')!;
const fatigue = DEFAULT_SYMPTOMS.find((s) => s.id === 'fatigue')!;

describe('추세', () => {
  test('평균이 0.3단계 이상 바뀌면 늘어남/줄어듦', () => {
    const lv = (n: number) => days('2026-11-01', 5, () => ({ symptoms: { hotflash: n as 0 } }));
    expect(compareTrend(lv(1), lv(2), 'hotflash')).toBe('up');
    expect(compareTrend(lv(3), lv(1), 'hotflash')).toBe('down');
    expect(compareTrend(lv(2), lv(2), 'hotflash')).toBe('same');
  });
  test('어느 한쪽 기록이 3일보다 적으면 판단하지 않는다', () => {
    const a = days('2026-11-01', 2, () => ({ symptoms: { hotflash: 3 } }));
    const b = days('2026-11-10', 5, () => ({ symptoms: { hotflash: 0 } }));
    expect(compareTrend(a, b, 'hotflash')).toBe('unknown');
  });
});

test('그래프 아래 한 줄 요약', () => {
  const before = days('2026-10-25', 14, () => ({ symptoms: { hotflash: 3, fatigue: 1 } }));
  const after = days('2026-11-08', 14, () => ({ symptoms: { hotflash: 1, fatigue: 1 } }));
  const s = periodSentence([...before, ...after], [hot, fatigue], '2026-11-21', 14, '2주');
  expect(s).toBe('지난 2주보다 열감이 줄었어요, 피로가 비슷해요.');
  expect(periodSentence([], [hot], '2026-11-21', 14, '2주')).toContain('기록이 조금 더 필요해요');
});

test('월경 시작일은 출혈이 시작된 첫날 (중간에 기록을 하루 빠뜨려도 같은 월경)', () => {
  const ls = [
    log('2026-09-01', { flow: 2 }), log('2026-09-02', { flow: 3 }), log('2026-09-03', { flow: 1 }),
    log('2026-09-05', { flow: 1 }), // 9/4 기록이 빠졌지만 같은 월경
    log('2026-09-29', { flow: 2 }), log('2026-09-30', { flow: 2 }),
    log('2026-10-28', { flow: 1 }),
  ];
  expect(periodStarts(ls)).toEqual(['2026-09-01', '2026-09-29', '2026-10-28']);
});

describe('병원용 요약 집계', () => {
  const logs = [
    log('2026-08-20', { flow: 2 }), // 기간 밖 월경
    ...days('2026-09-23', 30, (i) => ({
      mood: (i < 10 ? 2 : 4) as 2 | 4,
      sleep: i % 3 === 0 ? 'bad' : 'good',
      flow: i >= 5 && i < 9 ? 2 : 0,
      symptoms: { hotflash: (i < 15 ? 3 : i < 25 ? 1 : 0) as 0 | 1 | 3, fatigue: 2 },
      note: i === 3 ? '  회사에서 땀이 많이 났다 ' : undefined,
    })),
    log('2026-10-25', { habits: { walk: true } }), // 습관만 기록한 날은 증상 통계에서 빠진다
  ];
  const s = buildSummary(logs, DEFAULT_SYMPTOMS, '2026-09-23', '2026-10-22');

  test('기간과 기록 일수', () => {
    expect(s.totalDays).toBe(30);
    expect(s.loggedDays).toBe(30);
  });
  test('월경: 마지막 월경일, 기간 내 일수, 최근 간격', () => {
    expect(s.lastPeriod).toBe('2026-10-01');
    expect(s.periodDaysInRange).toBe(4);
    expect(s.periodStarts).toEqual(['2026-09-28']);
    expect(s.recentCycle).toBe(39); // 8/20 → 9/28
  });
  test('증상: 있었던 날, 보통 이상, 추세', () => {
    const h = s.symptoms.find((x) => x.def.id === 'hotflash')!;
    expect(h.recordedDays).toBe(25);
    expect(h.moderateDays).toBe(15);
    expect(h.trend).toBe('down');
    const f = s.symptoms.find((x) => x.def.id === 'fatigue')!;
    expect([f.recordedDays, f.moderateDays, f.trend]).toEqual([30, 30, 'same']);
    const headache = s.symptoms.find((x) => x.def.id === 'headache')!;
    expect([headache.recordedDays, headache.trend]).toEqual([0, 'none']);
  });
  test('기분·수면 분포와 메모', () => {
    expect(s.mood).toEqual({ 1: 0, 2: 10, 3: 0, 4: 20, 5: 0 });
    expect(s.sleep).toEqual({ good: 20, ok: 0, bad: 10 });
    expect(s.notes).toEqual([{ date: '2026-09-26', note: '회사에서 땀이 많이 났다' }]);
  });
  test('숨긴 증상은 기록이 있을 때만 요약에 나온다', () => {
    const defs = DEFAULT_SYMPTOMS.map((d) => (d.id === 'fatigue' || d.id === 'headache' ? { ...d, hidden: true } : d));
    const ids = buildSummary(logs, defs, '2026-09-23', '2026-10-22').symptoms.map((x) => x.def.id);
    expect(ids).toContain('fatigue');
    expect(ids).not.toContain('headache');
  });
  test('기간 안의 주의 신호를 포함한다', () => {
    const s2 = buildSummary([...logs, log('2026-10-10', { flow: 4 })], DEFAULT_SYMPTOMS, '2026-09-23', '2026-10-22');
    expect(s2.warnings.map((w) => w.kind)).toEqual(['heavyFlow']);
  });
});

test('그래프 값: 기록 없는 날은 빈칸, 기록했지만 증상을 안 누른 날은 0', () => {
  const ls = [log('2026-11-01', { symptoms: { hotflash: 2 } }), log('2026-11-03', { mood: 3 })];
  expect(series(ls, 'hotflash', '2026-11-01', '2026-11-04')).toEqual([2, null, 0, null]);
});
