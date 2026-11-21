// 날짜는 모두 기기 로컬 시간 기준 "YYYY-MM-DD" 문자열로 다룬다.

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 한낮(12시)으로 만들어 서머타임 경계 문제를 피한다. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(now: Date = new Date()): string {
  return toKey(now);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** b - a (일) */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

/** start부터 end까지(포함) 모든 날짜 */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function weekdayName(key: string): string {
  return WEEKDAYS[fromKey(key).getDay()];
}

/** "11월 21일 토요일" */
export function formatLong(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

/** "11월 21일" */
export function formatShort(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "2026년 11월 21일" */
export function formatFull(key: string): string {
  const d = fromKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 그 주 월요일 */
export function startOfWeek(key: string): string {
  const day = fromKey(key).getDay(); // 0=일
  return addDays(key, day === 0 ? -6 : 1 - day);
}
