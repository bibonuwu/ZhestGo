import './env';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import express, { type ErrorRequestHandler } from 'express';
import { ComposeRefusedError, composeEnabled, composeModel, composeSentence } from './compose';
import { rateLimit } from './rateLimit';
import { TtsError, synthesizeSpeech, ttsEnabled, ttsVoice } from './tts';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_WORDS = 40;
const MAX_WORD_LENGTH = 60;
const MAX_TTS_LENGTH = 500;

const app = express();
app.disable('x-powered-by');
// Behind a hosting proxy (Render, Railway, nginx…) set TRUST_PROXY=1 so that
// the rate limits apply to each visitor's own IP, not the proxy's.
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : 'loopback');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    compose: composeEnabled(),
    model: composeEnabled() ? composeModel : null,
    tts: ttsEnabled(),
    ttsVoice: ttsEnabled() ? ttsVoice() : null,
  });
});

function parseWords(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_WORDS) return null;
  const words = value.map((w) => (typeof w === 'string' ? w.trim() : ''));
  return words.every((w) => w.length > 0 && w.length <= MAX_WORD_LENGTH) ? words : null;
}

app.post('/api/compose', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  const words = parseWords(req.body?.words);
  if (!words) {
    res.status(400).json({ error: 'invalid_words' });
    return;
  }
  if (!composeEnabled()) {
    res.status(503).json({ error: 'compose_disabled' });
    return;
  }
  try {
    res.json({ text: await composeSentence(words) });
  } catch (err) {
    if (err instanceof ComposeRefusedError) {
      res.status(422).json({ error: 'refused' });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'upstream_rate_limited' });
    } else if (err instanceof Anthropic.AuthenticationError) {
      console.error('[compose] Anthropic authentication failed — check ANTHROPIC_API_KEY');
      res.status(502).json({ error: 'upstream_auth' });
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[compose] Anthropic API error ${err.status}: ${err.message}`);
      res.status(502).json({ error: 'upstream_error' });
    } else {
      console.error('[compose]', err);
      res.status(500).json({ error: 'internal' });
    }
  }
});

app.post('/api/tts', rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const rate = Number(req.body?.rate ?? 1);
  if (!text || text.length > MAX_TTS_LENGTH || !Number.isFinite(rate) || rate < 0.5 || rate > 2) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  if (!ttsEnabled()) {
    res.status(503).json({ error: 'tts_disabled' });
    return;
  }
  try {
    const audio = await synthesizeSpeech(text, rate);
    res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' }).send(audio);
  } catch (err) {
    console.error('[tts]', err instanceof Error ? err.message : err);
    res.status(err instanceof TtsError ? 502 : 500).json({ error: 'tts_failed' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Serve the production build (npm run build) from the same origin.
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(join(distDir, 'index.html'));
  });
}

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status === 400 ? 'bad_request' : 'internal' });
};
app.use(onError);

app.listen(PORT, () => {
  console.log(`[qoldau] API on http://localhost:${PORT}`);
  console.log(`[qoldau] sentence composer: ${composeEnabled() ? composeModel : 'off (set ANTHROPIC_API_KEY)'}`);
  console.log(`[qoldau] Kazakh TTS: ${ttsEnabled() ? ttsVoice() : 'browser voices (set AZURE_SPEECH_KEY/REGION for Azure)'}`);
  if (existsSync(distDir)) console.log(`[qoldau] serving the app build from ${distDir}`);
});
