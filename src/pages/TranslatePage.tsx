import { useCallback, useEffect, useRef } from 'react';
import { CameraStage } from '../components/CameraStage';
import { HistoryPanel, OutputPanel, QuickPhrasesPanel, SentencePanel } from '../components/PhrasePanels';
import { lookupWord } from '../data/words';
import type { EngineFrame } from '../hooks/useGestureEngine';
import { forgetGesture, rememberGesture } from '../lib/learning';
import { finalizeSentence, speakText } from '../lib/phrase';
import { warmUpOfflineVoice } from '../speech/piperClient';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useVoice } from '../store/voice';

/** How far back to look for the frames of a recognised gesture. */
const GESTURE_WINDOW_MS = 900;

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function TranslatePage() {
  const recent = useRef<{ t: number; v: number[] }[]>([]);

  const onFrame = useCallback((f: EngineFrame) => {
    const session = useSession.getState();
    const settings = useSettings.getState();

    if (f.features) {
      recent.current.push({ t: f.t, v: f.features });
      while (recent.current.length && recent.current[0].t < f.t - GESTURE_WINDOW_MS) recent.current.shift();
    }

    if (f.commit) {
      const { wordId, replaceLast } = f.commit;
      const frames = recent.current.map((r) => r.v);
      const last = session.tokens[session.tokens.length - 1];
      if (replaceLast && last?.source === 'gesture') {
        const { key, replaced } = session.replaceLast(wordId, 'gesture');
        forgetGesture(replaced);
        rememberGesture(key, wordId, frames);
      } else {
        rememberGesture(session.addWord(wordId, 'gesture'), wordId, frames);
      }
      if (settings.speakWords) {
        const word = lookupWord(wordId);
        if (word) void speakText(word.kk);
      }
      return;
    }

    // Hands down for a while → the sentence is finished: compose and speak it.
    const { tokens, composing, lastActivity } = useSession.getState();
    if (
      settings.autoSpeak &&
      tokens.length > 0 &&
      !composing &&
      f.handsAbsentFor >= settings.pauseMs &&
      Date.now() - lastActivity >= settings.pauseMs
    ) {
      void finalizeSentence();
    }
  }, []);

  // Load the offline voice in the background so the first sentence is not delayed.
  const voiceId = useSettings((s) => s.voiceId);
  const engine = useSettings((s) => s.engine);
  const voiceReady = useVoice((s) => s.status[voiceId] === 'ready');
  useEffect(() => {
    if (voiceReady && engine !== 'browser') warmUpOfflineVoice(voiceId);
  }, [voiceReady, voiceId, engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      const session = useSession.getState();
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        void finalizeSentence();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        session.undo();
      } else if (e.key === 'Escape') {
        session.clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="page translate">
      <div className="translate__stage">
        <CameraStage onFrame={onFrame} />
        <QuickPhrasesPanel />
      </div>
      <div className="translate__side">
        <SentencePanel />
        <OutputPanel />
        <HistoryPanel />
      </div>
    </div>
  );
}
