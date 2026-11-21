import { addDays, daysBetween } from '../date';
import { PALPITATION_ID } from '../defaults';
import type { DailyLog } from '../types';

export type WarningKind = 'postBleed' | 'heavyFlow' | 'lowMood' | 'palpitation';

export interface Warning {
  kind: WarningKind;
  start: string;
  end: string;
}

export const warningId = (w: Warning) => `${w.kind}:${w.start}`;

export const WARNING_TEXT: Record<WarningKind, { title: string; body: string }> = {
  postBleed: {
    title: '오랜만에 출혈이 있었네요',
    body: '월경이 1년 넘게 없다가 다시 출혈이 생기면, 별일 아닌 경우가 많아도 한 번 확인받는 것이 좋아요. 편하실 때 산부인과에 들러 보세요.',
  },
  heavyFlow: {
    title: '출혈이 많았던 날이 있었어요',
    body: '출혈이 아주 많으면 몸이 많이 지칠 수 있어요. 어지럽거나 계속 많다면 병원에서 한번 상담받아 보세요.',
  },
  lowMood: {
    title: '요즘 마음이 많이 힘드셨죠',
    body: '2주 동안 기분이 아주 나쁜 날이 많았어요. 갱년기에 흔히 있는 일이지만, 혼자 견디지 않으셔도 돼요. 병원이나 상담 선생님과 이야기해 보시면 도움이 돼요.',
  },
  palpitation: {
    title: '가슴 두근거림이 며칠째 심하네요',
    body: '두근거림이 사흘 넘게 심했어요. 갱년기에 생길 수 있지만 다른 원인도 있을 수 있어요. 병원에서 한번 확인받아 보시면 마음이 편해요.',
  },
};

const POST_BLEED_GAP_DAYS = 365; // 12개월
const LOW_MOOD_WINDOW = 14;
const LOW_MOOD_MIN = 10;
const PALPITATION_RUN = 3;

/** 겹치거나 이어지는 구간을 하나로 합친다 */
function mergeRanges(kind: WarningKind, ranges: [string, string][]): Warning[] {
  const sorted = [...ranges].sort((a, b) => a[0].localeCompare(b[0]));
  const out: Warning[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= addDays(last.end, 1)) {
      if (e > last.end) last.end = e;
    } else out.push({ kind, start: s, end: e });
  }
  return out;
}

/** 모든 기록을 보고 주의 신호를 찾는다. 기록 순서는 상관없다. */
export function detectWarnings(logsInput: DailyLog[]): Warning[] {
  const logs = [...logsInput].sort((a, b) => a.date.localeCompare(b.date));
  if (!logs.length) return [];
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const out: Warning[] = [];

  // 1) 폐경 후 출혈: 마지막 출혈(없으면 첫 기록일)로부터 12개월 이상 지나 출혈
  let lastBleed: string | null = null;
  const firstLog = logs[0].date;
  for (const l of logs) {
    if ((l.flow ?? 0) > 0) {
      const ref = lastBleed ?? firstLog;
      if (daysBetween(ref, l.date) >= POST_BLEED_GAP_DAYS) {
        out.push({ kind: 'postBleed', start: l.date, end: l.date });
      }
      lastBleed = l.date;
    }
  }

  // 2) 출혈량 "매우 많음"
  for (const l of logs) {
    if (l.flow === 4) out.push({ kind: 'heavyFlow', start: l.date, end: l.date });
  }

  // 3) 기분 1점이 14일 중 10일 이상
  const lowDays = logs.filter((l) => l.mood === 1).map((l) => l.date);
  const lowRanges: [string, string][] = [];
  for (let i = 0; i < lowDays.length; i++) {
    const end = lowDays[i];
    const windowStart = addDays(end, -(LOW_MOOD_WINDOW - 1));
    const inWindow = lowDays.filter((d) => d >= windowStart && d <= end);
    if (inWindow.length >= LOW_MOOD_MIN) lowRanges.push([inWindow[0], end]);
  }
  out.push(...mergeRanges('lowMood', lowRanges));

  // 4) 두근거림 "심함"이 3일 연속 (달력 기준으로 이어진 날)
  const palpRanges: [string, string][] = [];
  for (const l of logs) {
    let ok = true;
    for (let k = 0; k < PALPITATION_RUN; k++) {
      const d = byDate.get(addDays(l.date, k));
      if (d?.symptoms?.[PALPITATION_ID] !== 3) { ok = false; break; }
    }
    if (ok) palpRanges.push([l.date, addDays(l.date, PALPITATION_RUN - 1)]);
  }
  out.push(...mergeRanges('palpitation', palpRanges));

  return out.sort((a, b) => a.end.localeCompare(b.end));
}

/** 오늘 화면에 띄울 최근 주의 신호 (끝난 지 14일 이내, 닫지 않은 것) */
export function recentWarnings(all: Warning[], today: string, dismissed: string[]): Warning[] {
  const since = addDays(today, -13);
  return all.filter((w) => w.end >= since && w.start <= today && !dismissed.includes(warningId(w)));
}
