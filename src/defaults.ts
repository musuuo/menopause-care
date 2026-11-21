import type { HabitDef, Settings, SymptomDef } from './types';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'menopause-care';

export const PALPITATION_ID = 'palpitation';

const sym = (id: string, label: string, icon: string, order: number): SymptomDef => ({
  id, label, icon, order, hidden: false, custom: false,
});

export const DEFAULT_SYMPTOMS: SymptomDef[] = [
  sym('hotflash', '얼굴 화끈거림(열감)', '🔥', 0),
  sym('sweat', '식은땀', '💦', 1),
  sym('sleepless', '잠 설침', '🌙', 2),
  sym('irritable', '짜증·불안', '😣', 3),
  sym('depressed', '우울함', '🌧️', 4),
  sym(PALPITATION_ID, '두근거림', '💓', 5),
  sym('pain', '관절·근육 통증', '🦴', 6),
  sym('fatigue', '피로', '🥱', 7),
  sym('headache', '두통', '🤕', 8),
  sym('memory', '깜빡깜빡(기억력)', '💭', 9),
];

export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'walk', label: '30분 걷기', icon: '🚶‍♀️', order: 0, hidden: false, custom: false },
  { id: 'strength', label: '근력 운동(스쿼트, 계단 등)', icon: '🦵', order: 1, hidden: false, custom: false },
  { id: 'calcium', label: '칼슘 챙기기(우유, 멸치, 두부 등)', icon: '🥛', order: 2, hidden: false, custom: false },
  { id: 'sun', label: '햇볕 쬐기 10분', icon: '☀️', order: 3, hidden: false, custom: false },
  { id: 'water', label: '물 6잔 이상', icon: '💧', order: 4, hidden: false, custom: false },
  { id: 'lesscoffee', label: '커피·술 줄이기', icon: '☕', order: 5, hidden: false, custom: false },
];

export const DEFAULT_SETTINGS: Settings = {
  fontScale: 1,
  reminder: { enabled: false, time: '21:00' },
  onboarded: false,
  schemaVersion: SCHEMA_VERSION,
};

export const LEVEL_LABELS = ['없음', '조금', '보통', '심함'] as const;
export const FLOW_LABELS = ['없음', '조금', '보통', '많음', '매우 많음'] as const;
export const MOODS = [
  { value: 1, face: '😣', label: '아주 나쁨' },
  { value: 2, face: '🙁', label: '나쁨' },
  { value: 3, face: '😐', label: '보통' },
  { value: 4, face: '🙂', label: '좋음' },
  { value: 5, face: '😄', label: '아주 좋음' },
] as const;
export const SLEEPS = [
  { value: 'good', label: '잘 잤어요', icon: '😴' },
  { value: 'ok', label: '보통', icon: '🙂' },
  { value: 'bad', label: '못 잤어요', icon: '😵' },
] as const;

export const MEDICAL_NOTICE =
  '이 앱은 의학적 진단을 대신하지 않습니다. 걱정되는 증상은 꼭 의사와 상담하세요.';
