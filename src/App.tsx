import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ChatWidget } from './components/ChatWidget';
import { CookieBanner } from './components/CookieBanner';
import { DonateDialog } from './components/DonateDialog';
import { Header, type Page } from './components/Header';
import { LessonDialog } from './components/LessonDialog';
import { useT } from './i18n';
import { AuthPage } from './pages/AuthPage';
import { HomePage, SiteFooter } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LearnPage } from './pages/LearnPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { useAuth } from './store/auth';
import { useSettings } from './store/settings';
import { useServerStatus } from './store/status';
import { useTraining } from './store/training';
import { useUi } from './store/ui';
import { useVoice } from './store/voice';

// The camera pages carry the recognition engine; they load when first opened,
// so the home page appears quickly.
const TranslatePage = lazy(() => import('./pages/TranslatePage').then((m) => ({ default: m.TranslatePage })));
const DictionaryPage = lazy(() => import('./pages/DictionaryPage').then((m) => ({ default: m.DictionaryPage })));
const TrainPage = lazy(() => import('./pages/TrainPage').then((m) => ({ default: m.TrainPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
// Rarely opened dialogs with long texts.
const FeedbackDialog = lazy(() => import('./components/FeedbackDialog').then((m) => ({ default: m.FeedbackDialog })));
const TermsDialog = lazy(() => import('./components/TermsDialog').then((m) => ({ default: m.TermsDialog })));

const PAGES: readonly Page[] = ['home', 'translate', 'dictionary', 'learn', 'leaderboard', 'train', 'settings', 'privacy', 'login', 'register'];

interface Route {
  page: Page;
  params: URLSearchParams;
}

function parseHash(): Route {
  const [path = '', query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const page = PAGES.includes(path as Page) ? (path as Page) : 'home';
  return { page, params: new URLSearchParams(query) };
}

function Toast() {
  const toast = useUi((s) => s.toast);
  const region = useRef<HTMLDivElement>(null);

  // A popover sits in the top layer, so the toast also shows above open dialogs.
  useEffect(() => {
    const el = region.current;
    if (!el?.showPopover) return;
    if (el.matches(':popover-open')) el.hidePopover();
    if (toast) el.showPopover();
  }, [toast]);

  return (
    <div ref={region} className="toast-region" aria-live="polite" popover="manual">
      {toast && (
        <div key={toast.id} className="toast">
          {toast.text}
        </div>
      )}
    </div>
  );
}

function Dialogs() {
  const dialog = useUi((s) => s.dialog);
  const lesson = useUi((s) => s.lesson);
  const feedback = useUi((s) => s.feedback);
  const termsOpen = useUi((s) => s.termsOpen);
  const { closeDialog, closeLesson, closeFeedback, setTermsOpen } = useUi.getState();
  // In this order: a report opens over its lesson, the terms over everything.
  return (
    <>
      {dialog === 'donate' && <DonateDialog onClose={closeDialog} />}
      {lesson && <LessonDialog id={lesson} onClose={closeLesson} />}
      <Suspense fallback={null}>
        {feedback && <FeedbackDialog target={feedback} onClose={closeFeedback} />}
        {termsOpen && <TermsDialog onClose={() => setTermsOpen(false)} />}
      </Suspense>
    </>
  );
}

function PageLoading() {
  const t = useT();
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" /> {t('leader.loading')}
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
      useUi.getState().closeLesson();
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void useTraining.getState().load();
    void useVoice.getState().refresh();
    // Accounts (Firebase): the saved session also works offline.
    void useAuth.getState().start();
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

  const overlays = (
    <>
      {route.page !== 'login' && route.page !== 'register' && <ChatWidget />}
      <Dialogs />
      <CookieBanner />
      <Toast />
    </>
  );

  // Full-screen pages without the app header.
  if (route.page === 'home' || route.page === 'login' || route.page === 'register') {
    return (
      <>
        {route.page === 'home' ? <HomePage /> : <AuthPage mode={route.page} />}
        {overlays}
      </>
    );
  }

  return (
    <div className="app">
      <Header page={route.page} />
      <main className="main" id="main">
        <Suspense fallback={<PageLoading />}>
          {route.page === 'translate' && <TranslatePage />}
          {route.page === 'dictionary' && <DictionaryPage />}
          {route.page === 'learn' && <LearnPage />}
          {route.page === 'leaderboard' && <LeaderboardPage />}
          {route.page === 'train' && <TrainPage initialWord={route.params.get('word') ?? undefined} />}
          {route.page === 'settings' && <SettingsPage />}
          {route.page === 'privacy' && <PrivacyPage />}
        </Suspense>
      </main>
      <SiteFooter />
      {overlays}
    </div>
  );
}
