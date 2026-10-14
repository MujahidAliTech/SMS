import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Cloudflare Worker Dev Plugin
 * Routes all /api/* requests directly through worker/index.ts using the local SQLite D1 adapter.
 * Enables zero-configuration local development for Cloudflare Worker & D1 API endpoints.
 */
function cloudflareWorkerDevPlugin(): Plugin {
  return {
    name: 'cloudflare-worker-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const { default: worker } = await import('./worker/index');
          const { getLocalWorkerEnv } = await import('./worker/utils/localD1');
          const env = getLocalWorkerEnv();

          const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
          const host = req.headers.host || 'localhost:3000';
          const fullUrl = `${protocol}://${host}${req.url}`;

          let bodyBuffer: Buffer | null = null;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            bodyBuffer = await new Promise<Buffer>((resolve) => {
              if ((req as any).body) {
                if (typeof (req as any).body === 'string') {
                  return resolve(Buffer.from((req as any).body));
                }
                if (Buffer.isBuffer((req as any).body)) {
                  return resolve((req as any).body);
                }
                return resolve(Buffer.from(JSON.stringify((req as any).body)));
              }
              const chunks: Buffer[] = [];
              req.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              });
              req.on('end', () => {
                resolve(Buffer.concat(chunks));
              });
              req.on('error', () => {
                resolve(Buffer.concat(chunks));
              });
            });
          }

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val !== undefined) {
              if (Array.isArray(val)) {
                val.forEach(v => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          const webRequest = new Request(fullUrl, {
            method: req.method,
            headers,
            body: bodyBuffer && bodyBuffer.length > 0 ? (bodyBuffer as unknown as BodyInit) : undefined
          });

          const webResponse = await worker.fetch(webRequest, env);

          res.statusCode = webResponse.status;
          webResponse.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          const resBuffer = await webResponse.arrayBuffer();
          res.end(Buffer.from(resBuffer));
        } catch (err) {
          console.error('[Worker Dev Middleware Exception]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), cloudflareWorkerDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
