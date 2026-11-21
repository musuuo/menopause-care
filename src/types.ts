export type Level = 0 | 1 | 2 | 3; // 없음, 조금, 보통, 심함
export type Flow = 0 | 1 | 2 | 3 | 4; // 없음, 조금, 보통, 많음, 매우 많음
export type Mood = 1 | 2 | 3 | 4 | 5;
export type Sleep = 'good' | 'ok' | 'bad';

export interface DailyLog {
  date: string; // "YYYY-MM-DD" (기기 로컬 시간 기준), 기본키
  mood?: Mood;
  sleep?: Sleep;
  flow?: Flow;
  symptoms: Record<string, Level>;
  habits: Record<string, boolean>;
  note?: string;
  updatedAt: number;
}

export interface ItemDef {
  id: string;
  label: string;
  icon: string;
  hidden: boolean;
  custom: boolean;
  order: number;
}
export type SymptomDef = ItemDef;
export type HabitDef = ItemDef;

export interface Settings {
  fontScale: 1 | 1.2;
  reminder: { enabled: boolean; time: string }; // "21:00"
  onboarded: boolean;
  schemaVersion: number;
}

export interface BackupFile {
  app: 'menopause-care';
  schemaVersion: number;
  exportedAt: string;
  logs: DailyLog[];
  symptomDefs: SymptomDef[];
  habitDefs: HabitDef[];
  settings: Settings;
}
