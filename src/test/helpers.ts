import { addDays } from '../date';
import type { DailyLog } from '../types';

export const log = (date: string, extra: Partial<DailyLog> = {}): DailyLog => ({
  date, symptoms: {}, habits: {}, updatedAt: 1, ...extra,
});

/** start부터 n일 동안 make(i, date)로 기록을 만든다 */
export const days = (start: string, n: number, make: (i: number, d: string) => Partial<DailyLog>) =>
  Array.from({ length: n }, (_, i) => {
    const d = addDays(start, i);
    return log(d, make(i, d));
  });
