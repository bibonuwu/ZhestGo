import { Icon } from '../components/Icon';
import { LeaderboardRow, MyPlace, Podium, useLiveLeaderboard } from '../components/Leaderboard';
import { SIGNS } from '../data/signs';
import { LOCALES, useT } from '../i18n';
import { useLeaderboard } from '../store/leaderboard';
import { useSettings } from '../store/settings';

export function LeaderboardPage() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { data, status } = useLiveLeaderboard(50);
  const fmt = (n: number) => new Intl.NumberFormat(LOCALES[lang]).format(n);
  const total = data?.signs ?? SIGNS.length;
  const rest = data?.top.slice(3) ?? [];

  return (
    <div className="page leaderboard">
      <header className="page-hero">
        <div>
          <p className="eyebrow">{t('home.leader.eyebrow')}</p>
          <h1>{t('leader.title')}</h1>
          <p>{t('leader.page.sub')}</p>
        </div>
        <button type="button" className="btn" onClick={() => void useLeaderboard.getState().refresh()}>
          <Icon name="replay" size={16} /> {t('leader.refresh')}
        </button>
      </header>

      {status === 'unavailable' ? (
        <p className="notice notice--warn">
          <Icon name="wifiOff" size={18} /> {t('leader.offline')}
        </p>
      ) : !data ? (
        <p className="empty empty--large">{t('leader.loading')}</p>
      ) : (
        <>
          <section className="leaderboard__stats">
            <div className="stat-tile">
              <span className="stat-tile__icon">
                <Icon name="users" size={20} />
              </span>
              <strong>{fmt(data.users)}</strong>
              <small>{t('home.stat.users')}</small>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__icon">
                <Icon name="trophy" size={20} />
              </span>
              <strong>{fmt(data.totalLearned)}</strong>
              <small>{t('home.stat.learned')}</small>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__icon">
                <Icon name="film" size={20} />
              </span>
              <strong>{total}</strong>
              <small>{t('home.stat.videos')}</small>
            </div>
          </section>

          {data.top.length === 0 ? (
            <p className="empty empty--large">
              <Icon name="trophy" size={20} /> {t('leader.empty')}
            </p>
          ) : (
            <section className="card leaderboard__board" aria-label={t('leader.top3')}>
              <Podium rows={data.top.slice(0, 3)} total={total} />
              {rest.length > 0 && (
                <div className="leaderboard__list" aria-label={t('leader.all')}>
                  {rest.map((r) => (
                    <LeaderboardRow key={`${r.rank}-${r.name}`} row={r} total={total} />
                  ))}
                </div>
              )}
            </section>
          )}
          <MyPlace />
        </>
      )}
    </div>
  );
}
