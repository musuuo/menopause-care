import * as db from './db';
import { DEFAULT_HABITS, DEFAULT_SETTINGS, DEFAULT_SYMPTOMS } from './defaults';
import { log } from './test/helpers';

test('기록 저장, 기간 조회, 삭제', async () => {
  await db.putLog(log('2026-11-01', { mood: 2 }));
  await db.putLog(log('2026-11-05', { mood: 4 }));
  await db.putLog(log('2026-12-01', { mood: 5 }));
  expect((await db.getLog('2026-11-01'))?.mood).toBe(2);
  expect((await db.getLogsInRange('2026-11-01', '2026-11-30')).map((l) => l.date)).toEqual(['2026-11-01', '2026-11-05']);
  await db.deleteLog('2026-11-01');
  expect(await db.getLog('2026-11-01')).toBeUndefined();
});

test('처음에는 기본 설정·목록을 돌려준다', async () => {
  expect(await db.getSettings()).toEqual(DEFAULT_SETTINGS);
  expect(await db.getSymptomDefs()).toEqual(DEFAULT_SYMPTOMS);
  await db.saveSettings({ ...DEFAULT_SETTINGS, fontScale: 1.2 });
  expect((await db.getSettings()).fontScale).toBe(1.2);
});

test('복원은 기존 데이터를 모두 바꾸고, 전체 삭제는 모두 지운다', async () => {
  await db.putLog(log('2026-01-01', { mood: 1 }));
  await db.replaceAll({
    logs: [log('2026-11-01', { mood: 5 })],
    symptomDefs: DEFAULT_SYMPTOMS.slice(0, 2),
    habitDefs: DEFAULT_HABITS,
    settings: { ...DEFAULT_SETTINGS, onboarded: true },
  });
  expect((await db.getAllLogs()).map((l) => l.date)).toEqual(['2026-11-01']);
  expect(await db.getSymptomDefs()).toHaveLength(2);
  await db.clearAll();
  expect(await db.getAllLogs()).toEqual([]);
  expect((await db.getSettings()).onboarded).toBe(false);
});
