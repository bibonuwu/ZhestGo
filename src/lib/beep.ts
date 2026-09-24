export type Cue = 'tick' | 'start' | 'done' | 'fail' | 'match';

/** [frequency Hz, start offset s, duration s] */
const CUES: Record<Cue, [number, number, number][]> = {
  tick: [[660, 0, 0.07]],
  start: [[988, 0, 0.14]],
  done: [
    [784, 0, 0.08],
    [1175, 0.09, 0.12],
  ],
  fail: [
    [392, 0, 0.12],
    [294, 0.13, 0.18],
  ],
  match: [
    [880, 0, 0.07],
    [1109, 0.07, 0.07],
    [1319, 0.14, 0.12],
  ],
};

let audio: AudioContext | null = null;

/** Short, quiet tone cues for the recording flow, so the user can watch their hands instead of the screen. */
export function beep(cue: Cue): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    for (const [freq, offset, length] of CUES[cue]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
    }
  } catch {
    // No audio output — the cues are only a convenience.
  }
}
