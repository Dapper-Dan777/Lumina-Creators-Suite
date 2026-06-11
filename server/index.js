import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import app, { ensureDatabase } from './app.js';

const n8nBaseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, '');
const n8nEmbedPort = Number(process.env.N8N_EMBED_PORT || 5679);

function createN8nEmbedProxy() {
  return createProxyMiddleware({
    target: n8nBaseUrl,
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq) => {
      const apiKey = process.env.N8N_API_KEY;
      if (apiKey) {
        proxyReq.setHeader('X-N8N-API-KEY', apiKey);
      }
    },
    onProxyRes: (proxyRes) => {
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    },
  });
}

async function startServer() {
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('Database init failed:', error.message);
    process.exit(1);
  }

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`API listening on ${port}`);
    if (n8nBaseUrl) {
      console.log(`n8n backend -> ${n8nBaseUrl}`);
    } else {
      console.log('n8n disabled (set N8N_BASE_URL to enable)');
    }
  });
}

startServer();

if (n8nBaseUrl) {
  const embedProxy = createN8nEmbedProxy();
  const embedApp = express();
  embedApp.use(embedProxy);
  const embedServer = embedApp.listen(n8nEmbedPort, () => {
    console.log(`n8n iframe proxy on http://localhost:${n8nEmbedPort} -> ${n8nBaseUrl}`);
  });

  embedServer.on('upgrade', (req, socket, head) => {
    embedProxy.upgrade(req, socket, head);
  });
}