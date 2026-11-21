import { addDays, dateRange, daysBetween } from '../date';
import type { DailyLog, ItemDef, Mood, Sleep } from '../types';
import { detectWarnings, type Warning } from './warnings';
import { josa, shortLabel } from './text';

export type Trend = 'up' | 'same' | 'down' | 'unknown' | 'none';
export const TREND_LABELS: Record<Trend, string> = {
  up: '늘어남',
  same: '비슷함',
  down: '줄어듦',
  unknown: '기록 부족',
  none: '없었음',
};
export const TREND_ICONS: Record<Trend, string> = { up: '▲', same: '■', down: '▼', unknown: '·', none: '－' };

const MIN_DAYS_FOR_TREND = 3;
const TREND_THRESHOLD = 0.3; // 평균 단계 차이가 이만큼 이상이면 변화로 본다

/** 기록이 있는 날의 증상 평균(0~3). 기록이 있는데 증상 값이 없으면 0(없음)으로 본다. */
export function averageLevel(logs: DailyLog[], symptomId: string): { avg: number; days: number } {
  if (!logs.length) return { avg: 0, days: 0 };
  const sum = logs.reduce((s, l) => s + (l.symptoms[symptomId] ?? 0), 0);
  return { avg: sum / logs.length, days: logs.length };
}

export function compareTrend(before: DailyLog[], after: DailyLog[], symptomId: string): Trend {
  const a = averageLevel(before, symptomId);
  const b = averageLevel(after, symptomId);
  if (a.days < MIN_DAYS_FOR_TREND || b.days < MIN_DAYS_FOR_TREND) return 'unknown';
  const diff = b.avg - a.avg;
  if (diff >= TREND_THRESHOLD) return 'up';
  if (diff <= -TREND_THRESHOLD) return 'down';
  return 'same';
}

/** 몸 상태(기분·수면·월경·증상·메모)를 기록한 날인지. 습관만 체크한 날은 증상 통계에서 뺀다. */
export const hasHealthData = (l: DailyLog) =>
  l.mood != null || l.sleep != null || l.flow != null || !!l.note || Object.keys(l.symptoms).length > 0;

const inRange = (logs: DailyLog[], start: string, end: string) =>
  logs.filter((l) => l.date >= start && l.date <= end && hasHealthData(l));

/** 그래프 아래 한 줄 요약: 이번 기간과 바로 앞 같은 길이 기간을 비교 */
export function periodSentence(
  logs: DailyLog[],
  symptoms: ItemDef[],
  end: string,
  days: number,
  periodName: string, // "2주", "1달", "3달"
): string {
  if (!symptoms.length) return '보고 싶은 증상을 골라 주세요.';
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const cur = inRange(logs, start, end);
  const prev = inRange(logs, prevStart, prevEnd);
  const parts: string[] = [];
  const up: string[] = [];
  const down: string[] = [];
  const same: string[] = [];
  for (const s of symptoms) {
    const t = compareTrend(prev, cur, s.id);
    const name = shortLabel(s.label);
    if (t === 'up') up.push(name);
    else if (t === 'down') down.push(name);
    else if (t === 'same') same.push(name);
  }
  const join = (names: string[]) => josa(names.join(', '), '이', '가');
  if (down.length) parts.push(`${join(down)} 줄었어요`);
  if (up.length) parts.push(`${join(up)} 늘었어요`);
  if (same.length) parts.push(`${join(same)} 비슷해요`);
  if (!parts.length) return `${josa(`지난 ${periodName}`, '과', '와')} 비교하려면 기록이 조금 더 필요해요.`;
  return `지난 ${periodName}보다 ${parts.join(', ')}.`;
}

export interface SymptomSummary {
  def: ItemDef;
  recordedDays: number; // 보통 이상이 아니어도 "조금" 이상 있었던 날
  moderateDays: number; // 보통 이상
  trend: Trend;
}

export interface Summary {
  start: string;
  end: string;
  totalDays: number;
  loggedDays: number;
  lastPeriod: string | null;
  periodDaysInRange: number;
  recentCycle: number | null; // 최근 두 월경 시작일 사이 간격(일)
  periodStarts: string[];
  symptoms: SymptomSummary[];
  mood: Record<Mood, number>;
  sleep: Record<Sleep, number>;
  warnings: Warning[];
  notes: { date: string; note: string }[];
}

const PERIOD_GAP_DAYS = 7;

/**
 * 월경 시작일: 출혈이 있고, 앞 7일 안에는 출혈 기록이 없는 날.
 * 월경 중 하루 기록을 빠뜨려도 새 월경으로 세지 않기 위해서다.
 */
export function periodStarts(logs: DailyLog[]): string[] {
  const bleed = logs.filter((l) => (l.flow ?? 0) > 0).map((l) => l.date).sort();
  return bleed.filter((d, i) => i === 0 || daysBetween(bleed[i - 1], d) > PERIOD_GAP_DAYS);
}

/**
 * 병원용 요약 집계.
 * @param allLogs 전체 기록 (마지막 월경일, 월경 간격, 주의 신호 판정에 기간 밖 기록도 쓴다)
 */
export function buildSummary(allLogs: DailyLog[], defs: ItemDef[], start: string, end: string): Summary {
  const logs = inRange(allLogs, start, end).sort((a, b) => a.date.localeCompare(b.date));
  const upToEnd = allLogs.filter((l) => l.date <= end);

  const bleedDays = upToEnd.filter((l) => (l.flow ?? 0) > 0).map((l) => l.date).sort();
  const starts = periodStarts(upToEnd);
  const recentCycle =
    starts.length >= 2 ? daysBetween(starts[starts.length - 2], starts[starts.length - 1]) : null;

  // 추세: 기간을 앞뒤 절반으로 나눠 비교
  const totalDays = daysBetween(start, end) + 1;
  const mid = addDays(start, Math.floor(totalDays / 2) - 1);
  const firstHalf = logs.filter((l) => l.date <= mid);
  const secondHalf = logs.filter((l) => l.date > mid);

  const usedIds = new Set(logs.flatMap((l) => Object.entries(l.symptoms).filter(([, v]) => v > 0).map(([k]) => k)));
  const shownDefs = [...defs]
    .filter((d) => !d.hidden || usedIds.has(d.id))
    .sort((a, b) => a.order - b.order);

  const symptoms = shownDefs.map((def) => {
    const recordedDays = logs.filter((l) => (l.symptoms[def.id] ?? 0) >= 1).length;
    return {
      def,
      recordedDays,
      moderateDays: logs.filter((l) => (l.symptoms[def.id] ?? 0) >= 2).length,
      trend: recordedDays === 0 ? ('none' as const) : compareTrend(firstHalf, secondHalf, def.id),
    };
  });

  const mood: Record<Mood, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sleep: Record<Sleep, number> = { good: 0, ok: 0, bad: 0 };
  for (const l of logs) {
    if (l.mood) mood[l.mood]++;
    if (l.sleep) sleep[l.sleep]++;
  }

  const warnings = detectWarnings(upToEnd).filter((w) => w.end >= start && w.start <= end);

  return {
    start,
    end,
    totalDays,
    loggedDays: logs.length,
    lastPeriod: bleedDays.length ? bleedDays[bleedDays.length - 1] : null,
    periodDaysInRange: logs.filter((l) => (l.flow ?? 0) > 0).length,
    recentCycle,
    periodStarts: starts.filter((d) => d >= start),
    symptoms,
    mood,
    sleep,
    warnings,
    notes: logs.filter((l) => l.note?.trim()).map((l) => ({ date: l.date, note: l.note!.trim() })),
  };
}

/** 그래프용: 기간 내 날짜별 값 (기록 없는 날은 null) */
export function series(logs: DailyLog[], symptomId: string, start: string, end: string): (number | null)[] {
  const byDate = new Map(logs.filter(hasHealthData).map((l) => [l.date, l]));
  return dateRange(start, end).map((d) => {
    const l = byDate.get(d);
    return l ? (l.symptoms[symptomId] ?? 0) : null;
  });
}
