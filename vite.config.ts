import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { siteConfig } from './src/config/site.ts';
import { contentPlugin } from './scripts/vite-content-plugin.ts';

export default defineConfig(({ isPreview }) => ({
  // Every page is pre-rendered: preview serves them like a static host (dev keeps the SPA fallback).
  appType: isPreview ? 'mpa' : 'spa',
  plugins: [
    contentPlugin(fileURLToPath(new URL('.', import.meta.url))),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['fonts/*.woff2', 'icons/*.svg', 'robots.txt'],
      manifest: {
        name: siteConfig.name.en,
        short_name: siteConfig.shortName,
        description: siteConfig.tagline.en,
        lang: 'hi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F7F9FF',
        theme_color: '#2563EB',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pages are pre-rendered; serve them network-first and fall back to the offline page.
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,html,svg,woff2,json,webmanifest}'],
        // Pre-rendered HTML for every page is small; content JSON is cached on demand.
        globIgnores: ['**/content/**', 'offline.html'],
        additionalManifestEntries: [{ url: '/offline.html', revision: null }],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bbp-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              precacheFallback: { fallbackURL: '/offline.html' },
            },
          },
          {
            // Study content: chapters, mock tests, papers, calendar
            urlPattern: ({ url }) => url.pathname.startsWith('/content/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bbp-content',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Never cache video or YouTube
            urlPattern: ({ url }) => /youtube\.com|ytimg\.com|googlevideo\.com/.test(url.hostname),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    // Lets a tunnel (ngrok) reach the dev server for phone testing.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev', '.ngrok.io'],
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  preview: {
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
        },
      },
    },
  },
}));
