import { StrictMode, startTransition } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes';
import './styles/global.css';

const router = createBrowserRouter(routes);
const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

if (root.hasChildNodes()) {
  startTransition(() => {
    hydrateRoot(root, app, {
      // A mismatch makes React throw away the pre-rendered HTML; always surface it.
      onRecoverableError: (e) => console.warn('[hydration]', e),
    });
  });
} else {
  createRoot(root).render(app);
}

// Register the service worker after load so it never blocks first paint.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
  });
}
