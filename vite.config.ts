import { existsSync, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const mediapipe = JSON.parse(
  readFileSync(new URL('./node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'),
) as { version: string };

const API_PORT = Number(process.env.PORT ?? 8787);

// Written by scripts/setup-assets.mjs on `npm install`.
const visionFilesPresent = [
  'public/mediapipe/wasm/vision_wasm_internal.wasm',
  'public/models/hand_landmarker.task',
  'public/models/blaze_face_short_range.tflite',
].every((file) => existsSync(new URL(`./${file}`, import.meta.url)));

/** The chunk of the full Firestore SDK (the lite one used elsewhere has no offline persistence). */
function isFullFirestore(url: string): boolean {
  try {
    return readFileSync(new URL(`./dist/${url}`, import.meta.url), 'utf8').includes('IndexedDbPersistence');
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  // `vite build --mode firebase` (npm run deploy): Firebase Hosting's free plan
  // has 10 GB of transfer a month, so the ~18 MB recognition models come from
  // Google's CDN and are cached by the service worker when the camera is first
  // used, instead of being downloaded by every visitor of the home page.
  const localVisionAssets = visionFilesPresent && mode !== 'firebase';

  return {
    // Set BASE_PATH=/repo-name/ when hosting under a sub-path (e.g. GitHub Pages).
    base: process.env.BASE_PATH ?? '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Qoldau — ым тілінен қазақ сөзіне',
          short_name: 'Qoldau',
          description: 'Жестерді камера арқылы танып, қазақша сөйлейтін көмекші. Интернетсіз жұмыс істейді.',
          lang: 'kk',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          orientation: 'any',
          background_color: '#f5f8f2',
          theme_color: '#2d8ee8',
          categories: ['accessibility', 'education', 'utilities'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell, fonts and (unless they come from the CDN) the hand/face
          // recognition models are cached on the first visit. The ~60 MB voice is downloaded on request instead
          // (see src/speech/voices.ts) and kept in its own cache.
          globPatterns: [
            '**/*.{js,css,html,svg,png,woff2}',
            ...(localVisionAssets ? ['mediapipe/wasm/vision_wasm_internal.{js,wasm}', 'models/*.{task,tflite}'] : []),
          ],
          // Not cached ahead: font subsets the three languages never use, and (below) the full
          // Firestore SDK of the chat (~0.5 MB, loaded when the chat opens, which needs the
          // network anyway). On a phone's mobile data every precached byte competes with the
          // page's own pictures.
          globIgnores: [
            'mediapipe/**/*nosimd*',
            'mediapipe/**/*module*',
            'voices/**',
            // Cartoons, comic pages and the guide video are watched online, not stored ahead.
            'kids/**',
            'guide/**',
            'assets/inter-{greek,greek-ext,vietnamese,latin-ext}-*.woff2',
          ],
          manifestTransforms: [
            async (entries) => ({
              manifest: entries.filter((entry) => !(entry.url.endsWith('.js') && isFullFirestore(entry.url))),
              warnings: [],
            }),
          ],
          runtimeCaching: [
            {
              // Recognition engine and models from the CDN (Firebase build).
              urlPattern: /^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@|storage\.googleapis\.com\/mediapipe-models\/)/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'qoldau-vision',
                expiration: { maxEntries: 12 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Lesson posters: shown again instantly, also offline.
              urlPattern: /\/signs\/[\w-]+\.webp$/,
              handler: 'CacheFirst',
              options: { cacheName: 'qoldau-posters', expiration: { maxEntries: 80 } },
            },
          ],
          maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    define: {
      __MEDIAPIPE_VERSION__: JSON.stringify(mediapipe.version),
      __LOCAL_VISION_ASSETS__: JSON.stringify(localVisionAssets),
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      // Loads its WebAssembly relative to its own file; pre-bundling breaks that.
      exclude: ['onnxruntime-web'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': `http://localhost:${API_PORT}`,
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
