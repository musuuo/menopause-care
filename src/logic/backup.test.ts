import { DEFAULT_HABITS, DEFAULT_SETTINGS, DEFAULT_SYMPTOMS, SCHEMA_VERSION } from '../defaults';
import { BackupError, buildBackup, parseBackup } from './backup';
import { log } from '../test/helpers';

test('백업을 만들고 다시 읽으면 같은 내용', () => {
  const logs = [log('2026-11-02', { mood: 4 }), log('2026-11-01', { flow: 2, note: '메모' })];
  const b = buildBackup(logs, DEFAULT_SYMPTOMS, DEFAULT_HABITS, { ...DEFAULT_SETTINGS, onboarded: true });
  expect(b.app).toBe('menopause-care');
  expect(b.logs.map((l) => l.date)).toEqual(['2026-11-01', '2026-11-02']);
  const back = parseBackup(JSON.stringify(b));
  expect(back.logs).toEqual(b.logs);
  expect(back.symptomDefs).toEqual(DEFAULT_SYMPTOMS);
  expect(back.schemaVersion).toBe(SCHEMA_VERSION);
});

test('다른 파일이나 망가진 파일은 쉬운 말로 거절한다', () => {
  expect(() => parseBackup('이건 json이 아님')).toThrow(BackupError);
  expect(() => parseBackup(JSON.stringify({ app: 'other', logs: [] }))).toThrow('이 앱에서 만든 백업 파일이 아니에요');
  expect(() => parseBackup(JSON.stringify({ app: 'menopause-care', schemaVersion: 999, logs: [] }))).toThrow('더 새로운 버전');
});

test('빠진 값은 기본값으로 채우고, 날짜가 이상한 기록은 버린다', () => {
  const b = parseBackup(JSON.stringify({ app: 'menopause-care', schemaVersion: 1, logs: [{ date: '2026-11-01', mood: 3 }, { date: 'abc' }] }));
  expect(b.logs).toEqual([{ date: '2026-11-01', mood: 3, symptoms: {}, habits: {}, updatedAt: 0 }]);
  expect(b.habitDefs).toEqual(DEFAULT_HABITS);
  expect(b.settings.onboarded).toBe(true);
});
