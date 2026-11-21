import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AppProvider } from '../store';
import { FeedbackProvider } from '../components/Feedback';
import * as db from '../db';
import { addDays, todayKey } from '../date';
import { DEFAULT_SETTINGS } from '../defaults';
import { INFO_CARDS } from '../content';
import { log } from './helpers';

function renderApp() {
  return render(
    <AppProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AppProvider>,
  );
}

async function onboarded() {
  await db.saveSettings({ ...DEFAULT_SETTINGS, onboarded: true });
}

async function go(path: string) {
  await act(async () => {
    window.location.hash = path;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

/** 화면 글자에 영어 단어가 없는지 (기획서 완료 기준) */
function expectNoEnglish() {
  const text = document.body.textContent ?? '';
  expect(text.match(/[A-Za-z]{2,}/g) ?? []).toEqual([]);
}

test('처음 열면 온보딩 3장을 거쳐 오늘 화면으로 간다', async () => {
  const user = userEvent.setup();
  renderApp();
  expect(await screen.findByText('하루 10초, 내 몸을 기록해요')).toBeInTheDocument();
  expectNoEnglish();
  await user.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText('기록은 이 휴대폰에만 저장돼요')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText('홈 화면에 추가해 두세요')).toBeInTheDocument();
  expectNoEnglish();
  await user.click(screen.getByRole('button', { name: '시작하기' }));
  expect(await screen.findByText('오늘 몸은 어떠세요?')).toBeInTheDocument();
  expect((await db.getSettings()).onboarded).toBe(true);
});

test('오늘 화면: 기분 1번 + 증상 3개를 탭 4~5번에 기록하고 자동 저장된다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: '좋음' }));
  await user.click(screen.getByRole('button', { name: /얼굴 화끈거림\(열감\), 지금 없음/ }));
  await user.click(screen.getByRole('button', { name: /식은땀, 지금 없음/ }));
  await user.click(screen.getByRole('button', { name: /피로, 지금 없음/ }));
  await user.click(screen.getByRole('button', { name: /피로, 지금 조금/ })); // 한 번 더 → 보통
  expect(screen.getByRole('button', { name: /피로, 지금 보통/ })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('저장됐어요 ✓');
  expectNoEnglish();
  await waitFor(async () => {
    const saved = await db.getLog(todayKey());
    expect(saved?.mood).toBe(4);
    expect(saved?.symptoms).toEqual({ hotflash: 1, sweat: 1, fatigue: 2 });
  });
});

test('증상 카드는 없음 → 조금 → 보통 → 심함 → 없음 순서로 돈다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  const order = ['없음', '조금', '보통', '심함', '없음'];
  for (let i = 0; i < 4; i++) {
    await user.click(await screen.findByRole('button', { name: `두통, 지금 ${order[i]}` }));
    expect(screen.getByRole('button', { name: `두통, 지금 ${order[i + 1]}` })).toBeInTheDocument();
  }
});

test('되돌리기를 누르면 바로 전 상태로 돌아간다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: '아주 나쁨' }));
  await user.click(screen.getByRole('button', { name: '되돌리기' }));
  await waitFor(async () => expect(await db.getLog(todayKey())).toBeUndefined());
  expect(screen.getByRole('button', { name: '아주 나쁨' })).toHaveAttribute('aria-pressed', 'false');
});

test('"◀ 어제"로 지난 날짜를 기록할 수 있다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: '◀ 어제' }));
  expect(await screen.findByText('이날 몸은 어떠셨어요?')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '못 잤어요' }));
  await waitFor(async () => expect((await db.getLog(addDays(todayKey(), -1)))?.sleep).toBe('bad'));
});

test('주의 신호가 기록되면 오늘 화면에 부드러운 안내 카드가 뜨고, 닫을 수 있다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: '매우 많음' }));
  expect(await screen.findByText('출혈이 많았던 날이 있었어요')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '알겠어요' }));
  expect(screen.queryByText('출혈이 많았던 날이 있었어요')).not.toBeInTheDocument();
});

test('기록·병원용 요약·습관·정보·설정 화면에 영어 문구가 없다', async () => {
  await onboarded();
  const t = todayKey();
  await db.putLog(log(t, { mood: 2, flow: 2, symptoms: { hotflash: 3 }, note: '더웠다' }));
  await db.putLog(log(addDays(t, -1), { mood: 4, symptoms: { hotflash: 1 } }));
  renderApp();
  await screen.findByText('오늘 몸은 어떠세요?');

  await go('/records');
  expect(await screen.findByRole('button', { name: /기분 나쁨, 월경 보통, 기록 있음/ })).toBeInTheDocument();
  expectNoEnglish();

  await go('/records/summary');
  const report = await screen.findByRole('article', { name: '요약 내용' });
  expect(within(report).getByText('갱년기 증상 기록 요약')).toBeInTheDocument();
  expect(within(report).getByText('더웠다')).toBeInTheDocument();
  expectNoEnglish();

  await go('/habits');
  expect(await screen.findByText('오늘의 습관')).toBeInTheDocument();
  expectNoEnglish();

  for (const c of INFO_CARDS) {
    await go(`/info/${c.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: c.title })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('의학적 진단을 대신하지 않습니다');
    expectNoEnglish();
  }

  for (const p of ['/settings', '/settings/symptoms', '/settings/habits', '/settings/install']) {
    await go(p);
    await screen.findByRole('heading', { level: 1 });
    expectNoEnglish();
  }
});

test('그래프 화면: 증상은 3개까지만 고를 수 있다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await screen.findByText('오늘 몸은 어떠세요?');
  await go('/records');
  await user.click(await screen.findByRole('button', { name: /그래프/ }));
  for (const name of ['식은땀', '두통']) await user.click(await screen.findByRole('button', { name: new RegExp(name) }));
  await user.click(screen.getByRole('button', { name: /피로/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('3개까지 고를 수 있어요');
});

test('습관을 체크하면 저장되고 연속 일수가 늘어난다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await screen.findByText('오늘 몸은 어떠세요?');
  await go('/habits');
  await user.click(await screen.findByRole('checkbox', { name: /30분 걷기/ }));
  expect(screen.getByRole('checkbox', { name: /30분 걷기/ })).toHaveAttribute('aria-checked', 'true');
  expect(await screen.findByText('1일')).toBeInTheDocument();
  await waitFor(async () => expect((await db.getLog(todayKey()))?.habits.walk).toBe(true));
});

test('설정: 글씨 크게를 고르면 글자가 20% 커진다', async () => {
  await onboarded();
  const user = userEvent.setup();
  renderApp();
  await screen.findByText('오늘 몸은 어떠세요?');
  await user.click(screen.getByRole('button', { name: '설정' }));
  await user.click(await screen.findByRole('button', { name: '크게' }));
  expect(document.documentElement.style.fontSize).toBe('24px');
  expect((await db.getSettings()).fontScale).toBe(1.2);
});

test('설정: 모든 기록 지우기는 두 번 확인한다', async () => {
  await onboarded();
  await db.putLog(log(todayKey(), { mood: 3 }));
  const user = userEvent.setup();
  renderApp();
  await screen.findByText('오늘 몸은 어떠세요?');
  await go('/settings');
  await user.click(await screen.findByRole('button', { name: '모든 기록 지우기' }));
  await user.click(screen.getByRole('button', { name: '지우기' }));
  expect(await screen.findByText('한 번 더 확인할게요')).toBeInTheDocument();
  expect(await db.getAllLogs()).toHaveLength(1); // 아직 안 지워졌다
  await user.click(screen.getByRole('button', { name: '네, 모두 지울게요' }));
  await waitFor(async () => expect(await db.getAllLogs()).toEqual([]));
  expect(await screen.findByText('하루 10초, 내 몸을 기록해요')).toBeInTheDocument();
});
