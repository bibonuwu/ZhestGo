import { LOCATION_SHORT, MOTION_SHORT, SHAPE_SHORT, type Lang } from '../data/gestureText';
import type { Direction, GestureSpec, HandShape, Location, MotionState } from '../gesture/types';

type ThumbPose = 'out' | 'tucked' | 'wrapped';

interface HandDrawing {
  thumb: ThumbPose;
  fingers: [boolean, boolean, boolean, boolean];
  special?: 'ok' | 'pinch';
}

const DRAWINGS: Record<HandShape, HandDrawing> = {
  fist: { thumb: 'wrapped', fingers: [false, false, false, false] },
  open: { thumb: 'out', fingers: [true, true, true, true] },
  four: { thumb: 'tucked', fingers: [true, true, true, true] },
  point: { thumb: 'wrapped', fingers: [true, false, false, false] },
  v: { thumb: 'wrapped', fingers: [true, true, false, false] },
  three: { thumb: 'wrapped', fingers: [true, true, true, false] },
  k: { thumb: 'out', fingers: [true, true, false, false] },
  thumb: { thumb: 'out', fingers: [false, false, false, false] },
  ok: { thumb: 'out', fingers: [false, true, true, true], special: 'ok' },
  pinky: { thumb: 'wrapped', fingers: [false, false, false, true] },
  call: { thumb: 'out', fingers: [false, false, false, true] },
  l: { thumb: 'out', fingers: [true, false, false, false] },
  ily: { thumb: 'out', fingers: [true, false, false, true] },
  horns: { thumb: 'wrapped', fingers: [true, false, false, true] },
  pinch: { thumb: 'out', fingers: [false, false, false, false], special: 'pinch' },
};

const FINGER_X = [18.5, 25.5, 32.5, 39.5];
const FINGER_LEN = [18, 21, 19, 15];
const PALM_TOP = 30;
const ROTATION: Record<Direction, number> = { up: 0, side: 90, down: 180, forward: 0 };

/** Stylised right hand, palm towards the viewer (as seen in the mirrored camera). */
export function HandIcon({ shape, dir, second = false, size = 48 }: { shape: HandShape; dir?: Direction; second?: boolean; size?: number }) {
  const d = DRAWINGS[shape];
  const rotation = dir ? ROTATION[dir] : 0;
  const forward = dir === 'forward';
  return (
    <svg className={`hand-icon${second ? ' hand-icon--second' : ''}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g transform={`rotate(${rotation} 32 38)${forward ? ' translate(4 5) scale(0.85)' : ''}`}>
        {d.special === 'pinch' ? (
          <path className="skin" d="M17 36 Q16 22 30.5 10 Q45 22 46 36 Z" />
        ) : (
          d.fingers.map((extended, i) =>
            extended ? (
              <rect key={i} className="skin" x={FINGER_X[i]} y={PALM_TOP - FINGER_LEN[i]} width="6.4" height={FINGER_LEN[i] + 6} rx="3.2" />
            ) : (
              <rect key={i} className="skin" x={FINGER_X[i]} y={PALM_TOP - 3} width="6.4" height="8" rx="3.2" />
            ),
          )
        )}
        <rect className="skin" x="16" y={PALM_TOP} width="31" height="24" rx="8" />
        {d.special === 'ok' && <circle className="skin-line" cx="19.5" cy="25" r="6.2" />}
        {d.special !== 'ok' && d.thumb === 'out' && (
          <rect className="skin" x="-3.3" y="-16" width="6.6" height="18" rx="3.3" transform="translate(18 47) rotate(-48)" />
        )}
        {d.thumb === 'tucked' && <rect className="skin skin--fold" x="19" y="41" width="15" height="6.4" rx="3.2" transform="rotate(-10 26 44)" />}
        {d.thumb === 'wrapped' && <rect className="skin skin--fold" x="17.5" y="33" width="18" height="6.6" rx="3.3" />}
      </g>
      {forward && (
        <g className="hand-icon__badge">
          <circle cx="54" cy="10" r="7" />
          <circle cx="54" cy="10" r="2.4" />
        </g>
      )}
    </svg>
  );
}

export function BodyZone({ zone, size = 40 }: { zone?: Location; size?: number }) {
  return (
    <svg className="body-zone" width={size} height={size * 1.25} viewBox="0 0 48 60" aria-hidden="true">
      <path className="body-zone__body" d="M4 60 C4 44 13 37 24 37 C35 37 44 44 44 60 Z" />
      <circle className="body-zone__body" cx="24" cy="18" r="11" />
      {zone === 'head' && <ellipse className="body-zone__hot" cx="24" cy="10" rx="13" ry="6" />}
      {zone === 'face' && <ellipse className="body-zone__hot" cx="24" cy="22" rx="12" ry="6" />}
      {zone === 'chest' && <ellipse className="body-zone__hot" cx="24" cy="47" rx="16" ry="8" />}
      {!zone && <ellipse className="body-zone__any" cx="24" cy="36" rx="20" ry="22" />}
    </svg>
  );
}

export function MotionIcon({ motion, size = 22 }: { motion: MotionState; size?: number }) {
  return (
    <svg className="motion-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {motion === 'still' && (
        <>
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="8" opacity="0.4" />
        </>
      )}
      {motion === 'wave' && <path d="M3 12h18M3 12l3.5-3.5M3 12l3.5 3.5M21 12l-3.5-3.5M21 12l-3.5 3.5" />}
      {motion === 'nod' && <path d="M12 3v18M12 3L8.5 6.5M12 3l3.5 3.5M12 21l-3.5-3.5M12 21l3.5-3.5" />}
      {motion === 'circle' && (
        <>
          <path d="M19 12a7 7 0 1 1-2.05-4.95" />
          <path d="M18.5 3.5v4h-4" />
        </>
      )}
      {motion === 'moving' && <path d="M4 16c3-6 5 2 8-4s5 2 8-4" />}
    </svg>
  );
}

/** Hand shape(s) + body zone + movement: a compact picture of how to sign a word. */
export function GestureVisual({ spec, lang }: { spec: GestureSpec; lang: Lang }) {
  const motion = spec.motion ?? 'still';
  return (
    <div className="gesture-visual">
      <div className="gesture-visual__hands" title={SHAPE_SHORT[spec.shape][lang]}>
        <HandIcon shape={spec.shape} dir={spec.dir} />
        {spec.second && <HandIcon shape={spec.second.shape} second />}
      </div>
      <div className="gesture-visual__zone" title={spec.location ? LOCATION_SHORT[spec.location][lang] : undefined}>
        <BodyZone zone={spec.location} size={34} />
      </div>
      <div className="gesture-visual__motion">
        <MotionIcon motion={motion} />
        <span>{MOTION_SHORT[motion][lang]}</span>
      </div>
    </div>
  );
}
