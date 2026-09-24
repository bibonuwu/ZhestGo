import { useEffect, useState } from 'react';
import { Header, type Page } from './components/Header';
import { AUTHORS } from './data/authors';
import { useT } from './i18n';
import { DictionaryPage } from './pages/DictionaryPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrainPage } from './pages/TrainPage';
import { TranslatePage } from './pages/TranslatePage';
import { useSettings } from './store/settings';
import { useServerStatus } from './store/status';
import { useTraining } from './store/training';
import { useUi } from './store/ui';
import { useVoice } from './store/voice';

const PAGES: readonly Page[] = ['translate', 'dictionary', 'train', 'settings'];

interface Route {
  page: Page;
  params: URLSearchParams;
}

function parseHash(): Route {
  const [path = '', query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const page = PAGES.includes(path as Page) ? (path as Page) : 'translate';
  return { page, params: new URLSearchParams(query) };
}

function Footer() {
  const t = useT();
  return (
    <footer className="footer">
      <span>
        {t('footer.authors')}: <strong>{AUTHORS.join(', ')}</strong>
      </span>
      <span className="footer__app">Qoldau · {new Date().getFullYear()}</span>
    </footer>
  );
}

function Toast() {
  const toast = useUi((s) => s.toast);
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          {toast.text}
        </div>
      )}
    </div>
  );
}

export function App() {
  const [route, setRoute] = useState(parseHash);
  const theme = useSettings((s) => s.theme);
  const lang = useSettings((s) => s.lang);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void useTraining.getState().load();
    void useVoice.getState().refresh();
    // The API server is optional; only ask for it when there is a network.
    const refreshServer = () => void useServerStatus.getState().refresh();
    if (navigator.onLine) refreshServer();
    window.addEventListener('online', refreshServer);
    return () => window.removeEventListener('online', refreshServer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="app">
      <Header page={route.page} />
      <main className="main" id="main">
        {route.page === 'translate' && <TranslatePage />}
        {route.page === 'dictionary' && <DictionaryPage />}
        {route.page === 'train' && <TrainPage initialWord={route.params.get('word') ?? undefined} />}
        {route.page === 'settings' && <SettingsPage />}
      </main>
      <Footer />
      <Toast />
    </div>
  );
}
