import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { useUi } from '../store/ui';

/** "Terms of Use and Privacy Policy" as a link that opens the full text (TermsDialog). */
export function TermsLink({ children }: { children?: ReactNode }) {
  const t = useT();
  return (
    <button type="button" className="terms-link" onClick={() => useUi.getState().setTermsOpen(true)}>
      {children ?? t('terms.link')}
    </button>
  );
}
