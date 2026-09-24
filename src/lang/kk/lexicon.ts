import type { Person, VerbForms } from './morphology';

/** Grammatical description of a vocabulary word, used to build sentences. */
export type Gram =
  | { pos: 'pron'; person: Person }
  | {
      pos: 'noun';
      kind?: NounKind;
      /** Form used as a time adverb next to a verb: түн → түнде. */
      adverb?: string;
    }
  | ({
      pos: 'verb';
      /** Dictionary form when it differs from the displayed word. */
      infinitive?: string;
      /** bar-/kel-: destination in the dative. */
      motion?: 'to' | 'come';
      /** Case of a pronoun or person object. Omitted = intransitive. */
      object?: 'acc' | 'dat' | 'ins';
      /** Tense the word implies on its own (шаршадым → past). */
      tense?: 'past';
      /** Present tense is a state: ауырып тұрмын. */
      progressive?: boolean;
    } & VerbForms)
  | { pos: 'adj'; lemma?: string; experiencer?: boolean }
  | { pos: 'time'; tense: 'past' | 'present' | 'future' }
  | { pos: 'q'; role: QuestionRole }
  | { pos: 'num' }
  | { pos: 'quant' }
  | { pos: 'here' }
  | { pos: 'modal' }
  | { pos: 'neg' }
  | {
      pos: 'phrase';
      kind: 'greeting' | 'thanks' | 'prefix' | 'answer' | 'command';
      /** "Өтінемін, …": turn the following verb into a polite request. */
      polite?: boolean;
    };

export type NounKind = 'place' | 'person' | 'kin' | 'need' | 'vehicle' | 'time';
export type QuestionRole = 'who' | 'what' | 'where' | 'when' | 'how' | 'howMany' | 'why' | 'which';

/** A word as the sentence builder sees it. */
export interface LexItem {
  id: string;
  kk: string;
  gram?: Gram;
  /** What to say when this word is the whole sentence. */
  alone?: string;
}
