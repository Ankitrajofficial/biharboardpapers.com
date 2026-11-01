import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { prerenderToNodeStream } from 'react-dom/static';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { routes } from './routes';
import { siteConfig } from './config/site';
import { settleResources } from './content/loader';
export { resourceValue } from './content/loader';

async function app(url: string) {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(siteConfig.origin + url));
  if (context instanceof Response) throw new Error(`Unexpected response for ${url}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return (
    <StrictMode>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </StrictMode>
  );
}

/** Streaming pass: resolves every lazy chunk and content resource for this URL. */
async function warm(url: string) {
  const { prelude } = await prerenderToNodeStream(await app(url));
  await new Promise<void>((resolve, reject) => {
    prelude.on('data', () => {});
    prelude.on('end', resolve);
    prelude.on('error', reject);
  });
  await settleResources();
}

/**
 * Pre-renders one URL to plain HTML. The streaming renderer warms lazy route chunks and
 * content resources; the final pass is synchronous, so the output contains no streamed
 * Suspense segments (those are swapped in by inline scripts and break hydration).
 */
export async function render(url: string): Promise<string> {
  await warm(url);
  const html = renderToString(await app(url));
  if (html.includes("<!--$!-->")) throw new Error(`Pre-render of ${url} left a Suspense fallback in the HTML`);
  return html;
}
