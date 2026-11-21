import { detectWarnings, recentWarnings, warningId } from './warnings';
import { days, log } from '../test/helpers';

const kinds = (ws: ReturnType<typeof detectWarnings>) => ws.map((w) => w.kind);

describe('주의 신호 1: 폐경 후 출혈 (12개월 이상 없다가 출혈)', () => {
  test('마지막 출혈 뒤 365일 이상 지나 출혈하면 알린다', () => {
    const ws = detectWarnings([log('2025-01-10', { flow: 2 }), log('2026-01-10', { flow: 1 })]);
    expect(ws).toEqual([{ kind: 'postBleed', start: '2026-01-10', end: '2026-01-10' }]);
  });
  test('출혈 기록이 없어도 첫 기록부터 12개월 넘게 지나 출혈하면 알린다', () => {
    const ws = detectWarnings([log('2025-03-01', { mood: 3 }), log('2026-03-05', { flow: 1 })]);
    expect(kinds(ws)).toEqual(['postBleed']);
  });
  test('364일 만의 출혈, 규칙적인 월경은 알리지 않는다', () => {
    expect(detectWarnings([log('2025-01-10', { flow: 2 }), log('2026-01-09', { flow: 2 })])).toEqual([]);
    expect(detectWarnings(days('2026-01-01', 90, (i) => ({ flow: i % 28 < 5 ? 2 : 0 })))).toEqual([]);
  });
});

describe('주의 신호 2: 출혈량 매우 많음', () => {
  test('"매우 많음"(4)이면 알린다', () => {
    expect(detectWarnings([log('2026-11-01', { flow: 4 })])).toEqual([
      { kind: 'heavyFlow', start: '2026-11-01', end: '2026-11-01' },
    ]);
  });
  test('"많음"(3)까지는 알리지 않는다', () => {
    expect(detectWarnings([log('2026-11-01', { flow: 3 })])).toEqual([]);
  });
});

describe('주의 신호 3: 기분 최하가 14일 중 10일 이상', () => {
  test('14일 중 10일이 1점이면 알린다', () => {
    const ws = detectWarnings(days('2026-11-01', 14, (i) => ({ mood: i < 10 ? 1 : 3 })));
    expect(ws).toEqual([{ kind: 'lowMood', start: '2026-11-01', end: '2026-11-10' }]);
  });
  test('띄엄띄엄 있어도 14일 안에 10일이면 알린다', () => {
    const ws = detectWarnings(days('2026-11-01', 14, (i) => ({ mood: [2, 6].includes(i) || i > 11 ? 2 : 1 })));
    expect(kinds(ws)).toEqual(['lowMood']);
  });
  test('14일 중 9일이면 알리지 않는다', () => {
    expect(detectWarnings(days('2026-11-01', 14, (i) => ({ mood: i < 9 ? 1 : 2 })))).toEqual([]);
  });
  test('10일이 15일에 걸쳐 흩어져 있으면 알리지 않는다', () => {
    // 1일과 15일 포함 10일: 어느 14일 창에도 10일이 다 들어가지 않는다
    const moodDays = [0, 2, 4, 5, 6, 8, 10, 11, 12, 14];
    expect(detectWarnings(days('2026-11-01', 15, (i) => ({ mood: moodDays.includes(i) ? 1 : 3 })))).toEqual([]);
  });
  test('길게 이어지면 하나로 합쳐서 알린다', () => {
    const ws = detectWarnings(days('2026-10-01', 30, () => ({ mood: 1 })));
    expect(ws).toEqual([{ kind: 'lowMood', start: '2026-10-01', end: '2026-10-30' }]);
  });
});

describe('주의 신호 4: 두근거림 심함이 3일 연속', () => {
  const palp = (lv: 0 | 1 | 2 | 3) => ({ symptoms: { palpitation: lv } });
  test('3일 연속 "심함"이면 알린다', () => {
    const ws = detectWarnings(days('2026-11-01', 3, () => palp(3)));
    expect(ws).toEqual([{ kind: 'palpitation', start: '2026-11-01', end: '2026-11-03' }]);
  });
  test('4일 연속도 한 번만 알린다', () => {
    const ws = detectWarnings(days('2026-11-01', 4, () => palp(3)));
    expect(ws).toEqual([{ kind: 'palpitation', start: '2026-11-01', end: '2026-11-04' }]);
  });
  test('2일 연속이거나, 중간에 "보통"이 끼거나, 기록이 하루 빠지면 알리지 않는다', () => {
    expect(detectWarnings(days('2026-11-01', 2, () => palp(3)))).toEqual([]);
    expect(detectWarnings(days('2026-11-01', 3, (i) => palp(i === 1 ? 2 : 3)))).toEqual([]);
    expect(detectWarnings([log('2026-11-01', palp(3)), log('2026-11-02', palp(3)), log('2026-11-04', palp(3))])).toEqual([]);
  });
});

test('오늘 화면에는 최근 14일 안의 닫지 않은 신호만 보인다', () => {
  const all = detectWarnings([log('2026-10-01', { flow: 4 }), log('2026-11-15', { flow: 4 }), log('2026-11-20', { flow: 4 })]);
  const recent = recentWarnings(all, '2026-11-21', [warningId(all[2])]);
  expect(recent.map((w) => w.start)).toEqual(['2026-11-15']);
});
