import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_HABITS, DEFAULT_SETTINGS, DEFAULT_SYMPTOMS } from './defaults';
import type { DailyLog, HabitDef, Settings, SymptomDef } from './types';

interface KV {
  settings: Settings;
  symptomDefs: SymptomDef[];
  habitDefs: HabitDef[];
  dismissedWarnings: string[];
}

interface CareDB extends DBSchema {
  logs: { key: string; value: DailyLog };
  kv: { key: keyof KV; value: KV[keyof KV] };
}

const DB_NAME = 'menopause-care';
let dbPromise: Promise<IDBPDatabase<CareDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<CareDB>(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('logs', { keyPath: 'date' });
        d.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

/** 테스트에서 DB를 새로 열 때 사용 */
export async function resetConnection() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

async function getKV<K extends keyof KV>(key: K): Promise<KV[K] | undefined> {
  return (await (await db()).get('kv', key)) as KV[K] | undefined;
}
async function setKV<K extends keyof KV>(key: K, value: KV[K]) {
  await (await db()).put('kv', value, key);
}

export const emptyLog = (date: string): DailyLog => ({ date, symptoms: {}, habits: {}, updatedAt: 0 });

export async function getLog(date: string): Promise<DailyLog | undefined> {
  return (await db()).get('logs', date);
}
export async function putLog(log: DailyLog) {
  await (await db()).put('logs', { ...log, updatedAt: Date.now() });
}
export async function deleteLog(date: string) {
  await (await db()).delete('logs', date);
}
export async function getLogsInRange(start: string, end: string): Promise<DailyLog[]> {
  return (await db()).getAll('logs', IDBKeyRange.bound(start, end));
}
export async function getAllLogs(): Promise<DailyLog[]> {
  return (await db()).getAll('logs');
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await getKV('settings')) };
}
export const saveSettings = (s: Settings) => setKV('settings', s);

export async function getSymptomDefs(): Promise<SymptomDef[]> {
  return (await getKV('symptomDefs')) ?? DEFAULT_SYMPTOMS;
}
export const saveSymptomDefs = (d: SymptomDef[]) => setKV('symptomDefs', d);

export async function getHabitDefs(): Promise<HabitDef[]> {
  return (await getKV('habitDefs')) ?? DEFAULT_HABITS;
}
export const saveHabitDefs = (d: HabitDef[]) => setKV('habitDefs', d);

export async function getDismissedWarnings(): Promise<string[]> {
  return (await getKV('dismissedWarnings')) ?? [];
}
export const saveDismissedWarnings = (ids: string[]) => setKV('dismissedWarnings', ids);

export async function clearAll() {
  const d = await db();
  const tx = d.transaction(['logs', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('logs').clear(), tx.objectStore('kv').clear(), tx.done]);
}

/** 백업 복원: 기존 데이터를 모두 지우고 한 번에 바꾼다. */
export async function replaceAll(data: {
  logs: DailyLog[];
  symptomDefs: SymptomDef[];
  habitDefs: HabitDef[];
  settings: Settings;
}) {
  const d = await db();
  const tx = d.transaction(['logs', 'kv'], 'readwrite');
  const logs = tx.objectStore('logs');
  const kv = tx.objectStore('kv');
  await logs.clear();
  await kv.clear();
  for (const l of data.logs) await logs.put(l);
  await kv.put(data.symptomDefs, 'symptomDefs');
  await kv.put(data.habitDefs, 'habitDefs');
  await kv.put(data.settings, 'settings');
  await tx.done;
}
