import Anthropic from '@anthropic-ai/sdk';

export const composeModel = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

export const composeEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export class ComposeRefusedError extends Error {}

const SYSTEM_PROMPT = `You turn the output of a sign-language recognizer into speech for a person who cannot speak. The input is a sequence of Kazakh words in dictionary form (glosses), separated by " | ", in the order the person signed them. Write the single Kazakh sentence they most likely meant, the way they would say it themselves. The sentence is read aloud to the people they are talking to.

- Write in Kazakh Cyrillic. Use the first person when the signer talks about themselves.
- Add the case endings, possessive and personal endings, verb conjugation, postpositions and word order that Kazakh grammar needs. Do not add information that is not in the glosses.
- A gloss may be a recognition error or an accidental repeat; drop a word only when it clearly does not fit.
- End with "?" for questions, "!" for greetings and exclamations, otherwise ".".
- Latency-sensitive; begin your visible answer immediately. Reply with the sentence only — no quotes, translation or commentary.

Examples:
мен | су | ішу | керек → Маған су ішу керек.
сіз | қайда | бару → Сіз қайда барасыз?
мен | ашықтым | тамақ | керек → Мен ашықтым, маған тамақ керек.
ертең | мектеп | бару → Ертең мектепке барамын.
ана | қайда → Анам қайда?
рақмет | дос → Рақмет, досым!`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 1, timeout: 20_000 });
  return client;
}

function cleanup(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim()) ?? '';
  return firstLine
    .replace(/^["«“'`]+|["»”'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/** Turns recognised glosses into one grammatical Kazakh sentence. */
export async function composeSentence(words: readonly string[]): Promise<string> {
  const response = await getClient().beta.messages.create({
    model: composeModel,
    max_tokens: 2048,
    // On a policy decline the API re-runs the request on Anthropic's
    // recommended fallback model instead of returning a refusal.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: words.join(' | ') }],
  });

  if (response.stop_reason === 'refusal') {
    throw new ComposeRefusedError('The model declined to compose this sentence');
  }
  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');
  const sentence = cleanup(text);
  if (!sentence) throw new Error('Empty response from the model');
  return sentence;
}
