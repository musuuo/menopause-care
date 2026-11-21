import { addDays, dateRange, daysBetween, formatLong, startOfWeek, toKey } from './date';

test('날짜 문자열 계산', () => {
  expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  expect(daysBetween('2025-11-21', '2026-11-21')).toBe(365);
  expect(dateRange('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
  expect(toKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('한국어 날짜 표시와 주 시작(월요일)', () => {
  expect(formatLong('2026-11-21')).toBe('11월 21일 토요일');
  expect(startOfWeek('2026-11-21')).toBe('2026-11-16'); // 토요일 → 그 주 월요일
  expect(startOfWeek('2026-11-22')).toBe('2026-11-16'); // 일요일도 같은 주
  expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
});
