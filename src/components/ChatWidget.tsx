import { useEffect, useState } from 'react';
import '../chat.css';
import { useT } from '../i18n';
import { reloadWithChat, useUi } from '../store/ui';
import { Icon } from './Icon';

type Panel = typeof import('./ChatPanel').ChatPanel;

/** Kept after the first load, so reopening the chat is instant. */
let loaded: Panel | null = null;
/** The panel could not be downloaded; the browser keeps that failure until a reload. */
let failed = false;

/**
 * The shared chat: a button in the bottom corner that opens the panel.
 * The panel is downloaded when the chat is first opened. When that fails
 * (offline, or a new version replaced the files) the panel closes with a
 * message, and the next open while online reloads the page into the chat.
 * React.lazy would keep the failure and throw it to the whole page.
 */
export function ChatWidget() {
  const t = useT();
  const open = useUi((s) => s.chatOpen);
  const setOpen = useUi((s) => s.setChatOpen);
  const [Panel, setPanel] = useState<Panel | null>(() => loaded);

  useEffect(() => {
    if (!open || Panel) return;
    if (failed && navigator.onLine) {
      reloadWithChat();
      return;
    }
    let current = true;
    import('./ChatPanel').then(
      (m) => {
        loaded = m.ChatPanel;
        if (current) setPanel(() => m.ChatPanel);
      },
      () => {
        failed = true;
        if (!current) return;
        useUi.getState().setChatOpen(false);
        useUi.getState().showToast(t('chat.error'));
      },
    );
    return () => {
      current = false;
    };
  }, [open, Panel, t]);

  if (open && Panel) return <Panel onClose={() => setOpen(false)} />;

  if (open) {
    return (
      <div className="chat-fab chat-fab--loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">{t('chat.loading')}</span>
      </div>
    );
  }

  return (
    <button type="button" className="chat-fab" onClick={() => setOpen(true)} aria-label={t('chat.open')}>
      <Icon name="chat" size={22} />
      <span className="chat-fab__label">{t('chat.open')}</span>
    </button>
  );
}
