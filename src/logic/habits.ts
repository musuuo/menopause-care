import { addDays, daysBetween, startOfWeek } from '../date';
import type { DailyLog, ItemDef } from '../types';

const didAny = (log: DailyLog | undefined, ids: Set<string>) =>
  !!log && Object.entries(log.habits).some(([k, v]) => v && ids.has(k));

/**
 * 연속 달성일: 습관을 하나라도 챙긴 날이 오늘까지 며칠 이어졌는지.
 * 오늘 아직 아무것도 안 했으면 어제까지의 연속을 보여 준다(하루가 끝나지 않았으니까).
 */
export function habitStreak(logs: DailyLog[], defs: ItemDef[], today: string): number {
  const ids = new Set(defs.filter((d) => !d.hidden).map((d) => d.id));
  const byDate = new Map(logs.map((l) => [l.date, l]));
  let day = didAny(byDate.get(today), ids) ? today : addDays(today, -1);
  let n = 0;
  while (didAny(byDate.get(day), ids)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** 이번 주(월요일~오늘) 달성률 0~100 */
export function weekRate(logs: DailyLog[], defs: ItemDef[], today: string): number {
  const visible = defs.filter((d) => !d.hidden);
  if (!visible.length) return 0;
  const start = startOfWeek(today);
  const days = daysBetween(start, today) + 1;
  const ids = new Set(visible.map((d) => d.id));
  let done = 0;
  for (const l of logs) {
    if (l.date < start || l.date > today) continue;
    done += Object.entries(l.habits).filter(([k, v]) => v && ids.has(k)).length;
  }
  return Math.round((done / (visible.length * days)) * 100);
}
