import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface PageHeadProps {
  icon: IconName;
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** Beside the title on wide screens, under it on phones. */
  aside?: ReactNode;
  /** A shorter header for the camera pages, so the camera stays in view. */
  compact?: boolean;
}

/** The title block every app page starts with. */
export function PageHead({ icon, eyebrow, title, sub, aside, compact = false }: PageHeadProps) {
  return (
    <header className={`page-head${compact ? ' page-head--compact' : ''}`}>
      <div className="page-head__text">
        <p className="page-head__eyebrow">
          <Icon name={icon} size={14} />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        {sub && <p className="page-head__sub">{sub}</p>}
      </div>
      {aside && <div className="page-head__aside">{aside}</div>}
    </header>
  );
}

/** Numbered steps with ticks; the first unfinished one is current. Phones show only its label. */
export function Steps({ labels, done, label }: { labels: readonly string[]; done: readonly boolean[]; label: string }) {
  const active = done.indexOf(false);
  return (
    <ol className="progress-steps" aria-label={label}>
      {labels.map((text, i) => (
        <li
          key={text}
          className={`progress-step${done[i] ? ' is-done' : ''}${i === active ? ' is-active' : ''}`}
          aria-current={i === active ? 'step' : undefined}
        >
          <span className="progress-step__mark">{done[i] ? <Icon name="check" size={14} /> : i + 1}</span>
          <span className="progress-step__label">{text}</span>
        </li>
      ))}
    </ol>
  );
}
