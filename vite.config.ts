import { existsSync, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const mediapipe = JSON.parse(
  readFileSync(new URL('./node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'),
) as { version: string };

const API_PORT = Number(process.env.PORT ?? 8787);

// Written by scripts/setup-assets.mjs on `npm install`.
const localVisionAssets = [
  'public/mediapipe/wasm/vision_wasm_internal.wasm',
  'public/models/hand_landmarker.task',
  'public/models/blaze_face_short_range.tflite',
].every((file) => existsSync(new URL(`./${file}`, import.meta.url)));

export default defineConfig({
  // Set BASE_PATH=/repo-name/ when hosting under a sub-path (e.g. GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Qoldau — ым тілінен қазақ сөзіне',
        short_name: 'Qoldau',
        description: 'Жестерді камера арқылы танып, қазақша сөйлейтін көмекші. Интернетсіз жұмыс істейді.',
        lang: 'kk',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a111e',
        theme_color: '#0284c7',
        categories: ['accessibility', 'education', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell, fonts and the hand/face recognition models are cached on
        // the first visit. The ~60 MB voice is downloaded on request instead
        // (see src/speech/voices.ts) and kept in its own cache.
        globPatterns: [
          '**/*.{js,css,html,svg,png,woff2}',
          'mediapipe/wasm/vision_wasm_internal.{js,wasm}',
          'models/*.{task,tflite}',
        ],
        globIgnores: ['mediapipe/wasm/*nosimd*', 'mediapipe/wasm/*module*', 'voices/**'],
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
});
