// Adapter for onlyfansapi.com (third-party OnlyFans proxy).
// Credentials and account IDs stay in server `.env` only — never in client code.

const API_ROOT = (process.env.ONLYFANS_BASE_URL || 'https://app.onlyfansapi.com/api').replace(
  /\/$/,
  '',
);
const API_KEY = process.env.ONLYFANS_API_KEY;
const API_KEY_HEADER = process.env.ONLYFANS_API_KEY_HEADER || 'Authorization';
const API_KEY_PREFIX = process.env.ONLYFANS_API_KEY_PREFIX ?? 'Bearer ';
const ACCESS_TOKEN = process.env.ONLYFANS_ACCESS_TOKEN;
const CLIENT_ID = process.env.ONLYFANS_CLIENT_ID;
const CLIENT_SECRET = process.env.ONLYFANS_CLIENT_SECRET;
const ACCOUNT_ID = process.env.ONLYFANS_ACCOUNT_ID;
const USERNAME_FILTER = process.env.ONLYFANS_PROFILE_SLUG || process.env.ONLYFANS_USERNAME;

function formatApiKeyValue() {
  const prefix = (API_KEY_PREFIX || 'Bearer').trim();
  // .env often has ONLYFANS_API_KEY_PREFIX=Bearer without trailing space
  if (prefix.toLowerCase() === 'bearer') return `Bearer ${API_KEY}`;
  return `${prefix}${API_KEY}`;
}

function authHeaders() {
  if (API_KEY) {
    return { [API_KEY_HEADER]: formatApiKeyValue() };
  }

  if (ACCESS_TOKEN) {
    return { Authorization: `Bearer ${ACCESS_TOKEN}` };
  }

  if (CLIENT_ID && CLIENT_SECRET) {
    return {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    };
  }

  return {};
}

async function fetchOnlyFans(path, { query, method = 'GET', body } = {}) {
  const url = new URL(`${API_ROOT}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`onlyfansapi ${response.status}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrapData(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function normalizeAccounts(payload) {
  if (Array.isArray(payload)) return payload;
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  return [];
}

function pickAccount(accounts) {
  if (!accounts.length) return null;

  if (ACCOUNT_ID) {
    const match = accounts.find((a) => a.id === ACCOUNT_ID);
    if (match) return match;
    throw new Error(`ONLYFANS_ACCOUNT_ID ${ACCOUNT_ID} nicht in verbundenen Accounts gefunden`);
  }

  if (USERNAME_FILTER) {
    const slug = USERNAME_FILTER.replace(/^@/, '').toLowerCase();
    const match = accounts.find(
      (a) =>
        a.onlyfans_username?.toLowerCase() === slug ||
        a.display_name?.toLowerCase().replace(/^@/, '') === slug,
    );
    if (match) return match;

    const authenticated = accounts.filter((a) => a.is_authenticated);
    if (authenticated.length === 1) {
      console.warn(
        `ONLYFANS_PROFILE_SLUG "${USERNAME_FILTER}" passt nicht — nutze einzigen Account @${authenticated[0].onlyfans_username}`,
      );
      return authenticated[0];
    }
  }

  const authenticated = accounts.filter((a) => a.is_authenticated);
  if (authenticated.length === 1) return authenticated[0];
  if (authenticated.length > 1) {
    throw new Error(
      'Mehrere OF-Accounts verbunden — setze ONLYFANS_ACCOUNT_ID oder ONLYFANS_PROFILE_SLUG (Username) in .env',
    );
  }

  return accounts[0] ?? null;
}

export async function listAccounts() {
  const slug = USERNAME_FILTER?.replace(/^@/, '');

  // API username filter can return [] if slug doesn't match — always fall back to full list
  if (slug) {
    const filtered = normalizeAccounts(
      await fetchOnlyFans('/accounts', { query: { onlyfans_username: slug } }),
    );
    if (filtered.length) return filtered;
  }

  return normalizeAccounts(await fetchOnlyFans('/accounts'));
}

export async function resolveAccount() {
  const accounts = await listAccounts();
  const account = pickAccount(accounts);
  if (!account) {
    throw new Error(
      'Kein OnlyFans-Account verbunden. Verbinde einen Account unter app.onlyfansapi.com → Accounts',
    );
  }
  if (!account.is_authenticated) {
    throw new Error(
      `Account ${account.onlyfans_username ?? account.id} ist nicht authentifiziert — bitte in OnlyFansAPI neu verbinden`,
    );
  }
  return account;
}

export async function getCurrentAccount(accountId = ACCOUNT_ID) {
  const account = accountId ? { id: accountId } : await resolveAccount();
  const payload = await fetchOnlyFans(`/${account.id}/me`);
  return unwrapData(payload);
}

export async function getAccountById(accountId) {
  if (!accountId) return resolveAccount();
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    throw new Error(`OnlyFans-Account ${accountId} nicht gefunden`);
  }
  if (!account.is_authenticated) {
    throw new Error(
      `Account ${account.onlyfans_username ?? account.id} ist nicht authentifiziert — bitte in OnlyFansAPI neu verbinden`,
    );
  }
  return account;
}

export async function getProfile(accountId) {
  const account = accountId ? await getAccountById(accountId) : await resolveAccount();
  const me = await getCurrentAccount(account.id);
  return { account, profile: me };
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatMessageTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function fanSpend(fan) {
  const on = fan?.subscribedOnData?.totalSumm;
  const by = fan?.subscribedByData?.totalSumm;
  const tips = fan?.subscribedOnData?.tipsSumm ?? 0;
  const posts = fan?.subscribedOnData?.postsSumm ?? 0;
  const messages = fan?.subscribedOnData?.messagesSumm ?? 0;
  const total = Number(on ?? by ?? tips + posts + messages) || 0;
  return Math.round(total);
}

function pickMediaUrl(files = {}) {
  return (
    files.preview?.url ||
    files.thumb?.url ||
    files.squarePreview?.url ||
    files.full?.url ||
    null
  );
}

function extractMessageMedia(m) {
  const items = [];
  const sources = [
    ...(Array.isArray(m.media) ? m.media : []),
    ...(Array.isArray(m.previews) ? m.previews : []),
  ];
  for (const item of sources) {
    const url = pickMediaUrl(item?.files);
    if (!url) continue;
    items.push({
      url,
      thumbUrl: item?.files?.thumb?.url || url,
      type: item?.type === 'video' ? 'video' : 'image',
      locked: !m.isFree && m.price > 0,
      price: m.price > 0 ? m.price : undefined,
    });
  }
  const seen = new Set();
  return items.filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

function mapOfMessage(m) {
  const text = stripHtml(m.text);
  const media = extractMessageMedia(m);
  if (!text && media.length) return { ...m, mappedText: '', media };
  if (!text && m.mediaCount > 0) return { ...m, mappedText: `[${m.mediaCount} Media]`, media };
  if (m.isTip && m.price) return { ...m, mappedText: `💰 Tip €${m.price}`, media };
  if (!m.isFree && m.price) return { ...m, mappedText: text || `🔒 PPV €${m.price}`, media };
  return { ...m, mappedText: text || (media.length ? '' : '(leer)'), media };
}

/**
 * Pull recent chats + messages from OnlyFansAPI (read-only).
 * @param {{ accountId?: string, limit?: number, messageLimit?: number, filter?: 'unread'|'recent'|'' }} opts
 */
export async function pullMessages(opts = {}) {
  const limit = Math.min(50, Math.max(1, Number(opts.limit ?? 20)));
  const messageLimit = Math.min(50, Math.max(5, Number(opts.messageLimit ?? 20)));
  const filter = opts.filter || undefined;

  const account = opts.accountId ? await getAccountById(opts.accountId) : await resolveAccount();
  const chatsPayload = await fetchOnlyFans(`/${account.id}/chats`, {
    query: {
      limit: String(limit),
      skip_users: 'none',
      order: 'recent',
      ...(filter ? { filter } : {}),
    },
  });

  const chatList = normalizeAccounts(chatsPayload);
  const conversations = [];

  for (const chat of chatList.slice(0, limit)) {
    const fan = chat.fan;
    const chatId = fan?.id;
    if (!chatId) continue;

    let msgList = [];
    try {
      const msgsPayload = await fetchOnlyFans(`/${account.id}/chats/${chatId}/messages`, {
        query: { limit: String(messageLimit), order: 'asc', skip_users: 'all' },
      });
      const raw = unwrapData(msgsPayload);
      msgList = Array.isArray(raw) ? raw : [];
    } catch (err) {
      console.warn(`Chat ${chatId} messages failed:`, err.message);
      const preview = mapOfMessage(chat.lastMessage ?? {});
      if (preview.mappedText) {
        msgList = [{
          id: chat.lastMessage?.id ?? `preview-${chatId}`,
          isSentByMe: chat.lastMessage?.isSentByMe ?? false,
          text: chat.lastMessage?.text,
          createdAt: chat.lastMessage?.createdAt,
          isFree: true,
          price: 0,
          mediaCount: chat.lastMessage?.mediaCount ?? 0,
          isTip: false,
        }];
      }
    }

    const messages = msgList
      .map((m) => {
        const mapped = mapOfMessage(m);
        return {
          id: String(m.id),
          from: m.isSentByMe ? 'creator' : 'fan',
          text: mapped.mappedText,
          time: formatMessageTime(m.createdAt),
          media: mapped.media?.length ? mapped.media : undefined,
        };
      })
      .filter((m) => m.text || m.media?.length);

    if (!messages.length) continue;

    const spend = fanSpend(fan);
    const channel = chat.lastMessage?.price > 0 && !chat.lastMessage?.isFree ? 'PPV' : 'DM';

    conversations.push({
      id: `of-${chatId}`,
      ofChatId: String(chatId),
      fan: fan.name || fan.displayName || fan.username || 'Fan',
      fanHandle: fan.username ? `@${fan.username}` : `@fan${chatId}`,
      channel,
      unread: Number(chat.unreadMessagesCount ?? 0),
      spend,
      pinned: Number(chat.countPinnedMessages ?? 0) > 0,
      messages,
    });
  }

  return {
    account,
    conversations,
    synced: conversations.length,
  };
}

/**
 * Send a chat message via OnlyFansAPI.
 * @param {{ accountId?: string, chatId: string, text: string, price?: number }} opts
 */
export async function sendChatMessage(opts) {
  const { chatId, text, price = 0 } = opts;
  if (!chatId) throw new Error('chatId erforderlich');
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('Nachricht darf nicht leer sein');

  const account = opts.accountId ? await getAccountById(opts.accountId) : await resolveAccount();
  const payload = await fetchOnlyFans(`/${account.id}/chats/${chatId}/messages`, {
    method: 'POST',
    body: {
      text: trimmed,
      lockedText: false,
      price: Number(price) || 0,
    },
  });

  const sent = unwrapData(payload);
  const mapped = mapOfMessage(sent);
  return {
    account,
    message: {
      id: String(sent.id),
      from: 'creator',
      text: mapped.mappedText || trimmed,
      time: formatMessageTime(sent.createdAt),
      media: mapped.media?.length ? mapped.media : undefined,
    },
  };
}

/** Server-side integration status — never exposes secrets to the client. */
export function getIntegrationStatus() {
  const hasKey = Boolean(
    API_KEY ||
      ACCESS_TOKEN ||
      (CLIENT_ID && CLIENT_SECRET),
  );

  return {
    // API key alone is "configured"; live test also needs a linked OF account
    configured: hasKey,
    provider: 'onlyfansapi',
    baseUrl: API_ROOT,
    accountId: ACCOUNT_ID || null,
    usernameFilter: USERNAME_FILTER ? USERNAME_FILTER.replace(/^@/, '') : null,
    hasApiKey: hasKey,
    hasAccountId: Boolean(ACCOUNT_ID),
    hasUsernameFilter: Boolean(USERNAME_FILTER),
  };
}

function profileDisplayName(account, profile) {
  return (
    profile?.name ??
    profile?.username ??
    account?.onlyfans_username ??
    account?.display_name ??
    account?.id ??
    'Verbunden'
  );
}

/** Live connection test: list accounts + fetch /me (read-only). */
export async function testConnection() {
  const status = getIntegrationStatus();
  if (!status.hasApiKey) {
    throw new Error('ONLYFANS_API_KEY in .env setzen');
  }

  const accounts = await listAccounts();
  const account = pickAccount(accounts);
  if (!account) {
    throw new Error(
      'API-Key OK, aber kein OnlyFans-Account verbunden. Unter app.onlyfansapi.com → Accounts verbinden.',
    );
  }

  const profile = await getCurrentAccount(account.id);
  return {
    ok: true,
    profileName: profileDisplayName(account, profile),
    accountId: account.id,
    username: profile?.username ?? account.onlyfans_username,
    subscribersCount: profile?.subscribersCount ?? null,
    isAuthenticated: account.is_authenticated,
  };
}