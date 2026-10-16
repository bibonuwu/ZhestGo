import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LOCALES, useT } from '../i18n';
import { CHAT_GAP_MS, CHAT_MAX_LENGTH, cleanText, deleteMessage, sendMessage, watchChat, type ChatMessage } from '../lib/chat';
import type { PublicUser } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';
import { reloadWithChat, useUi } from '../store/ui';
import { Icon } from './Icon';
import { Avatar } from './Leaderboard';

/** Messages of one person within this time are shown as one group. */
const GROUP_MS = 5 * 60 * 1000;

const dayKey = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '');

function useDayLabel() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  return (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (dayKey(d) === dayKey(today)) return t('chat.today');
    if (dayKey(d) === dayKey(yesterday)) return t('chat.yesterday');
    return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long' }).format(d);
  };
}

function Messages({ messages, me }: { messages: ChatMessage[]; me: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const dayLabel = useDayLabel();
  const time = new Intl.DateTimeFormat(LOCALES[lang], { hour: '2-digit', minute: '2-digit' });

  const remove = async (id: string) => {
    if (!window.confirm(t('chat.delete.confirm'))) return;
    try {
      await deleteMessage(id);
    } catch {
      useUi.getState().showToast(t('chat.error'));
    }
  };

  return (
    <ol className="chat__list">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = Boolean(m.at) && (!prev || dayKey(prev.at) !== dayKey(m.at));
        const grouped = !newDay && prev?.uid === m.uid && Boolean(m.at && prev.at && m.at.getTime() - prev.at.getTime() < GROUP_MS);
        const mine = m.uid === me;
        return (
          <li key={m.id} className="chat__item">
            {newDay && m.at && (
              <p className="chat__day">
                <span>{dayLabel(m.at)}</span>
              </p>
            )}
            <div className={`chat__msg${mine ? ' is-mine' : ''}${grouped ? ' is-grouped' : ''}${m.pending ? ' is-pending' : ''}`}>
              {!mine && (grouped ? <span className="chat__spacer" /> : <Avatar name={m.name} size={32} />)}
              <div className="chat__bubble">
                {!grouped && !mine && <strong className="chat__name">{m.name}</strong>}
                <p className="chat__text">{m.text}</p>
                {m.at && (
                  <time className="chat__time" dateTime={m.at.toISOString()}>
                    {time.format(m.at)}
                  </time>
                )}
              </div>
              {mine && !m.pending && (
                <button type="button" className="chat__delete" onClick={() => void remove(m.id)} aria-label={t('chat.delete')} title={t('chat.delete')}>
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Room({ user }: { user: PublicUser }) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  /** Follow new messages unless the reader scrolled up to older ones. */
  const atBottom = useRef(true);
  const lastSent = useRef(0);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    watchChat(setMessages, () => setFailed(true)).then(
      (unsubscribe) => (cancelled ? unsubscribe() : (stop = unsubscribe)),
      () => setFailed(true),
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [user.id]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const send = async () => {
    const clean = cleanText(text);
    if (!clean) return;
    if (Date.now() - lastSent.current < CHAT_GAP_MS) {
      useUi.getState().showToast(t('chat.slow'));
      return;
    }
    lastSent.current = Date.now();
    atBottom.current = true;
    setText('');
    try {
      await sendMessage(user, clean);
    } catch {
      // Put the text back so it is not lost.
      setText((now) => now || clean);
      useUi.getState().showToast(t('chat.failed'));
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const left = CHAT_MAX_LENGTH - text.length;

  return (
    <>
      <div
        ref={scroller}
        className="chat__scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        aria-live="polite"
        aria-busy={!messages && !failed}
      >
        {failed ? (
          <div className="chat__state">
            <Icon name="wifiOff" size={22} />
            <p>{t('chat.error')}</p>
            {/* A failed download of the chat stays failed until the page reloads. */}
            <button type="button" className="btn btn--sm" onClick={reloadWithChat}>
              <Icon name="replay" size={15} /> {t('chat.retry')}
            </button>
          </div>
        ) : !messages ? (
          <p className="chat__state" role="status">
            <span className="spinner" aria-hidden="true" />
            {t('chat.loading')}
          </p>
        ) : messages.length === 0 ? (
          <p className="chat__state">
            <Icon name="chat" size={26} />
            {t('chat.empty')}
          </p>
        ) : (
          <Messages messages={messages} me={user.id} />
        )}
      </div>

      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          {t('chat.placeholder')}
        </label>
        <textarea
          ref={input}
          id="chat-input"
          rows={1}
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          placeholder={t('chat.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={failed}
        />
        <button type="submit" className="chat__send" disabled={!cleanText(text) || failed} aria-label={t('chat.send')} title={t('chat.send')}>
          <Icon name="send" size={18} />
        </button>
        <p className="chat__hint">
          {left <= 50 ? <span className="chat__left">{left}</span> : null}
          {t('chat.rules')}
        </p>
      </form>
    </>
  );
}

function Guest() {
  const t = useT();
  const available = useAuth((s) => s.available);
  return (
    <div className="chat__guest">
      <span className="chat__guest-icon" aria-hidden="true">
        <Icon name="users" size={28} />
      </span>
      <h3>{t('chat.guest.title')}</h3>
      <p>{available ? t('chat.guest.text') : t('chat.error')}</p>
      {available && (
        <div className="chat__guest-actions">
          <button type="button" className="btn btn--primary" onClick={() => useUi.getState().goAuth('register')}>
            {t('account.register')}
          </button>
          <button type="button" className="btn" onClick={() => useUi.getState().goAuth('login')}>
            {t('account.login')}
          </button>
        </div>
      )}
    </div>
  );
}

/** The shared chat for everyone with an account; guests are asked to sign in. */
export function ChatPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const user = useAuth((s) => s.user);
  const checked = useAuth((s) => s.checked);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      // A modal dialog over the page handles Esc itself.
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section className="chat" role="dialog" aria-labelledby="chat-title">
      <header className="chat__head">
        <span className="chat__badge" aria-hidden="true">
          <Icon name="chat" size={20} />
        </span>
        <div>
          <h2 id="chat-title">{t('chat.title')}</h2>
          <p>{t('chat.sub')}</p>
        </div>
        <button type="button" className="chat__close" onClick={onClose} aria-label={t('chat.close')} title={t('chat.close')}>
          <Icon name="chevronDown" size={20} />
        </button>
      </header>
      {user ? (
        <Room key={user.id} user={user} />
      ) : checked ? (
        <Guest />
      ) : (
        <p className="chat__state" role="status">
          <span className="spinner" aria-hidden="true" />
          {t('chat.loading')}
        </p>
      )}
    </section>
  );
}
