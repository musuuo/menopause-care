import { APP_ID, DEFAULT_HABITS, DEFAULT_SETTINGS, DEFAULT_SYMPTOMS, SCHEMA_VERSION } from '../defaults';
import type { BackupFile, DailyLog, HabitDef, Settings, SymptomDef } from '../types';

export function buildBackup(
  logs: DailyLog[],
  symptomDefs: SymptomDef[],
  habitDefs: HabitDef[],
  settings: Settings,
  now = new Date(),
): BackupFile {
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    logs: [...logs].sort((a, b) => a.date.localeCompare(b.date)),
    symptomDefs,
    habitDefs,
    settings,
  };
}

/**
 * 스키마 버전별 마이그레이션. 버전을 올릴 때 여기에 단계를 추가한다.
 * 예) 1 → 2: migrations[1] = (d) => ({ ...d, 새필드: 기본값 })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const migrations: Record<number, (d: any) => any> = {};

export function migrate(data: BackupFile): BackupFile {
  let d = data;
  for (let v = d.schemaVersion; v < SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (step) d = step(d);
    d = { ...d, schemaVersion: v + 1 };
  }
  return d;
}

export class BackupError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 파일 내용을 읽어 검사하고 최신 형식으로 바꿔 돌려준다. 문제가 있으면 BackupError. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('백업 파일을 읽을 수 없어요. 이 앱에서 만든 백업 파일인지 확인해 주세요.');
  }
  const d = raw as Partial<BackupFile>;
  if (!d || typeof d !== 'object' || d.app !== APP_ID || !Array.isArray(d.logs)) {
    throw new BackupError('이 앱에서 만든 백업 파일이 아니에요.');
  }
  if (typeof d.schemaVersion !== 'number' || d.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('더 새로운 버전의 앱에서 만든 파일이에요. 앱을 새로고침한 뒤 다시 해 주세요.');
  }
  const logs = d.logs
    .filter((l): l is DailyLog => !!l && typeof l === 'object' && DATE_RE.test((l as DailyLog).date))
    .map((l) => ({ ...l, symptoms: l.symptoms ?? {}, habits: l.habits ?? {}, updatedAt: l.updatedAt ?? 0 }));
  const full: BackupFile = {
    app: APP_ID,
    schemaVersion: d.schemaVersion,
    exportedAt: d.exportedAt ?? '',
    logs,
    symptomDefs: Array.isArray(d.symptomDefs) && d.symptomDefs.length ? d.symptomDefs : DEFAULT_SYMPTOMS,
    habitDefs: Array.isArray(d.habitDefs) && d.habitDefs.length ? d.habitDefs : DEFAULT_HABITS,
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}), onboarded: true },
  };
  return migrate(full);
}
