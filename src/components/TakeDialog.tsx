import { useEffect, useState } from 'react';
import type { WordEntry } from '../data/vocabulary';
import { capitalize } from '../data/words';
import { LOCALES, useT } from '../i18n';
import { useSettings } from '../store/settings';
import { takeVideo, type Take } from '../store/training';
import { useUi } from '../store/ui';
import { Icon } from './Icon';
import { Modal, ModalClose } from './Modal';

const touchDevice = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/**
 * Saves the clip on the device: on a phone through the share sheet ("Save
 * video" puts it in the gallery), elsewhere as a download.
 */
async function saveClip(blob: Blob, name: string): Promise<boolean> {
  const file = new File([blob], name, { type: blob.type });
  if (touchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (err) {
      // Closed the share sheet: nothing saved, nothing to say.
      if (err instanceof DOMException && err.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Plays back one take of the Train page and saves its video to the device. */
export function TakeDialog({
  take,
  word,
  number,
  mirror,
  onClose,
  onRemove,
}: {
  take: Take;
  word: WordEntry;
  number: number;
  mirror: boolean;
  onClose: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null | 'missing'>(null);

  useEffect(() => {
    let url = '';
    let cancelled = false;
    void takeVideo(take.id).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setClip('missing');
        return;
      }
      url = URL.createObjectURL(blob);
      setClip({ blob, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [take.id]);

  const when = new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(take.at);
  const save = () => {
    if (!clip || clip === 'missing') return;
    const ext = clip.blob.type.includes('mp4') ? 'mp4' : 'webm';
    const date = new Date(take.at).toISOString().slice(0, 10);
    void saveClip(clip.blob, `qoldau-${word.id}-${date}-${number || 1}.${ext}`).then((saved) => saved && useUi.getState().showToast(t('train.clip.saved')));
  };

  return (
    <Modal onClose={onClose} labelledBy="take-title" className="take-dialog">
      <ModalClose onClose={onClose} />
      <div className={`take-dialog__media${mirror ? ' is-mirrored' : ''}`}>
        {clip && clip !== 'missing' ? (
          <video src={clip.url} autoPlay muted loop playsInline />
        ) : (
          <p className="take-dialog__empty">{clip === 'missing' ? t('train.clip.missing') : t('leader.loading')}</p>
        )}
      </div>
      <div className="take-dialog__body">
        <h2 id="take-title">
          <span lang="kk">{capitalize(word.kk)}</span> · {t('train.take', { n: number || 1 })}
        </h2>
        <p className="muted">{when}</p>
        <p className="take-dialog__where">
          <Icon name="info" size={15} />
          <span>{t('train.clip.where')}</span>
        </p>
        <div className="take-dialog__actions">
          <button type="button" className="btn btn--primary" onClick={save} disabled={!clip || clip === 'missing'}>
            <Icon name="download" size={16} /> {t('train.clip.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--danger" onClick={onRemove}>
            <Icon name="trash" size={16} /> {t('train.removeTake')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
