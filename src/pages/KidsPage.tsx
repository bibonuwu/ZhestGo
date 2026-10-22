import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Modal, ModalClose } from '../components/Modal';
import { PageHead } from '../components/PageHead';
import { CARTOONS, COMICS, type Cartoon, type Comic } from '../data/kids';
import { useT } from '../i18n';
import { publicUrl } from '../lib/media';

/** A horizontal drag this long turns the page. */
const SWIPE_PX = 50;

/** Only one cartoon plays at a time. */
function pauseOthers(e: SyntheticEvent<HTMLVideoElement>) {
  for (const video of document.querySelectorAll<HTMLVideoElement>('.cartoon video')) {
    if (video !== e.currentTarget) video.pause();
  }
}

function CartoonCard({ cartoon }: { cartoon: Cartoon }) {
  return (
    <article className="cartoon">
      <video
        src={publicUrl(cartoon.video)}
        poster={cartoon.poster ? publicUrl(cartoon.poster) : undefined}
        controls
        playsInline
        preload="metadata"
        onPlay={pauseOthers}
      />
      <h3 lang="kk">{cartoon.title}</h3>
    </article>
  );
}

/** A comic book: the cover first, then the pages, turned with the arrows, the arrow keys or a swipe. */
function ComicReader({ comic, onClose }: { comic: Comic; onClose: () => void }) {
  const t = useT();
  const pages = [comic.cover, ...comic.pages];
  const last = pages.length - 1;
  const [index, setIndex] = useState(0);
  const swipeFrom = useRef<number | null>(null);
  const go = (to: number) => setIndex(Math.max(0, Math.min(last, to)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  // The next page loads while this one is read.
  const following = pages[index + 1];
  useEffect(() => {
    if (following) new Image().src = publicUrl(following);
  }, [following]);

  const label = index === 0 ? t('book.cover') : t('book.page', { n: index, total: last });

  return (
    <Modal onClose={onClose} labelledBy="book-title" className="book">
      <ModalClose onClose={onClose} />
      <header className="book__head">
        <h2 id="book-title" lang="kk">
          {comic.title}
        </h2>
        <span className="book__count" aria-live="polite">
          {label}
        </span>
      </header>
      <div
        className="book__stage"
        onPointerDown={(e) => (swipeFrom.current = e.clientX)}
        onPointerUp={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from !== null && Math.abs(e.clientX - from) > SWIPE_PX) go(index + (e.clientX < from ? 1 : -1));
        }}
        onPointerCancel={() => (swipeFrom.current = null)}
      >
        <img src={publicUrl(pages[index])} alt={`${comic.title}: ${label}`} draggable={false} />
        <button type="button" className="book__arrow book__arrow--prev" disabled={index === 0} onClick={() => go(index - 1)} aria-label={t('book.prev')}>
          <Icon name="chevronLeft" size={28} />
        </button>
        <button type="button" className="book__arrow book__arrow--next" disabled={index === last} onClick={() => go(index + 1)} aria-label={t('book.next')}>
          <Icon name="chevronRight" size={28} />
        </button>
      </div>
      {index === last && last > 0 && (
        <button type="button" className="btn btn--sm" onClick={() => go(0)}>
          <Icon name="replay" size={15} /> {t('book.again')}
        </button>
      )}
    </Modal>
  );
}

function Soon({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={22} />
      </span>
      <p>{text}</p>
    </div>
  );
}

export function KidsPage() {
  const t = useT();
  const [reading, setReading] = useState<Comic | null>(null);

  return (
    <div className="page kids">
      <PageHead icon="smile" eyebrow={t('kids.eyebrow')} title={t('kids.title')} sub={t('kids.sub')} />

      <section className="kids__section" aria-labelledby="kids-cartoons">
        <h2 id="kids-cartoons">
          <Icon name="film" size={20} /> {t('kids.cartoons')}
        </h2>
        {CARTOONS.length > 0 ? (
          <div className="cartoon-grid">
            {CARTOONS.map((c) => (
              <CartoonCard key={c.id} cartoon={c} />
            ))}
          </div>
        ) : (
          <Soon icon="film" text={t('kids.cartoons.soon')} />
        )}
      </section>

      <section className="kids__section" aria-labelledby="kids-books">
        <h2 id="kids-books">
          <Icon name="book" size={20} /> {t('kids.books')}
        </h2>
        {COMICS.length > 0 ? (
          <div className="comic-grid">
            {COMICS.map((c) => (
              <button key={c.id} type="button" className="comic-card" onClick={() => setReading(c)}>
                <span className="comic-card__cover">
                  <img src={publicUrl(c.cover)} alt="" loading="lazy" />
                </span>
                <span className="comic-card__text">
                  <strong lang="kk">{c.title}</strong>
                  <small>{t('kids.pages', { n: c.pages.length })}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Soon icon="book" text={t('kids.books.soon')} />
        )}
      </section>

      {reading && <ComicReader comic={reading} onClose={() => setReading(null)} />}
    </div>
  );
}
