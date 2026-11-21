import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as db from './db';
import { DEFAULT_HABITS, DEFAULT_SETTINGS, DEFAULT_SYMPTOMS } from './defaults';
import type { HabitDef, Settings, SymptomDef } from './types';

interface AppState {
  ready: boolean;
  settings: Settings;
  symptomDefs: SymptomDef[];
  habitDefs: HabitDef[];
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setSymptomDefs: (d: SymptomDef[]) => Promise<void>;
  setHabitDefs: (d: HabitDef[]) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [symptomDefs, setSym] = useState<SymptomDef[]>(DEFAULT_SYMPTOMS);
  const [habitDefs, setHab] = useState<HabitDef[]>(DEFAULT_HABITS);

  const reload = useCallback(async () => {
    const [s, sd, hd] = await Promise.all([db.getSettings(), db.getSymptomDefs(), db.getHabitDefs()]);
    setSettings(s);
    setSym(sd);
    setHab(hd);
    setReady(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 글씨 크기: 모든 크기를 rem으로 쓰므로 루트 글자 크기만 바꾸면 된다.
  useEffect(() => {
    document.documentElement.style.fontSize = `${20 * settings.fontScale}px`;
  }, [settings.fontScale]);

  const value: AppState = {
    ready,
    settings,
    symptomDefs,
    habitDefs,
    updateSettings: async (patch) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await db.saveSettings(next);
    },
    setSymptomDefs: async (d) => {
      setSym(d);
      await db.saveSymptomDefs(d);
    },
    setHabitDefs: async (d) => {
      setHab(d);
      await db.saveHabitDefs(d);
    },
    reload,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider가 필요합니다');
  return v;
}

export const visibleSorted = <T extends { hidden: boolean; order: number }>(defs: T[]) =>
  defs.filter((d) => !d.hidden).sort((a, b) => a.order - b.order);
