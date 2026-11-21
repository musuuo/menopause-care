import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './store.tsx';
import { FeedbackProvider } from './components/Feedback.tsx';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AppProvider>
  </StrictMode>,
);
