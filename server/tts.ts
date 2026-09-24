/** Kazakh speech synthesis through Azure AI Speech (neural kk-KZ voices). */

const VOICE_PATTERN = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+$/;
const CACHE_LIMIT = 200;
const cache = new Map<string, Buffer>();

export class TtsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export const ttsEnabled = (): boolean => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

export function ttsVoice(): string {
  const voice = process.env.AZURE_SPEECH_VOICE || 'kk-KZ-AigulNeural';
  return VOICE_PATTERN.test(voice) ? voice : 'kk-KZ-AigulNeural';
}

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** rate 1 → "+0%", 1.25 → "+25%", 0.8 → "-20%". */
const prosodyRate = (rate: number): string => {
  const pct = Math.round((rate - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
};

export async function synthesizeSpeech(text: string, rate: number): Promise<Buffer> {
  const voice = ttsVoice();
  const key = `${voice}|${rate}|${text}`;
  const cached = cache.get(key);
  if (cached) {
    // Refresh recency.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="kk-KZ">` +
    `<voice name="${voice}"><prosody rate="${prosodyRate(rate)}">${escapeXml(text)}</prosody></voice></speak>`;

  const region = encodeURIComponent(process.env.AZURE_SPEECH_REGION ?? '');
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY ?? '',
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'qoldau',
    },
    body: ssml,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new TtsError(`Azure TTS responded with HTTP ${res.status}`, res.status);

  const audio = Buffer.from(await res.arrayBuffer());
  cache.set(key, audio);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return audio;
}
