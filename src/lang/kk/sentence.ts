/**
 * Offline Kazakh sentence builder. Turns a sequence of signed words (in
 * dictionary form, in signing order) into a grammatical sentence:
 *
 *   мен су ішу керек        → Маған су ішу керек.
 *   ертең мектеп бару       → Ертең мектепке барамын.
 *   мен сіз жақсы көремін    → Мен сізді жақсы көремін.
 *   кешіріңіз дәретхана қайда → Кешіріңіз, дәретхана қайда?
 */
import type { Gram, LexItem, NounKind, QuestionRole } from './lexicon';
import {
  type Case,
  type Person,
  continuousTense,
  negatedPredicate,
  nounCase,
  pastTense,
  politeImperative,
  possessedCase,
  possessive,
  predicate,
  presentTense,
  pronoun,
} from './morphology';

type VerbGram = Extract<Gram, { pos: 'verb' }>;
type AdjGram = Extract<Gram, { pos: 'adj' }>;
type Mark = '.' | '?' | '!';

interface NP {
  t: 'np';
  head: LexItem;
  kind?: NounKind;
  /** Time-adverb form used next to a verb (түнде). */
  adverb?: string;
  /** Numbers, quantifiers and adjectives in front of the noun. */
  mods: string[];
  possessor?: Person;
  /** The possessor pronoun was signed (менің анам), not implied (анам). */
  explicit: boolean;
}

type Unit =
  | { t: 'pron'; person: Person }
  | NP
  | { t: 'verb'; g: VerbGram; text: string }
  | { t: 'adj'; g: AdjGram; text: string }
  | { t: 'time'; text: string; tense: 'past' | 'present' | 'future' }
  | { t: 'q'; text: string; role: QuestionRole }
  | { t: 'here'; text: string }
  | { t: 'word'; text: string }
  | { t: 'modal' }
  | { t: 'neg' };

interface Clause {
  text: string;
  mark: Mark;
  /** Person of the clause subject, carried over to a following clause. */
  person?: Person;
}

const gramOf = (item: LexItem): Gram => item.gram ?? { pos: 'noun' };
const isAnimate = (kind?: NounKind) => kind === 'kin' || kind === 'person';
const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase('kk') + s.slice(1) : s);
const ownerOf = (p: Person): Person => (p === '3pl' ? '3' : p);

// ── Grouping ─────────────────────────────────────────────────────────────

function group(items: readonly LexItem[], possessivePronouns: boolean): Unit[] {
  const units: Unit[] = [];
  let mods: string[] = [];
  const flushMods = () => {
    for (const text of mods) units.push({ t: 'word', text });
    mods = [];
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const g = gramOf(item);
    const next = items[i + 1] ? gramOf(items[i + 1]) : undefined;
    switch (g.pos) {
      case 'pron':
        flushMods();
        if (possessivePronouns && next?.pos === 'noun' && next.kind === 'kin') {
          units.push({ t: 'np', head: items[i + 1], kind: 'kin', mods: [], possessor: g.person, explicit: true });
          i++;
        } else {
          units.push({ t: 'pron', person: g.person });
        }
        break;
      case 'num':
      case 'quant':
        mods.push(item.kk);
        break;
      case 'adj':
        if (next && ['noun', 'num', 'quant', 'adj'].includes(next.pos)) {
          mods.push(g.lemma ?? item.kk);
        } else {
          flushMods();
          units.push({ t: 'adj', g, text: g.lemma ?? item.kk });
        }
        break;
      case 'noun':
        units.push({ t: 'np', head: item, kind: g.kind, adverb: g.adverb, mods, explicit: false });
        mods = [];
        break;
      case 'verb':
        flushMods();
        units.push({ t: 'verb', g, text: item.kk });
        break;
      case 'time':
        flushMods();
        units.push({ t: 'time', text: item.kk, tense: g.tense });
        break;
      case 'q':
        flushMods();
        units.push({ t: 'q', text: item.kk, role: g.role });
        break;
      case 'here':
        flushMods();
        units.push({ t: 'here', text: item.kk });
        break;
      case 'modal':
        flushMods();
        units.push({ t: 'modal' });
        break;
      case 'neg':
        flushMods();
        units.push({ t: 'neg' });
        break;
      case 'phrase':
        flushMods();
        units.push({ t: 'word', text: item.kk });
        break;
    }
  }
  flushMods();
  return units;
}

function renderNP(np: NP, kase: Case, defaultOwner: Person): string {
  const owner = np.possessor ?? (np.kind === 'kin' ? defaultOwner : undefined);
  const word = owner ? possessedCase(possessive(np.head.kk, owner), owner, kase) : nounCase(np.head.kk, kase);
  const parts = [...np.mods, word];
  if (np.explicit && owner) parts.unshift(pronoun(owner, 'gen'));
  return parts.join(' ');
}

/** "су мен нан", "су, нан және шай". */
function coordinate(parts: string[]): string {
  if (parts.length < 2) return parts[0] ?? '';
  if (parts.length === 2) {
    const conj = nounCase(parts[0], 'ins').slice(parts[0].length);
    return `${parts[0]} ${conj} ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(', ')} және ${parts[parts.length - 1]}`;
}

// ── Clause types ─────────────────────────────────────────────────────────

interface Parts {
  units: Unit[];
  subject?: { t: 'pron'; person: Person };
  times: string[];
  q?: Extract<Unit, { t: 'q' }>;
  negative: boolean;
}

function analyse(items: readonly LexItem[]): Parts {
  const grams = items.map(gramOf);
  const hasPredicate = grams.some((g) => g.pos === 'verb' || g.pos === 'modal');
  const units = group(items, !hasPredicate);
  return {
    units,
    subject: units.find((u): u is { t: 'pron'; person: Person } => u.t === 'pron'),
    times: units.flatMap((u) => (u.t === 'time' ? [u.text] : [])),
    q: units.find((u): u is Extract<Unit, { t: 'q' }> => u.t === 'q'),
    negative: units.some((u) => u.t === 'neg'),
  };
}

/** "(Маған) … керек": needs, with or without a verb. */
function modalClause(p: Parts, inherited?: Person): Clause {
  const verb = [...p.units].reverse().find((u): u is Extract<Unit, { t: 'verb' }> => u.t === 'verb');
  const firstNP = p.units.find((u): u is NP => u.t === 'np');
  const animateExperiencer = !p.subject && firstNP && isAnimate(firstNP.kind) && p.units[0] === firstNP ? firstNP : undefined;
  const person = p.subject?.person ?? inherited;
  const owner = ownerOf(person ?? '1sg');

  const experiencer = person
    ? pronoun(person, 'dat')
    : animateExperiencer
      ? renderNP(animateExperiencer, 'dat', owner)
      : p.q
        ? 'сізге'
        : 'маған';

  const body: string[] = [];
  let bareNouns: string[] = [];
  const flushBare = () => {
    if (bareNouns.length) body.push(coordinate(bareNouns));
    bareNouns = [];
  };
  for (const u of p.units) {
    if (u === p.subject || u === animateExperiencer) continue;
    if (u.t === 'np') {
      if (verb) body.push(u.adverb ?? renderNP(u, complementCase(u, verb.g), owner));
      else bareNouns.push(renderNP(u, 'nom', owner));
      continue;
    }
    flushBare();
    if (u.t === 'pron') body.push(pronoun(u.person, verb?.g.motion ? 'dat' : (verb?.g.object ?? 'dat')));
    else if (u.t === 'word' || u.t === 'here' || u.t === 'adj') body.push(u.text);
  }
  flushBare();

  const words = [
    experiencer,
    ...p.times,
    ...body,
    p.q?.text,
    verb ? (verb.g.infinitive ?? verb.text) : undefined,
    'керек',
    p.negative ? 'емес' : undefined,
  ];
  return { text: words.filter(Boolean).join(' '), mark: p.q ? '?' : '.', person };
}

function complementCase(np: NP, g: VerbGram): Case {
  switch (np.kind) {
    case 'place':
      return g.motion ? 'dat' : 'loc';
    case 'vehicle':
      return g.motion ? 'ins' : 'loc';
    case 'kin':
    case 'person':
      return g.motion ? 'dat' : (g.object ?? 'dat');
    default:
      // A possessed thing that is the object of a transitive verb is definite.
      return np.explicit && g.object === 'acc' ? 'acc' : 'nom';
  }
}

function verbClause(p: Parts, verb: VerbGram, polite: boolean, inherited?: Person): Clause {
  const nps = p.units.filter((u): u is NP => u.t === 'np');
  const who = p.q?.role === 'who';

  let person: Person;
  let subjectText: string | undefined;
  /** Noun subjects: "Анам мен әкем келеді". */
  const subjectNPs: NP[] = [];
  if (p.subject) {
    person = p.subject.person;
    subjectText = pronoun(person);
  } else {
    const animate = nps.find((np) => isAnimate(np.kind));
    if (animate && !verb.object && verb.motion !== 'to' && !who) {
      for (let i = p.units.indexOf(animate); i < p.units.length; i++) {
        const u = p.units[i];
        if (u.t !== 'np' || !isAnimate(u.kind)) break;
        subjectNPs.push(u);
      }
      person = '3';
    } else if (who) {
      person = '3';
    } else {
      person = p.q || polite ? '2sgF' : (inherited ?? '1sg');
    }
  }
  const owner = ownerOf(p.subject?.person ?? '1sg');
  if (subjectNPs.length) subjectText = coordinate(subjectNPs.map((np) => renderNP(np, 'nom', owner)));

  const past = p.units.some((u) => u.t === 'time' && u.tense === 'past') ||
    (verb.tense === 'past' && !p.units.some((u) => u.t === 'time' && u.tense !== 'past'));
  const imperative = polite && !p.subject && !subjectNPs.length && !p.q;

  let verbText: string;
  if (imperative) verbText = politeImperative(verb, p.negative);
  else if (verb.progressive && !past && !p.negative) verbText = continuousTense(verb, person);
  else verbText = past ? pastTense(verb, person, p.negative) : presentTense(verb, person, p.negative);

  const body: string[] = [];
  for (const u of p.units) {
    if (u === p.subject || (u.t === 'np' && subjectNPs.includes(u))) continue;
    if (u.t === 'np') body.push(u.adverb ?? renderNP(u, complementCase(u, verb), owner));
    else if (u.t === 'pron') body.push(pronoun(u.person, verb.motion ? 'dat' : (verb.object ?? 'dat')));
    else if (u.t === 'word' || u.t === 'here' || u.t === 'adj') body.push(u.text);
  }

  let qText = p.q?.text;
  if (who && (p.subject || subjectNPs.length)) {
    const kase: Case = verb.motion ? 'dat' : (verb.object ?? 'dat');
    qText = nounCase('кім', kase);
  }

  const words = [subjectText, ...p.times, ...body, qText, verbText];
  return { text: words.filter(Boolean).join(' '), mark: imperative ? '!' : p.q ? '?' : '.', person };
}

/** Clauses without a verb: "Мен жақсымын", "Анам қайда?", "Менде ақша жоқ", "Маған су керек". */
function nominalClause(p: Parts, inherited?: Person): Clause {
  const nps = p.units.filter((u): u is NP => u.t === 'np');
  const adj = p.units.find((u): u is Extract<Unit, { t: 'adj' }> => u.t === 'adj');
  const here = p.units.find((u): u is Extract<Unit, { t: 'here' }> => u.t === 'here');
  const person = p.subject?.person;
  const owner = ownerOf(person ?? '1sg');
  const done = (words: Array<string | undefined>, mark: Mark = p.q ? '?' : '.'): Clause => ({
    text: words.filter(Boolean).join(' '),
    mark,
    person,
  });

  // "Су жоқ.", "Менде ақша жоқ." — something is missing.
  if (p.negative && nps.length && !adj && !p.q) {
    return done([person ? pronoun(person, 'loc') : undefined, ...p.times, ...nps.map((np) => renderNP(np, 'nom', owner)), 'жоқ']);
  }

  if (p.q) {
    if (p.q.role === 'who' || p.q.role === 'where' || p.q.role === 'how') {
      if (person) return done([pronoun(person), predicate(p.q.text, person)]);
      if (nps[0]) return done([renderNP(nps[0], 'nom', owner), p.q.text]);
    }
    return done(p.units.map((u) => unitText(u, owner)));
  }

  // Only things someone needs: "Маған су керек."
  if (nps.length && nps.every((np) => np.kind === 'need') && !adj && !here) {
    return modalClause({ ...p, units: [...p.units, { t: 'modal' }] }, inherited);
  }

  // Where someone is: "Мен үйдемін.", "Анам үйде."
  const place = nps.find((np) => np.kind === 'place');
  const animate = nps.find((np) => isAnimate(np.kind));
  if ((place || here) && (person || animate)) {
    const where = place ? renderNP(place, 'loc', owner) : here!.text;
    if (person) return done([pronoun(person), p.negative ? negatedPredicate(where, person) : predicate(where, person)]);
    return done([renderNP(animate!, 'nom', owner), where, p.negative ? 'емес' : undefined]);
  }

  if (adj) {
    if (adj.g.experiencer) {
      return done([person ? pronoun(person, 'dat') : undefined, ...p.times, adj.text, p.negative ? 'емес' : undefined]);
    }
    if (person) return done([pronoun(person), ...p.times, p.negative ? negatedPredicate(adj.text, person) : predicate(adj.text, person)]);
    return done([...nps.map((np) => renderNP(np, 'nom', owner)), ...p.times, adj.text, p.negative ? 'емес' : undefined]);
  }

  // "Мен дәрігермін.", "Ол дәрігер."
  if (person && nps.length === 1 && !here) {
    const noun = renderNP(nps[0], 'nom', owner);
    return done([pronoun(person), ...p.times, p.negative ? negatedPredicate(noun, person) : predicate(noun, person)]);
  }

  return done([...p.units.map((u) => unitText(u, owner)), p.negative ? 'жоқ' : undefined]);
}

function unitText(u: Unit, owner: Person): string | undefined {
  switch (u.t) {
    case 'np':
      return renderNP(u, 'nom', owner);
    case 'pron':
      return pronoun(u.person);
    case 'verb':
    case 'modal':
    case 'neg':
      return undefined;
    default:
      return u.text;
  }
}

function composeClause(items: readonly LexItem[], polite: boolean, inherited?: Person): Clause {
  const p = analyse(items);
  if (p.units.some((u) => u.t === 'modal')) return modalClause(p, inherited);
  const verb = [...p.units].reverse().find((u): u is Extract<Unit, { t: 'verb' }> => u.t === 'verb');
  if (verb) return verbClause(p, verb.g, polite, inherited);
  return nominalClause(p, inherited);
}

/** Splits "мен ашықтым тамақ керек" after the first finished predicate. */
function splitClauses(items: readonly LexItem[]): LexItem[][] {
  const clauses: LexItem[][] = [];
  let current: LexItem[] = [];
  items.forEach((item, i) => {
    current.push(item);
    const g = gramOf(item);
    const next = items[i + 1];
    // "ішу керек" is one predicate; "ашықтым … керек" is two.
    if (g.pos === 'verb' && next && gramOf(next).pos !== 'neg' && gramOf(next).pos !== 'modal') {
      const rest = items.slice(i + 1).map(gramOf);
      if (rest.some((r) => r.pos === 'verb' || r.pos === 'modal')) {
        clauses.push(current);
        current = [];
      }
    } else if (g.pos === 'neg' && i > 0 && gramOf(items[i - 1]).pos === 'verb') {
      const rest = items.slice(i + 1).map(gramOf);
      if (rest.some((r) => r.pos === 'verb' || r.pos === 'modal')) {
        clauses.push(current);
        current = [];
      }
    }
  });
  if (current.length) clauses.push(current);
  return clauses;
}

function sentence(items: readonly LexItem[], prefix: string | null, polite: boolean): string {
  const clauses: Clause[] = [];
  let person: Person | undefined;
  for (const part of splitClauses(items)) {
    const clause = composeClause(part, polite, person);
    person = clause.person ?? person;
    clauses.push(clause);
  }
  const mark: Mark = clauses.some((c) => c.mark === '?') ? '?' : clauses[clauses.length - 1].mark;
  const body = clauses.map((c) => c.text).join(', ');
  return prefix ? `${prefix}, ${body}${mark}` : `${capitalize(body)}${mark}`;
}

function phraseSentence(item: LexItem): string {
  if (item.alone) return item.alone;
  const g = gramOf(item);
  const mark = g.pos === 'phrase' && g.kind === 'answer' ? '.' : '!';
  return capitalize(item.kk) + mark;
}

/** Builds one or more Kazakh sentences from signed words. */
export function composeKazakh(words: readonly LexItem[]): string {
  const items = words.filter((w) => w.kk.trim());
  if (items.length === 0) return '';
  if (items.length === 1 && items[0].alone) return items[0].alone;

  const out: string[] = [];
  let pending: LexItem[] = [];
  let prefix: string | null = null;
  let polite = false;
  const flush = () => {
    if (pending.length) out.push(sentence(pending, prefix, polite));
    else if (prefix) out.push(`${prefix}.`);
    pending = [];
    prefix = null;
    polite = false;
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const g = gramOf(item);
    const next = items[i + 1];
    const nextIsPhrase = !next || gramOf(next).pos === 'phrase';

    if (g.pos === 'phrase') {
      flush();
      // "Рақмет, досым!" — a greeting or thanks addressed to someone.
      if (g.kind === 'greeting' || g.kind === 'thanks') {
        const addressees: string[] = [];
        let j = i + 1;
        for (; j < items.length; j++) {
          const ng = gramOf(items[j]);
          if (ng.pos !== 'noun' || !isAnimate(ng.kind)) break;
          addressees.push(ng.kind === 'kin' ? possessive(items[j].kk, '1sg') : items[j].kk);
        }
        if (addressees.length && (j === items.length || gramOf(items[j]).pos === 'phrase')) {
          out.push(`${capitalize(item.kk)}, ${addressees.join(', ')}!`);
          i = j - 1;
          continue;
        }
      }
      // "Кешіріңіз, …", "Иә, …" — introduces the following clause.
      if ((g.kind === 'prefix' || g.kind === 'answer') && !nextIsPhrase) {
        prefix = capitalize(item.kk);
        polite = Boolean(g.polite);
        continue;
      }
      out.push(phraseSentence(item));
      continue;
    }

    // "Жоқ, …" as an answer at the very start.
    if (g.pos === 'neg' && i === 0 && !nextIsPhrase) {
      prefix = 'Жоқ';
      continue;
    }
    pending.push(item);
  }
  flush();
  return out.join(' ');
}
