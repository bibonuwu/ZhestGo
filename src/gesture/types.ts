/** Hand shapes the rule-based classifier can tell apart reliably. */
export const HAND_SHAPES = [
  'fist', // ✊ all fingers curled
  'open', // 🖐 all five fingers spread
  'four', // flat hand, thumb tucked
  'point', // ☝ index only
  'v', // ✌ index + middle
  'three', // index + middle + ring
  'k', // thumb + index + middle
  'thumb', // 👍 thumb only
  'ok', // 👌 thumb touches index, other three extended
  'pinky', // little finger only
  'call', // 🤙 thumb + pinky
  'l', // thumb + index
  'ily', // 🤟 thumb + index + pinky
  'horns', // 🤘 index + pinky
  'pinch', // 🤌 fingertips gathered together
] as const;
export type HandShape = (typeof HAND_SHAPES)[number];

/** Where the main finger (or the hand axis) points, in the camera image. */
export type Direction = 'up' | 'down' | 'side' | 'forward';

/** Hand position relative to the signer's face. */
export type Location = 'head' | 'face' | 'chest' | 'low';
export type SpecLocation = Exclude<Location, 'low'>;

/** Movement patterns. `moving` means "moving, but not a recognised pattern". */
export type Motion = 'still' | 'wave' | 'nod' | 'circle';
export type MotionState = Motion | 'moving';

export type Relation = 'together' | 'apart';
export type HandSide = 'left' | 'right';

/** Declarative description of a gesture. Omitted fields match anything. */
export interface GestureSpec {
  shape: HandShape;
  dir?: Direction;
  location?: SpecLocation;
  /** Defaults to `still`. */
  motion?: Motion;
  /** Present for two-handed gestures. */
  second?: { shape: HandShape; relation?: Relation };
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2 {
  x: number;
  y: number;
}

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

/** One detected hand as delivered by the vision layer. */
export interface RawHand {
  /** Image landmarks, normalised to [0, 1]. */
  landmarks: Point3[];
  /** Metric 3D landmarks (metres), origin at the hand centre. */
  world: Point3[];
  /** MediaPipe handedness label for an un-mirrored frame. */
  label: 'Left' | 'Right';
  score: number;
}

export interface FaceBox {
  /** Centre and size in video pixels. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** A hand after feature extraction. All positions in video pixels. */
export interface HandFeatures {
  side: HandSide;
  shape: HandShape | null;
  fingers: FingerStates;
  dir: Direction;
  location: Location;
  /** Point used for location (fingertip for pointing shapes, palm otherwise). */
  anchor: Point2;
  /** Index fingertip — used for motion tracking. */
  tip: Point2;
  palmCenter: Point2;
  /** Hand size in pixels (≈ wrist → middle knuckle). */
  scale: number;
  /** Pixel landmarks, used for drawing and two-hand contact tests. */
  px: Point3[];
  world: Point3[];
}

/** Aggregated per-hand state that the matcher consumes. */
export interface ObservedHand {
  shape: HandShape | null;
  dir: Direction;
  location: Location;
}

export interface Observation {
  hands: number;
  dom: ObservedHand | null;
  nonDom: ObservedHand | null;
  relation: Relation | null;
  motion: MotionState;
}
