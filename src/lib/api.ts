export interface ServerStatus {
  ok: boolean;
  compose: boolean;
  model: string | null;
  tts: boolean;
  ttsVoice: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`${code} (HTTP ${status})`);
  }
}

async function post(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? 'request_failed', res.status);
  }
  return res;
}

/** Returns null when the API server is not running (e.g. static hosting). */
export async function fetchServerStatus(): Promise<ServerStatus | null> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    return (await res.json()) as ServerStatus;
  } catch {
    return null;
  }
}

export async function composeWithAI(words: readonly string[]): Promise<string> {
  const res = await post('/api/compose', { words }, 25_000);
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new ApiError('empty_response', 200);
  return data.text;
}

export async function fetchSpeech(text: string, rate: number): Promise<Blob> {
  const res = await post('/api/tts', { text, rate }, 20_000);
  return res.blob();
}
