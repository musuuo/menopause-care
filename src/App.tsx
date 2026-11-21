import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { useRoute } from './router';
import { useApp } from './store';
import { scheduleReminder } from './reminder';
import { Today } from './screens/Today';
import { Records } from './screens/Records';
import { Summary } from './screens/Summary';
import { Habits } from './screens/Habits';
import { Info } from './screens/Info';
import { SettingsScreen } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';

export default function App() {
  const { ready, settings } = useApp();
  const [page = 'today', sub] = useRoute();

  useEffect(() => scheduleReminder(settings), [settings]);

  if (!ready) return <p className="loading">불러오는 중이에요…</p>;
  if (!settings.onboarded) return <Onboarding />;

  let screen;
  let tab = page;
  switch (page) {
    case 'records':
      screen = sub === 'summary' ? <Summary /> : <Records />;
      break;
    case 'habits':
      screen = <Habits />;
      break;
    case 'info':
      screen = <Info id={sub} />;
      break;
    case 'settings':
      screen = <SettingsScreen sub={sub} />;
      tab = 'today';
      break;
    default:
      screen = <Today date={sub} />;
      tab = 'today';
  }

  return (
    <>
      <main className="main">{screen}</main>
      <TabBar current={tab} />
    </>
  );
}
