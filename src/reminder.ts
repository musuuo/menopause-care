// 서버가 없으므로 "푸시" 알림은 보낼 수 없다.
// 앱이 열려 있거나 잠깐 뒤로 가 있는 동안 정해진 시간이 되면 알림을 띄운다.
import { getLog } from './db';
import { todayKey } from './date';
import type { Settings } from './types';

const LAST_KEY = 'last-reminder-date';

export const notificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

async function show() {
  const title = '오늘 몸은 어떠셨어요?';
  const options: NotificationOptions = {
    body: '10초만 내어 오늘 기록을 남겨 보세요.',
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: 'daily-reminder',
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, options);
  } catch {
    /* 서비스 워커가 없으면 아래로 */
  }
  new Notification(title, options);
}

async function maybeNotify() {
  // 앱을 보고 있는 중이면 알릴 필요가 없다
  if (document.visibilityState === 'visible') return;
  const today = todayKey();
  try {
    if (localStorage.getItem(LAST_KEY) === today) return;
  } catch { /* 무시 */ }
  if (await getLog(today)) return; // 이미 기록했으면 알리지 않는다
  try {
    localStorage.setItem(LAST_KEY, today);
  } catch { /* 무시 */ }
  await show();
}

/** 알림 예약. 해제 함수를 돌려준다. */
export function scheduleReminder(settings: Settings): () => void {
  if (!settings.reminder.enabled || !notificationSupported() || Notification.permission !== 'granted') {
    return () => {};
  }
  let timer: number | undefined;
  const plan = () => {
    window.clearTimeout(timer);
    const [h, m] = settings.reminder.time.split(':').map(Number);
    const now = new Date();
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (at.getTime() <= now.getTime()) {
      void maybeNotify();
      at.setDate(at.getDate() + 1);
    }
    timer = window.setTimeout(() => {
      void maybeNotify();
      plan();
    }, at.getTime() - now.getTime());
  };
  plan();
  const onVisible = () => document.visibilityState === 'visible' && plan();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
