import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { translate } from './i18n';
import { useSettings } from './store/settings';
import { useUi, type InstallPromptEvent } from './store/ui';
import './styles.css';
import './site.css';

// Offline support: the service worker caches the app, the fonts and the
// recognition models. A new version waits until the user chooses to update.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    useUi.setState({ updateReady: true, applyUpdate: () => void updateSW(true) });
  },
  onOfflineReady() {
    useUi.setState({ offlineReady: true });
    useUi.getState().showToast(translate(useSettings.getState().lang, 'app.offlineReady'));
  },
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  useUi.setState({ installPrompt: e as InstallPromptEvent });
});
window.addEventListener('appinstalled', () => useUi.setState({ installPrompt: null }));
window.addEventListener('online', () => useUi.setState({ online: true }));
window.addEventListener('offline', () => useUi.setState({ online: false }));

// Inter comes in parts: Latin, Cyrillic, and the extended Cyrillic that holds the Kazakh
// letters. Each part arriving after the first render makes the browser lay the whole page
// out again, which phones feel as a freeze; so the first render waits for all three
// (briefly: the service worker serves them from the cache).
const FONT_SAMPLE = 'Qoldau 0 Сәлем ғқңөұүһі';
const fontsReady = Promise.race([
  document.fonts?.load('1em "Inter Variable"', FONT_SAMPLE) ?? Promise.resolve(),
  new Promise((resolve) => setTimeout(resolve, 500)),
]).catch(() => undefined);

void fontsReady.then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
