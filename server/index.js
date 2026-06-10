import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProfile, pullMessages } from './adapters/onlyfans.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to remove X-Frame-Options and add custom headers for iframe embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// n8n proxy: forwards /n8n/* -> N8N_BASE_URL
// Also proxy /rest/* directly to n8n for API calls from iframe
if (process.env.N8N_BASE_URL) {
  const n8nProxy = createProxyMiddleware({
    target: process.env.N8N_BASE_URL,
    changeOrigin: true,
    pathRewrite: { '^/n8n': '' },
    onProxyReq: (proxyReq, req, res) => {
      const apiKey = process.env.N8N_API_KEY;
      if (apiKey) {
        proxyReq.setHeader('X-N8N-API-KEY', apiKey);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Remove frame restriction headers from n8n
      delete proxyRes.headers['x-frame-options'];
    },
  });
  
  // Proxy for HTML and assets under /n8n
  app.use('/n8n', n8nProxy);
  
  // Also proxy /static and /assets (needed for iframe's CSS/JS files)
  app.use('/static', n8nProxy);
  app.use('/assets', n8nProxy);
  
  // Also proxy /rest/* and other API endpoints directly (for iframe internal calls)
  const restProxy = createProxyMiddleware({
    target: process.env.N8N_BASE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      const apiKey = process.env.N8N_API_KEY;
      if (apiKey) {
        proxyReq.setHeader('X-N8N-API-KEY', apiKey);
      }
    },
  });
  app.use('/rest', restProxy);
  app.use('/api', restProxy);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/onlyfans/me', async (req, res) => {
  try {
    const profileSlug = req.query.profile || process.env.ONLYFANS_PROFILE_SLUG;
    const profile = await getProfile(profileSlug);
    res.json({ ok: true, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/pull', async (req, res) => {
  try {
    const results = await pullMessages();
    res.json({ ok: true, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Serve static public files through API (optional)
app.use('/.well-known', express.static(path.join(__dirname, '..', 'public')));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));

