import { navigate } from '../router';

const TABS = [
  { id: 'today', label: '오늘', icon: '📝' },
  { id: 'records', label: '기록', icon: '📅' },
  { id: 'habits', label: '습관', icon: '🌱' },
  { id: 'info', label: '정보', icon: '📖' },
];

export function TabBar({ current }: { current: string }) {
  return (
    <nav className="tabbar" aria-label="화면 이동">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab ${current === t.id ? 'tab-active' : ''}`}
          aria-current={current === t.id ? 'page' : undefined}
          onClick={() => navigate(`/${t.id}`)}
        >
          <span className="tab-icon" aria-hidden="true">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
