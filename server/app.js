import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getProfile,
  pullMessages,
  getIntegrationStatus,
  testConnection,
} from './adapters/onlyfans.js';
import { prisma } from './db.js';
import { seedDatabaseIfEmpty } from './seed.js';
import creatorsRouter from './routes/creators.js';
import contentRouter from './routes/content.js';
import aiRouter from './routes/ai.js';
import scoutRouter from './routes/scout.js';
import mediaRouter from './routes/media.js';
import templatesRouter from './routes/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

let dbReadyPromise;

export async function ensureDatabase() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      await prisma.$connect();
      await seedDatabaseIfEmpty();
    })();
  }
  return dbReadyPromise;
}

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
  }),
);

app.get('/api/setup-status', (_req, res) => {
  res.json({
    ok: true,
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      ONLYFANS_API_KEY: !!process.env.ONLYFANS_API_KEY,
      AI_API_KEY: !!process.env.AI_API_KEY,
      SERPER_API_KEY: !!process.env.SERPER_API_KEY,
    },
    hint: !process.env.DATABASE_URL
      ? 'DATABASE_URL in Vercel → Settings → Environment Variables setzen, dann Redeploy'
      : undefined,
  });
});

app.get('/api/n8n/status', async (_req, res) => {
  const n8nBaseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, '');
  if (!n8nBaseUrl) {
    return res.json({
      enabled: false,
      connected: false,
      message: 'N8N_BASE_URL ist nicht gesetzt.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${n8nBaseUrl}/healthz`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({
        enabled: true,
        connected: false,
        baseUrl: n8nBaseUrl,
        message: `n8n antwortet mit Status ${response.status}.`,
      });
    }

    return res.json({
      enabled: true,
      connected: true,
      baseUrl: n8nBaseUrl,
      message: 'n8n ist erreichbar.',
    });
  } catch (error) {
    return res.json({
      enabled: true,
      connected: false,
      baseUrl: n8nBaseUrl,
      message: `n8n nicht erreichbar: ${error.message}`,
    });
  }
});

app.get('/api/integrations/onlyfans/status', (_req, res) => {
  res.json(getIntegrationStatus());
});

app.post('/api/integrations/onlyfans/test', async (_req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

const requireDatabase = async (_req, res, next) => {
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    console.error('Database init failed:', error.message);
    res.status(503).json({
      error: 'Database nicht erreichbar',
      message: error.message,
      hint: 'DATABASE_URL in Vercel setzen (z.B. Neon Postgres), dann Redeploy',
    });
  }
};

app.use('/api/creators', requireDatabase);
app.use('/api/content', requireDatabase);
app.use('/api/scout', requireDatabase);
app.use('/api/media', requireDatabase);
app.use('/api/templates', requireDatabase);

app.get('/api/onlyfans/accounts', async (_req, res) => {
  try {
    const { listAccounts } = await import('./adapters/onlyfans.js');
    const accounts = await listAccounts();
    res.json({
      ok: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        username: a.onlyfans_username,
        displayName: a.display_name,
        isAuthenticated: a.is_authenticated,
        subscribersCount: a.onlyfans_user_data?.subscribersCount ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/onlyfans/me', async (_req, res) => {
  try {
    const { account, profile } = await getProfile();
    res.json({ ok: true, account, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/onlyfans/stats', async (_req, res) => {
  const status = getIntegrationStatus();
  if (!status.hasApiKey) {
    return res.json({ ok: false, connected: false, message: 'ONLYFANS_API_KEY fehlt' });
  }

  try {
    const { account, profile } = await getProfile();
    res.json({
      ok: true,
      connected: true,
      accountId: account.id,
      username: profile?.username ?? account.onlyfans_username,
      name: profile?.name ?? account.display_name,
      subscribersCount: profile?.subscribersCount ?? null,
      postsCount: profile?.postsCount ?? null,
      chatMessagesCount: profile?.chatMessagesCount ?? null,
    });
  } catch (error) {
    res.json({
      ok: false,
      connected: false,
      message: error.message,
      pendingLink: error.message.includes('nicht verbunden') || error.message.includes('Kein OnlyFans'),
    });
  }
});

app.use('/api/creators', creatorsRouter);
app.use('/api/content', contentRouter);
app.use('/api/ai', aiRouter);
app.use('/api/scout', scoutRouter);
app.use('/api/media', mediaRouter);
app.use('/api/templates', templatesRouter);

app.post('/api/onlyfans/sync-avatars', requireDatabase, async (_req, res) => {
  try {
    const { autoLinkCreators } = await import('./lib/ofLink.js');
    const { listAccounts } = await import('./adapters/onlyfans.js');
    const accounts = await listAccounts();
    const result = await autoLinkCreators(prisma, accounts);
    res.json({
      ok: true,
      updated: result.linked.length,
      message: result.linked.length
        ? `${result.linked.length} Profilbilder von OnlyFans synchronisiert`
        : 'Keine verknüpften Creator — zuerst OF verbinden',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/auto-link', requireDatabase, async (_req, res) => {
  try {
    const { autoLinkCreators } = await import('./lib/ofLink.js');
    const { listAccounts } = await import('./adapters/onlyfans.js');
    const accounts = await listAccounts();
    const result = await autoLinkCreators(prisma, accounts);

    res.json({
      ok: true,
      linked: result.linked,
      unmatchedAccounts: result.unmatchedAccounts,
      message: result.linked.length
        ? `${result.linked.length} Creator mit OnlyFans verbunden`
        : 'Keine passenden Creator gefunden',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/sync-creators', requireDatabase, async (_req, res) => {
  try {
    const { autoLinkCreators } = await import('./lib/ofLink.js');
    const { listAccounts } = await import('./adapters/onlyfans.js');
    const accounts = await listAccounts();
    const result = await autoLinkCreators(prisma, accounts);

    res.json({
      ok: true,
      updated: result.linked.length,
      linked: result.linked,
      unmatchedAccounts: result.unmatchedAccounts,
      message: result.linked.length
        ? `${result.linked.length} Creator synchronisiert`
        : 'Keine Creator verknüpft',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/sync-chats', requireDatabase, async (req, res) => {
  try {
    const { pullMessages, listAccounts } = await import('./adapters/onlyfans.js');
    const { autoLinkCreators, findCreatorForAccount } = await import('./lib/ofLink.js');

    const limit = Number(req.body?.limit ?? 25);
    const filter = req.body?.filter ?? 'recent';
    const accounts = (await listAccounts()).filter((a) => a.is_authenticated);

    if (!accounts.length) {
      return res.status(400).json({
        ok: false,
        error: 'Kein authentifizierter OnlyFans-Account',
      });
    }

    await autoLinkCreators(prisma, accounts);
    const creators = await prisma.creator.findMany();
    const conversations = [];
    const accountsSynced = [];

    for (const account of accounts) {
      const creator = findCreatorForAccount(creators, account);
      const creatorId = creator?.id ?? '';

      try {
        const result = await pullMessages({
          accountId: account.id,
          limit,
          filter: filter === 'all' ? '' : filter,
        });

        for (const c of result.conversations) {
          conversations.push({ ...c, creatorId });
        }

        accountsSynced.push({
          accountId: account.id,
          username: account.onlyfans_username,
          creatorId: creatorId || null,
          chats: result.conversations.length,
        });
      } catch (err) {
        console.warn(`Chat sync for ${account.onlyfans_username}:`, err.message);
        accountsSynced.push({
          accountId: account.id,
          username: account.onlyfans_username,
          error: err.message,
        });
      }
    }

    res.json({
      ok: true,
      synced: conversations.length,
      accountsSynced,
      conversations,
      message: conversations.length
        ? `${conversations.length} Chat(s) geladen`
        : 'Keine Chats gefunden',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/send-message', requireDatabase, async (req, res) => {
  try {
    const { sendChatMessage } = await import('./adapters/onlyfans.js');
    const { chatId, text, creatorId, price } = req.body ?? {};
    if (!chatId || !text?.trim()) {
      return res.status(400).json({ ok: false, error: 'chatId und text erforderlich' });
    }

    let accountId;
    if (creatorId) {
      const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
      accountId = creator?.onlyfansAccountId ?? undefined;
    }

    const result = await sendChatMessage({
      accountId,
      chatId: String(chatId).replace(/^of-/, ''),
      text: String(text).trim(),
      price: price ? Number(price) : 0,
    });

    res.json({
      ok: true,
      message: result.message,
      accountId: result.account.id,
      username: result.account.onlyfans_username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/onlyfans/media-proxy', async (req, res) => {
  try {
    const raw = String(req.query.url ?? '');
    if (!raw) return res.status(400).json({ ok: false, error: 'url erforderlich' });
    let target;
    try {
      target = new URL(raw);
    } catch {
      return res.status(400).json({ ok: false, error: 'Ungültige URL' });
    }
    const host = target.hostname.toLowerCase();
    if (!host.includes('onlyfans.com') && !host.includes('ofcdn')) {
      return res.status(403).json({ ok: false, error: 'Nur OnlyFans-CDN erlaubt' });
    }

    const upstream = await fetch(raw, { headers: { Accept: 'image/*,video/*,*/*' } });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ ok: false, error: `Upstream ${upstream.status}` });
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/onlyfans/pull', async (req, res) => {
  try {
    const limit = Number(req.body?.limit ?? 25);
    const filter = req.body?.filter ?? 'recent';
    const results = await pullMessages({
      limit,
      filter: filter === 'all' ? '' : filter,
    });
    res.json({ ok: true, ...results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use('/.well-known', express.static(path.join(__dirname, '..', 'public')));

export default app;