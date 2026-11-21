import { DEFAULT_HABITS } from '../defaults';
import { habitStreak, weekRate } from './habits';
import { days, log } from '../test/helpers';

test('연속 달성일: 하나라도 챙긴 날이 이어진 수', () => {
  const ls = days('2026-11-15', 7, (i) => ({ habits: i === 2 ? ({} as Record<string, boolean>) : { walk: true } })); // 11/17 빠짐
  expect(habitStreak(ls, DEFAULT_HABITS, '2026-11-21')).toBe(4); // 18~21
});

test('오늘 아직 안 했으면 어제까지의 연속을 보여 준다', () => {
  const ls = days('2026-11-18', 3, () => ({ habits: { water: true } }));
  expect(habitStreak(ls, DEFAULT_HABITS, '2026-11-21')).toBe(3);
  expect(habitStreak([], DEFAULT_HABITS, '2026-11-21')).toBe(0);
});

test('체크를 뺀 습관, 숨긴 습관은 세지 않는다', () => {
  const defs = DEFAULT_HABITS.map((h) => (h.id === 'sun' ? { ...h, hidden: true } : h));
  const ls = [log('2026-11-21', { habits: { sun: true } }), log('2026-11-20', { habits: { walk: false } })];
  expect(habitStreak(ls, defs, '2026-11-21')).toBe(0);
});

test('이번 주 달성률: 월요일부터 오늘까지', () => {
  // 2026-11-21은 토요일 → 월~토 6일 × 습관 6개 = 36칸
  const ls = days('2026-11-16', 6, () => ({ habits: { walk: true, water: true, calcium: true } }));
  expect(weekRate(ls, DEFAULT_HABITS, '2026-11-21')).toBe(50);
  expect(weekRate([log('2026-11-15', { habits: { walk: true } })], DEFAULT_HABITS, '2026-11-21')).toBe(0); // 지난주 일요일
});
