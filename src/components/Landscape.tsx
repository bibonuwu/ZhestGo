import { memo } from 'react';

/**
 * The home page backdrop: the steppe at the foot of the Alatau — snowy peaks,
 * yurts, tulips, drifting clouds and birds. Pure SVG (a few KB), coloured by
 * CSS variables so it turns into a starry night in the dark theme.
 */

/** Deterministic pseudo-random numbers, so the scene is the same on every visit. */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TULIP_COLORS = ['#e63946', '#e63946', '#ef476f', '#f6c945', '#f6c945', '#ffffff', '#a77bdc', '#ff8a3d'];

const FLOWERS = (() => {
  const r = random(7);
  return Array.from({ length: 86 }, () => {
    const x = r() * 1640 - 20;
    const y = 772 + r() * 140;
    const depth = (y - 772) / 140;
    return { x, y, s: 0.55 + depth * 0.75, c: TULIP_COLORS[Math.floor(r() * TULIP_COLORS.length)], tilt: (r() - 0.5) * 16 };
  }).sort((a, b) => a.y - b.y);
})();

const STARS = (() => {
  const r = random(42);
  return Array.from({ length: 70 }, () => ({ x: r() * 1600, y: r() * 380, r: 0.6 + r() * 1.5, d: (r() * 4).toFixed(1) }));
})();

type Point = readonly [number, number];

const FAR: Point[] = [
  [-20, 520], [70, 470], [130, 488], [210, 410], [270, 446], [340, 372], [420, 430], [470, 404], [540, 452], [610, 380],
  [690, 330], [760, 396], [830, 360], [900, 420], [980, 350], [1050, 300], [1130, 372], [1190, 346], [1260, 404],
  [1340, 338], [1420, 392], [1500, 352], [1620, 420],
];

const NEAR: Point[] = [
  [-20, 600], [60, 540], [140, 566], [240, 470], [320, 520], [380, 498], [470, 560], [560, 500], [640, 540], [720, 470],
  [800, 520], [880, 452], [960, 512], [1060, 446], [1150, 520], [1240, 480], [1320, 540], [1400, 476], [1480, 520],
  [1620, 470],
];

const pt = ([x, y]: Point) => `${x.toFixed(0)} ${y.toFixed(0)}`;
const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** A mountain range: silhouette, shaded right-hand slopes and snow on the high peaks. */
function Range({ points, base, snowAbove, className }: { points: Point[]; base: number; snowAbove: number; className: string }) {
  const outline = `M${points.map(pt).join(' ')}V${base}H${points[0][0]}z`;
  const shades: string[] = [];
  const caps: string[] = [];
  points.forEach((p, i) => {
    const left = points[i - 1];
    const right = points[i + 1];
    if (!left || !right || p[1] > left[1] || p[1] > right[1]) return;
    shades.push(`M${pt(p)} ${pt(right)} ${right[0]} ${base} ${pt([p[0] + (right[0] - p[0]) * 0.25, base])}z`);
    if (p[1] > snowAbove) return;
    // The cap reaches further down on taller peaks; its lower edge is ragged.
    const depth = Math.min(0.45, 0.22 + (snowAbove - p[1]) / 400);
    const l = lerp(p, left, depth);
    const r = lerp(p, right, depth);
    const edge = [0.2, 0.4, 0.6, 0.8].map((t, k) => {
      const [x, y] = lerp(r, l, t);
      return [x, y + (k % 2 ? -7 : 9)] as Point;
    });
    caps.push(`M${pt(p)} ${pt(r)} ${edge.map(pt).join(' ')} ${pt(l)}z`);
  });
  return (
    <g>
      <path className={className} d={outline} />
      <path className="ls-ridge" d={shades.join('')} />
      <path className="ls-snow" d={caps.join('')} />
    </g>
  );
}

function Tulip({ x, y, s, c, tilt }: { x: number; y: number; s: number; c: string; tilt: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${s.toFixed(2)})`}>
      <path className="ls-stem" d="M0 0C-1-9 1-19 0-27" />
      <path className="ls-leaf" d="M0-6C-7-10-10-17-9-22-4-18-1-12 0-6z" />
      <path d="M-6-28c-1-8 1-14 3-17l3 6 3-6c2 3 4 9 3 17-2 5-10 5-12 0z" fill={c} />
    </g>
  );
}

function Yurt({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="ls-yurt" transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="46" ry="6" className="ls-shadow" />
      <path className="ls-yurt__wall" d="M-40 0V-22h80V0z" />
      <path className="ls-yurt__roof" d="M-44-21C-34-44-14-52 0-52s34 8 44 31z" />
      <path className="ls-yurt__band" d="M-40-15h80" />
      <path className="ls-yurt__ornament" d="M-36-15l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" />
      <path className="ls-yurt__door" d="M-8 0v-17h16V0z" />
      <path className="ls-yurt__ring" d="M-7-51h14" />
    </g>
  );
}

function Cloud({ className, x, y, s }: { className: string; x: number; y: number; s: number }) {
  return (
    <g className={`ls-cloud ${className}`}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx="0" cy="0" rx="70" ry="26" />
        <ellipse cx="-38" cy="-8" rx="38" ry="24" />
        <ellipse cx="22" cy="-22" rx="44" ry="34" />
        <ellipse cx="62" cy="-4" rx="34" ry="22" />
      </g>
    </g>
  );
}

export const Landscape = memo(function Landscape() {
  return (
    <svg className="landscape" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ls-sky-1" />
          <stop offset="0.55" className="ls-sky-2" />
          <stop offset="1" className="ls-sky-3" />
        </linearGradient>
        <radialGradient id="ls-glow">
          <stop offset="0" className="ls-glow-1" />
          <stop offset="1" className="ls-glow-2" />
        </radialGradient>
        <linearGradient id="ls-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="ls-haze-1" />
          <stop offset="1" className="ls-haze-2" />
        </linearGradient>
        <linearGradient id="ls-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe9f7" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#ls-sky)" />

      <g className="ls-stars">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x.toFixed(0)} cy={s.y.toFixed(0)} r={s.r.toFixed(1)} style={{ animationDelay: `${s.d}s` }} />
        ))}
      </g>

      <circle cx="1250" cy="200" r="230" fill="url(#ls-glow)" />
      <circle className="ls-sun" cx="1250" cy="200" r="64" />

      <Cloud className="ls-cloud--a" x={220} y={170} s={1.1} />
      <Cloud className="ls-cloud--b" x={900} y={110} s={0.8} />
      <Cloud className="ls-cloud--c" x={1420} y={300} s={0.65} />

      <g className="ls-birds">
        <path d="M0 0q8-7 15 0q7-7 15 0" />
        <path d="M34 14q6-5 11 0q5-5 11 0" />
        <path d="M-22 22q5-4 9 0q4-4 9 0" />
      </g>

      <Range points={FAR} base={640} snowAbove={412} className="ls-far" />
      <Range points={NEAR} base={700} snowAbove={482} className="ls-near" />
      <rect y="440" width="1600" height="260" fill="url(#ls-haze)" />

      {/* Steppe */}
      <path className="ls-hill-1" d="M-20 668C180 610 360 640 560 622 780 600 980 642 1180 612 1360 588 1500 610 1620 600V900H-20z" />
      <Yurt x={1110} y={652} s={0.9} />
      <Yurt x={1205} y={646} s={0.62} />
      <path className="ls-hill-2" d="M-20 742C200 690 420 716 640 704 860 692 1040 734 1260 712 1420 698 1520 704 1620 694V900H-20z" />
      <Yurt x={300} y={712} s={0.7} />
      <path className="ls-hill-3" d="M-20 812C220 770 480 786 760 780 1040 774 1300 800 1620 770V900H-20z" />

      <g className="ls-flowers">
        {FLOWERS.map((f, i) => (
          <Tulip key={i} {...f} />
        ))}
      </g>
    </svg>
  );
});
