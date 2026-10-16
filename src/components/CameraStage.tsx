import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  DIRECTION_LABELS,
  LOCATION_SHORT,
  MOTION_SHORT,
  RELATION_SHORT,
  SHAPE_SHORT,
  type Lang,
} from '../data/gestureText';
import { capitalize, glossOf, lookupWord } from '../data/words';
import type { Candidate } from '../gesture/recognizer';
import type { Direction, HandShape, Location, MotionState, Relation } from '../gesture/types';
import { useCamera } from '../hooks/useCamera';
import { useGestureEngine, type EngineFrame } from '../hooks/useGestureEngine';
import { useT, type Translate } from '../i18n';
import { useSettings } from '../store/settings';
import { useTraining } from '../store/training';
import { useUi } from '../store/ui';
import { BodyZone, HandIcon, MotionIcon } from './GestureVisual';
import { Icon } from './Icon';

interface LiveHand {
  shape: HandShape | null;
  dir: Direction;
  location: Location;
}

interface LiveInfo {
  fps: number;
  hands: number;
  face: boolean;
  dom: LiveHand | null;
  nonDom: LiveHand | null;
  relation: Relation | null;
  motion: MotionState;
  candidate: Candidate | null;
}

const liveHand = (h: EngineFrame['dom']): LiveHand | null => (h ? { shape: h.shape, dir: h.dir, location: h.location } : null);

function toLive(f: EngineFrame): LiveInfo {
  return {
    fps: f.fps,
    hands: f.hands.length,
    face: f.face !== null,
    dom: liveHand(f.dom),
    nonDom: liveHand(f.nonDom),
    relation: f.observation.relation,
    motion: f.observation.motion,
    candidate: f.candidate,
  };
}

const RING = 2 * Math.PI * 17;

function CandidatePill({ candidate, lang, t }: { candidate: Candidate; lang: Lang; t: Translate }) {
  const userWords = useTraining((s) => s.userWords);
  const word = lookupWord(candidate.wordId, userWords);
  if (!word) return null;
  const progress = candidate.blocked ? 1 : candidate.progress;
  return (
    <div className={`candidate${candidate.blocked ? ' candidate--done' : ''}`} role="status">
      <svg className="candidate__ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" className="candidate__track" />
        <circle cx="20" cy="20" r="17" className="candidate__bar" strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} />
        {candidate.blocked && <path d="M13 20.5l4.5 4.5 9-9" className="candidate__check" />}
      </svg>
      <div className="candidate__text">
        <strong lang="kk">{capitalize(word.kk)}</strong>
        <span>
          {glossOf(word, lang)}
          {candidate.blocked && ` · ${t('live.added')}`}
          {candidate.source === 'custom' && ` · ${t('live.custom')}`}
        </span>
      </div>
    </div>
  );
}

function LivePanel({ live, lang, t }: { live: LiveInfo; lang: Lang; t: Translate }) {
  const shapeName = (shape: HandShape | null) => (shape ? SHAPE_SHORT[shape][lang] : t('live.unknown'));
  return (
    <div className="live-panel">
      <div className="live-item">
        {live.dom?.shape ? <HandIcon shape={live.dom.shape} size={34} /> : <span className="live-item__empty">—</span>}
        <div>
          <span className="live-item__label">{t('live.shape')}</span>
          <strong>{live.dom ? shapeName(live.dom.shape) : '—'}</strong>
        </div>
      </div>
      <div className="live-item">
        <BodyZone zone={live.dom?.location === 'low' ? undefined : live.dom?.location} size={24} />
        <div>
          <span className="live-item__label">{t('live.location')}</span>
          <strong>{live.dom ? LOCATION_SHORT[live.dom.location][lang] : '—'}</strong>
        </div>
      </div>
      <div className="live-item">
        <span className="live-item__arrow" data-dir={live.dom?.dir ?? 'up'} aria-hidden="true">
          ↑
        </span>
        <div>
          <span className="live-item__label">{t('live.direction')}</span>
          <strong>{live.dom ? DIRECTION_LABELS[live.dom.dir][lang] : '—'}</strong>
        </div>
      </div>
      <div className="live-item">
        <MotionIcon motion={live.motion} size={26} />
        <div>
          <span className="live-item__label">{t('live.motion')}</span>
          <strong>{live.dom ? MOTION_SHORT[live.motion][lang] : '—'}</strong>
        </div>
      </div>
      <div className="live-item">
        {live.nonDom?.shape ? <HandIcon shape={live.nonDom.shape} second size={34} /> : <span className="live-item__empty">—</span>}
        <div>
          <span className="live-item__label">{t('live.second')}</span>
          <strong>
            {live.nonDom ? shapeName(live.nonDom.shape) : '—'}
            {live.relation && ` · ${RELATION_SHORT[live.relation][lang]}`}
          </strong>
        </div>
      </div>
    </div>
  );
}

interface CameraStageProps {
  onFrame?: (frame: EngineFrame) => void;
  /** Lets the page read the video (e.g. to take a still frame). */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** Extra layers drawn over the video, under the camera's own screens. */
  overlay?: ReactNode;
  /** Hide the recognised-word pill (e.g. while recording a take). */
  hideCandidate?: boolean;
}

export function CameraStage({ onFrame, videoRef: outerVideoRef, overlay, hideCandidate = false }: CameraStageProps) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const cameraId = useSettings((s) => s.cameraId);
  const mirror = useSettings((s) => s.mirror);
  const showDebug = useSettings((s) => s.showDebug);
  const cameraOn = useUi((s) => s.cameraOn);
  const setCameraOn = useUi((s) => s.setCameraOn);

  const ownVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = outerVideoRef ?? ownVideoRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef, cameraOn, cameraId);

  const [live, setLive] = useState<LiveInfo | null>(null);
  const lastLiveAt = useRef(0);
  const handleFrame = useCallback(
    (f: EngineFrame) => {
      onFrame?.(f);
      // React only needs ~12 updates a second for the overlays.
      if (f.commit || f.t - lastLiveAt.current >= 80) {
        lastLiveAt.current = f.t;
        setLive(toLive(f));
      }
    },
    [onFrame],
  );
  const engine = useGestureEngine({ videoRef, canvasRef, running: cameraOn, onFrame: handleFrame });

  const restartCamera = () => {
    setCameraOn(false);
    requestAnimationFrame(() => setCameraOn(true));
  };

  const cameraError =
    camera.state === 'denied'
      ? t('camera.denied')
      : camera.state === 'unsupported'
        ? t('camera.unsupported')
        : camera.state === 'error'
          ? t('camera.error')
          : engine.status === 'error'
            ? t('camera.modelError')
            : null;
  const busy = cameraOn && !cameraError && (camera.state === 'starting' || engine.status === 'loading');
  const ready = cameraOn && camera.state === 'ready' && engine.status === 'ready';

  return (
    <section className="stage">
      <div
        className={`viewport${mirror ? ' viewport--mirror' : ''}${camera.state === 'ready' ? ' viewport--live' : ''}`}
        style={{ aspectRatio: String(camera.aspect) }}
      >
        <video ref={videoRef} className="viewport__video" playsInline muted />
        <canvas ref={canvasRef} className="viewport__canvas" />
        {overlay}

        {!cameraOn && (
          <div className="viewport__screen">
            <div className="viewport__intro">
              <span className="viewport__glyph">
                <Icon name="hand" size={34} />
              </span>
              <p>{t('camera.intro')}</p>
              <button className="btn btn--primary btn--lg" onClick={() => setCameraOn(true)}>
                <Icon name="video" /> {t('camera.start')}
              </button>
              <small>{t('camera.privacy')}</small>
            </div>
          </div>
        )}

        {busy && (
          <div className="viewport__screen viewport__screen--dim">
            <div className="spinner" aria-hidden="true" />
            <p>{camera.state === 'starting' ? t('camera.starting') : t('camera.loading')}</p>
          </div>
        )}

        {cameraOn && cameraError && (
          <div className="viewport__screen viewport__screen--dim">
            <p className="viewport__error">{cameraError}</p>
            {camera.state !== 'unsupported' && (
              <button className="btn" onClick={engine.status === 'error' ? engine.retry : restartCamera}>
                <Icon name="replay" /> {t('camera.retry')}
              </button>
            )}
          </div>
        )}

        {ready && live && (
          <>
            <div className="viewport__chips">
              <span className="chip-status">
                {Math.round(live.fps)} {t('camera.fps')}
              </span>
              {live.hands === 0 && <span className="chip-status chip-status--warn">{t('camera.noHands')}</span>}
              {live.hands > 0 && !live.face && <span className="chip-status chip-status--warn">{t('camera.noFace')}</span>}
            </div>
            {live.candidate && !hideCandidate && <CandidatePill candidate={live.candidate} lang={lang} t={t} />}
          </>
        )}

        {cameraOn && (
          <button className="viewport__stop" onClick={() => setCameraOn(false)} title={t('camera.stop')} aria-label={t('camera.stop')}>
            <Icon name="power" size={16} />
          </button>
        )}
      </div>

      {showDebug && ready && live && <LivePanel live={live} lang={lang} t={t} />}
    </section>
  );
}
