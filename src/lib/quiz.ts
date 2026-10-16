import { SIGNS, type Sign } from '../data/signs';

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The answer and `count - 1` other signs, shuffled. Signs of the same topic
 * come first (colours among colours), so the meaning alone does not give the
 * answer away.
 */
export function quizOptions(answer: Sign, count = 4): Sign[] {
  const others = SIGNS.filter((s) => s.id !== answer.id);
  const near = shuffle(others.filter((s) => s.topic === answer.topic));
  const far = shuffle(others.filter((s) => s.topic !== answer.topic));
  return shuffle([answer, ...[...near, ...far].slice(0, count - 1)]);
}

/** Share of “Check yourself” questions that repeat an already learned sign. */
const REVIEW_SHARE = 0.4;

export interface QuizRound {
  answer: Sign;
  options: Sign[];
  /** The sign was already learned: a wrong answer sends it back to the lessons. */
  review: boolean;
}

/** New signs mostly, with learned ones mixed in to check they are not forgotten. */
export function makeRound(learned: readonly string[], previous?: string, random = Math.random): QuizRound {
  const done = new Set(learned);
  const pick = (pool: readonly Sign[]) => {
    const fresh = pool.length > 1 ? pool.filter((s) => s.id !== previous) : pool;
    return fresh[Math.floor(random() * fresh.length)];
  };
  const todo = SIGNS.filter((s) => !done.has(s.id));
  const known = SIGNS.filter((s) => done.has(s.id));
  const review = known.length > 0 && (todo.length === 0 || random() < REVIEW_SHARE);
  const answer = pick(review ? known : todo);
  return { answer, options: quizOptions(answer), review };
}
