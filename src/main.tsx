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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
