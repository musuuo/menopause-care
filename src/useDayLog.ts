import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteLog, emptyLog, getLog, putLog } from './db';
import { useFeedback } from './components/Feedback';
import type { DailyLog } from './types';

const isBlank = (l: DailyLog) =>
  l.updatedAt === 0 &&
  l.mood == null && l.sleep == null && l.flow == null && !l.note &&
  !Object.keys(l.symptoms).length && !Object.keys(l.habits).length;

/** 하루 기록을 불러오고, 바꿀 때마다 바로 저장한다. 저장 뒤 "되돌리기"를 제공한다. */
export function useDayLog(date: string) {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef<DailyLog | null>(null);
  const { toast } = useFeedback();

  useEffect(() => {
    let alive = true;
    setLog(null);
    latest.current = null;
    getLog(date).then((l) => {
      if (!alive) return;
      const v = l ?? emptyLog(date);
      latest.current = v;
      setLog(v);
    });
    return () => {
      alive = false;
    };
  }, [date]);

  const write = useCallback(async (l: DailyLog) => {
    latest.current = l;
    setLog(l);
    if (isBlank(l)) await deleteLog(l.date);
    else await putLog(l);
    setVersion((v) => v + 1);
  }, []);

  const update = useCallback(
    async (change: (l: DailyLog) => DailyLog, message = '저장됐어요 ✓') => {
      const prev = latest.current;
      if (!prev) return;
      const next = { ...change(prev), updatedAt: Date.now() };
      await write(next);
      toast(message, () => void write(prev));
    },
    [toast, write],
  );

  return { log, update, version };
}
