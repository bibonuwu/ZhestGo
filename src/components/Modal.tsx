import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';

/**
 * A modal built on <dialog>: the browser handles focus, Esc and the backdrop.
 * Clicking the backdrop closes it too.
 */
export function Modal({
  onClose,
  labelledBy,
  className = '',
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.close')}>
      <Icon name="x" size={20} />
    </button>
  );
}
