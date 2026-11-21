import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { IDBFactory } from 'fake-indexeddb';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetConnection } from '../db';

// 테스트마다 빈 데이터베이스로 시작한다
beforeEach(async () => {
  await resetConnection();
  globalThis.indexedDB = new IDBFactory();
  window.location.hash = '';
  document.documentElement.style.fontSize = '';
});
afterEach(() => cleanup());

// jsdom에 없는 것 채우기
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
window.scrollTo = () => {};
