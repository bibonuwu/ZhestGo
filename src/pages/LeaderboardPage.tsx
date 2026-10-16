import { Icon, type IconName } from '../components/Icon';
import { Avatar, LeaderboardRow, Podium, useLiveLeaderboard } from '../components/Leaderboard';
import { PageHead } from '../components/PageHead';
import { SIGNS } from '../data/signs';
import { LOCALES, useT } from '../i18n';
import { useAuth } from '../store/auth';
import { useLeaderboard } from '../store/leaderboard';
import { useSettings } from '../store/settings';
import { useUi } from '../store/ui';

/** Where the signed-in visitor stands, or the invitation to join. */
function MyCard({ total }: { total: number }) {
  const t = useT();
  const user = useAuth((s) => s.user);
  const me = useLeaderboard((s) => s.data?.me);

  if (!user) {
    return (
      <section className="card my-card my-card--guest">
        <span className="my-card__icon">
          <Icon name="trophy" size={22} />
        </span>
        <p>{t('leader.join')}</p>
        <button type="button" className="btn btn--primary" onClick={() => useUi.getState().goAuth('register')}>
          {t('account.register')} <Icon name="arrowRight" size={16} />
        </button>
      </section>
    );
  }

  const learned = me?.learned ?? user.learned.length;
  const percent = Math.round((learned / total) * 100);
  return (
    <section className="card my-card">
      <div className="my-card__who">
        <Avatar name={user.name} size={48} />
        <div>
          <strong>{user.name}</strong>
          <span>{me?.rank ? t('leader.you') : t('leader.noRank')}</span>
        </div>
        {me?.rank && (
          <b className="my-card__rank" aria-label={t('leader.yourRank', { rank: me.rank })}>
            #{me.rank}
          </b>
        )}
      </div>
      <div className="my-card__progress">
        <span>{t('learn.progress', { n: learned, total })}</span>
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </span>
      </div>
      <a className="btn btn--soft" href="#/learn">
        <Icon name="film" size={16} /> {t('learn.continue')}
      </a>
    </section>
  );
}

export function LeaderboardPage() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const { data, status } = useLiveLeaderboard(50);
  const fmt = (n: number) => new Intl.NumberFormat(LOCALES[lang]).format(n);
  const total = data?.signs ?? SIGNS.length;
  const rest = data?.top.slice(3) ?? [];
  const stats: Array<{ icon: IconName; value: string; label: string; tone: string }> = data
    ? [
        { icon: 'users', value: fmt(data.users), label: t('home.stat.users'), tone: 'blue' },
        { icon: 'trophy', value: fmt(data.totalLearned), label: t('home.stat.learned'), tone: 'gold' },
        { icon: 'film', value: fmt(total), label: t('home.stat.videos'), tone: 'mint' },
      ]
    : [];

  return (
    <div className="page leaderboard">
      <PageHead
        icon="trophy"
        eyebrow={t('home.leader.eyebrow')}
        title={t('leader.title')}
        sub={t('leader.page.sub')}
        aside={
          <div className="leaderboard__actions">
            <span className={`lb-live${status === 'ready' ? '' : ' is-off'}`}>
              <i aria-hidden="true" /> {t('leader.live')}
            </span>
            <button type="button" className="btn" onClick={() => void useLeaderboard.getState().refresh()}>
              <Icon name="replay" size={16} /> {t('leader.refresh')}
            </button>
          </div>
        }
      />

      {status === 'unavailable' ? (
        <div className="empty-state">
          <span className="empty-state__icon">
            <Icon name="wifiOff" size={22} />
          </span>
          <p>{t('leader.offline')}</p>
        </div>
      ) : !data ? (
        <div className="page-loading" role="status">
          <span className="spinner" aria-hidden="true" /> {t('leader.loading')}
        </div>
      ) : (
        <div className="leaderboard__layout">
          <section className="card leaderboard__podium" aria-label={t('leader.top3')}>
            <h2 className="leaderboard__heading">
              <Icon name="crown" size={18} /> {t('leader.top3')}
            </h2>
            <Podium rows={data.top.slice(0, 3)} total={total} />
            {data.top.length === 0 && <p className="leaderboard__first">{t('leader.empty')}</p>}
          </section>

          <aside className="leaderboard__side">
            <div className="leaderboard__stats">
              {stats.map((s) => (
                <div key={s.icon} className={`mini-stat mini-stat--${s.tone}`}>
                  <span className="mini-stat__icon">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <strong>{s.value}</strong>
                  <small>{s.label}</small>
                </div>
              ))}
            </div>
            <MyCard total={total} />
          </aside>

          {rest.length > 0 && (
            <section className="card leaderboard__list" aria-labelledby="leader-all">
              <h2 id="leader-all" className="leaderboard__heading">
                <Icon name="users" size={18} /> {t('leader.all')}
                <span className="count">{rest.length}</span>
              </h2>
              {rest.map((r) => (
                <LeaderboardRow key={`${r.rank}-${r.name}`} row={r} total={total} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
