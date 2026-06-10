// Adapter for the external onlyfansapi provider.
// Keep provider credentials in `.env` only, never in client-side code.

const BASE_URL = process.env.ONLYFANS_BASE_URL || 'https://app.onlyfansapi.com/api';
const API_KEY = process.env.ONLYFANS_API_KEY;
const API_KEY_HEADER = process.env.ONLYFANS_API_KEY_HEADER || 'Authorization';
const API_KEY_PREFIX = process.env.ONLYFANS_API_KEY_PREFIX || 'Bearer ';
const ACCESS_TOKEN = process.env.ONLYFANS_ACCESS_TOKEN;
const CLIENT_ID = process.env.ONLYFANS_CLIENT_ID;
const CLIENT_SECRET = process.env.ONLYFANS_CLIENT_SECRET;

function authHeaders() {
  if (API_KEY) {
    return { [API_KEY_HEADER]: `${API_KEY_PREFIX}${API_KEY}` };
  }

  if (ACCESS_TOKEN) {
    return { Authorization: `Bearer ${ACCESS_TOKEN}` };
  }

  if (CLIENT_ID && CLIENT_SECRET) {
    return { Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}` };
  }

  return {};
}

async function fetchOnlyFans(path) {
  if (!BASE_URL) {
    throw new Error('ONLYFANS_BASE_URL is not configured');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`onlyfansapi request failed ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getProfile(slug = process.env.ONLYFANS_PROFILE_SLUG) {
  if (!slug) {
    throw new Error('ONLYFANS_PROFILE_SLUG is not configured');
  }

  return fetchOnlyFans(`/profiles/${encodeURIComponent(slug)}`);
}

export async function pullMessages() {
  // onlyfansapi currently supports profile endpoints; implement message routes if needed.
  throw new Error('pullMessages is not implemented for onlyfansapi provider');
}
