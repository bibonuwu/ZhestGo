import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { syllables } from '../lang/kk/syllables';
import { Icon } from './Icon';

/** The longest wait for one syllable, in case a voice never reports its end. */
const SYLLABLE_MS = 3000;
const PAUSE_MS = 300;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A word split into syllables (Сә•лем) with its own speaker: it says the word
 * one syllable at a time, lighting each up, and then the whole word, so a
 * child who hears poorly can learn how it sounds. Give it a `key` per word.
 */
export function Syllables({ text }: { text: string }) {
  const t = useT();
  /** The syllable being said, or 'all' for the whole word. */
  const [active, setActive] = useState<number | 'all' | null>(null);
  /** Bumped to cancel the running sequence. */
  const run = useRef(0);

  useEffect(
    () => () => {
      run.current++;
    },
    [],
  );

  let count = 0;
  const words = text.split(' ').map((word) => syllables(word).map((part) => ({ part, n: count++ })));
  const playing = active !== null;

  const say = async () => {
    const id = ++run.current;
    const [{ speakText }, { speechFinished, stopSpeaking }] = await Promise.all([import('../lib/phrase'), import('../lib/speech')]);
    if (playing) {
      stopSpeaking();
      setActive(null);
      return;
    }
    const steps: Array<[string, number | 'all']> = [...words.flat().map(({ part, n }): [string, number] => [part, n]), [text, 'all']];
    for (const [part, mark] of steps) {
      if (run.current !== id) return;
      setActive(mark);
      if ((await speakText(part)) === 'none') break;
      await Promise.race([speechFinished(), wait(SYLLABLE_MS)]);
      await wait(PAUSE_MS);
    }
    if (run.current === id) setActive(null);
  };

  return (
    <div className="syllables">
      <p className="syllables__text" lang="kk">
        {words.map((parts, w) => (
          <span key={w}>
            {w > 0 && ' '}
            {parts.map(({ part, n }, i) => (
              <span key={n}>
                {i > 0 && (
                  <span className="syllables__dot" aria-hidden="true">
                    •
                  </span>
                )}
                <span className={`syllables__part${active === 'all' || active === n ? ' is-on' : ''}`}>{part}</span>
              </span>
            ))}
          </span>
        ))}
      </p>
      <button
        type="button"
        className={`round-btn${playing ? ' is-on' : ''}`}
        onClick={() => void say()}
        title={t('learn.syllables')}
        aria-label={t('learn.syllables')}
        aria-pressed={playing}
      >
        <Icon name={playing ? 'stop' : 'speaker'} size={17} />
      </button>
    </div>
  );
}
