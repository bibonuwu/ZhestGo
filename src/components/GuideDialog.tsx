import { GUIDE } from '../data/guide';
import { useT } from '../i18n';
import { publicUrl } from '../lib/media';
import { Modal, ModalClose } from './Modal';

const SEEN = 'qoldau.guide.seen';

/** Whether the guide should open by itself: there is a video and this browser has not closed it yet. */
export function guideDue(): boolean {
  if (!GUIDE.video) return false;
  try {
    return localStorage.getItem(SEEN) !== '1';
  } catch {
    // Without storage it would open on every visit.
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    // It may open again next time.
  }
}

/** “How to use the site”: the title and a screen recording. */
export function GuideDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const close = () => {
    markSeen();
    onClose();
  };
  return (
    <Modal onClose={close} labelledBy="guide-title" className="guide">
      <ModalClose onClose={close} />
      <h2 id="guide-title">{t('guide.title')}</h2>
      <video src={publicUrl(GUIDE.video)} poster={GUIDE.poster ? publicUrl(GUIDE.poster) : undefined} controls playsInline preload="metadata" />
      <button type="button" className="btn btn--primary btn--lg" onClick={close}>
        {t('guide.ok')}
      </button>
    </Modal>
  );
}
