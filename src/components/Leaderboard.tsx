import { useEffect, type CSSProperties } from 'react';
import { SIGNS } from '../data/signs';
import { LOCALES, useT } from '../i18n';
import type { LeaderRow } from '../lib/cloud';
import { useAuth } from '../store/auth';
import { useLeaderboard } from '../store/leaderboard';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';
import { Icon } from './Icon';

const AVATAR_HUES = [198, 222, 262, 330, 18, 38, 152, 172];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toLocaleUpperCase() || '?';
}

/** A stable colour per name, so the same person always looks the same. */
function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ '--avatar-hue': hue(name), width: size, height: size } as CSSProperties} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

let watchers = 0;
let watchTimer: ReturnType<typeof setInterval> | undefined;

/**
 * Loads the top `size` places and refreshes them every minute while any
 * component shows the leaderboard and the tab is visible (Firestore reads are
 * metered, so a hidden tab does not poll).
 */
export function useLiveLeaderboard(size = 3) {
  const state = useLeaderboard();
  useEffect(() => {
    useLeaderboard.getState().want(size);
  }, [size]);
  useEffect(() => {
    if (watchers++ === 0) {
      const refresh = () => {
        if (document.visibilityState === 'visible') void useLeaderboard.getState().refresh();
      };
      refresh();
      watchTimer = setInterval(refresh, 60_000);
    }
    return () => {
      if (--watchers === 0) clearInterval(watchTimer);
    };
  }, []);
  return state;
}

function Row({ row, total }: { row: LeaderRow; total: number }) {
  const t = useT();
  return (
    <div className={`lb-row${row.me ? ' is-me' : ''}`}>
      <span className="lb-row__rank">{row.rank}</span>
      <Avatar name={row.name} />
      <span className="lb-row__who">
        <strong>
          {row.name}
          {row.me && <em> · {t('leader.you')}</em>}
        </strong>
        <span className="lb-row__bar" aria-hidden="true">
          <i style={{ width: `${Math.round((row.learned / total) * 100)}%` }} />
        </span>
      </span>
      <span className="lb-row__score">
        <strong>{row.learned}</strong>
        <small>{t('leader.signs')}</small>
      </span>
      {row.rank === 1 ? <Icon name="crown" size={17} /> : <span aria-hidden="true" />}
    </div>
  );
}

/** Join prompt for guests, or where the signed-in user stands. */
function MyPlace() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const me = useLeaderboard((s) => s.data?.me);
  if (!user) {
    return (
      <button type="button" className="lb-join" onClick={() => useUi.getState().goAuth('register')}>
        <Icon name="trophy" size={18} /> {t('leader.join')} <Icon name="arrowRight" size={16} />
      </button>
    );
  }
  return (
    <p className="lb-me">
      <Icon name="user" size={16} />
      {me?.rank ? t('leader.yourRank', { rank: me.rank }) : t('leader.noRank')}
    </p>
  );
}

/** The live leaderboard card: who learned the most signs. */
export function LeaderboardCard({ limit = 5 }: { limit?: number }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { data, status } = useLiveLeaderboard(limit);
  const total = data?.signs ?? SIGNS.length;
  const rows = data?.top.slice(0, limit) ?? [];
  const meRow = data?.top.find((r) => r.me && r.rank > limit);
  const fmt = (n: number) => new Intl.NumberFormat(LOCALES[lang]).format(n);

  return (
    <article className="lb-card">
      <header className="lb-card__head">
        <span className={`lb-live${status === 'ready' ? '' : ' is-off'}`}>
          <i aria-hidden="true" /> {t('leader.live')}
        </span>
        {data && <span className="lb-card__meta">{t('leader.subtitle', { n: fmt(data.learners), total: fmt(data.totalLearned) })}</span>}
      </header>
      <div className="lb-card__title">
        <h3>{t('leader.title')}</h3>
        <span className="lb-card__total">
          <strong>{total}</strong> {t('leader.signs')}
        </span>
      </div>

      <div className="lb-card__list">
        {status === 'unavailable' ? (
          <p className="lb-empty">
            <Icon name="wifiOff" size={18} /> {t('leader.offline')}
          </p>
        ) : !data ? (
          <p className="lb-empty">{t('leader.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="lb-empty">
            <Icon name="trophy" size={18} /> {t('leader.empty')}
          </p>
        ) : (
          <>
            {rows.map((r) => (
              <Row key={`${r.rank}-${r.name}`} row={r} total={total} />
            ))}
            {meRow && <Row row={meRow} total={total} />}
          </>
        )}
      </div>
      {status !== 'unavailable' && <MyPlace />}
    </article>
  );
}

/** Podium order, left to right: second, first, third. */
const PLACES = [2, 1, 3] as const;

/** Places 1–3 on a podium, the winner in the middle. */
export function Podium({ rows, total }: { rows: LeaderRow[]; total: number }) {
  const t = useT();
  const order = [rows[1], rows[0], rows[2]];
  return (
    <ol className="podium" aria-label={t('leader.top3')}>
      {order.map((r, i) =>
        r ? (
          <li key={r.rank} className={`podium__place podium__place--${r.rank}${r.me ? ' is-me' : ''}`} style={{ order: i }}>
            {r.rank === 1 && (
              <span className="podium__crown" aria-hidden="true">
                <Icon name="crown" size={26} />
              </span>
            )}
            <Avatar name={r.name} size={r.rank === 1 ? 76 : 60} />
            <strong className="podium__name">{r.name}</strong>
            <span className="podium__score">
              {r.learned} / {total} {t('leader.signs')}
            </span>
            <span className="podium__step">{r.rank}</span>
          </li>
        ) : (
          <li key={`empty-${i}`} className={`podium__place podium__place--${PLACES[i]} podium__place--empty`} style={{ order: i }}>
            <span className="podium__seat" style={{ width: PLACES[i] === 1 ? 76 : 60, height: PLACES[i] === 1 ? 76 : 60 }} aria-hidden="true">
              <Icon name="user" size={PLACES[i] === 1 ? 26 : 22} />
            </span>
            <strong className="podium__name">{t('leader.free')}</strong>
            <span className="podium__score">0 / {total}</span>
            <span className="podium__step">{PLACES[i]}</span>
          </li>
        ),
      )}
    </ol>
  );
}

export { Row as LeaderboardRow };
