/**
 * Web search for talent scouting — DuckDuckGo HTML + optional Serper (Google).
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const SOCIAL_HOSTS = [
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'onlyfans.com',
  'linktr.ee',
  'beacons.ai',
  'allmylinks.com',
  'hoo.be',
  'youtube.com',
  'twitch.tv',
];

export function isSocialUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function normalizeProfileUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    let path = u.pathname.replace(/\/+$/, '');
    if (/instagram\.com/i.test(u.hostname)) {
      const m = path.match(/^\/([a-zA-Z0-9._]+)/);
      if (m && !['p', 'reel', 'stories', 'explore'].includes(m[1])) {
        return `https://www.instagram.com/${m[1]}/`;
      }
    }
    if (/tiktok\.com/i.test(u.hostname)) {
      const m = path.match(/^\/@([a-zA-Z0-9._]+)/);
      if (m) return `https://www.tiktok.com/@${m[1]}`;
    }
    if (/onlyfans\.com/i.test(u.hostname)) {
      const m = path.match(/^\/([a-zA-Z0-9._-]+)/);
      if (m && m[1] !== 'my') return `https://onlyfans.com/${m[1]}`;
    }
    return `${u.origin}${path}`;
  } catch {
    return url;
  }
}

function decodeDdgUrl(href) {
  if (!href) return null;
  try {
    if (href.startsWith('//')) href = `https:${href}`;
    const u = new URL(href);
    const uddg = u.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    if (u.hostname.includes('duckduckgo.com')) return null;
    return u.toString();
  } catch {
    return href.startsWith('http') ? href : null;
  }
}

async function fetchHtml(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchDuckDuckGo(query, maxResults = 12) {
  const html = await fetchHtml(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 15000);
  if (!html) return [];

  const results = [];
  const seen = new Set();

  const patterns = [
    /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    /uddg=([^&"]+)/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const rawUrl = m[1]?.includes('uddg=') ? decodeURIComponent(m[1]) : decodeDdgUrl(m[1]);
      if (!rawUrl || seen.has(rawUrl)) continue;
      seen.add(rawUrl);
      const title = m[2] ? m[2].replace(/<[^>]+>/g, '').trim() : '';
      results.push({ url: rawUrl, title, source: 'duckduckgo' });
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }

  return results.slice(0, maxResults);
}

export async function getSearchProviderStatus() {
  const hasKey = Boolean(process.env.SERPER_API_KEY?.trim());
  if (!hasKey) {
    return {
      configured: false,
      connected: false,
      provider: 'duckduckgo',
      error: null,
    };
  }

  const probe = await searchSerper('instagram creator', 1);
  if (probe.error) {
    const errText =
      probe.error === 'no_key'
        ? 'SERPER_API_KEY ungültig oder leer'
        : probe.error.startsWith('http_')
          ? `Serper API Fehler ${probe.error.replace('http_', '')}`
          : probe.error;
    return {
      configured: true,
      connected: false,
      provider: 'google-serper',
      error: errText,
    };
  }

  return {
    configured: true,
    connected: true,
    provider: 'google-serper',
    error: null,
  };
}

export async function searchSerper(query, maxResults = 12) {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return { results: [], error: 'no_key' };

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key,
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(maxResults, 20),
        gl: process.env.SERPER_GL || 'de',
        hl: process.env.SERPER_HL || 'de',
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn('Serper/Google:', res.status, text.slice(0, 200));
      return { results: [], error: `http_${res.status}` };
    }
    const data = JSON.parse(text);
    const results = (data.organic ?? []).slice(0, maxResults).map((r) => ({
      url: r.link,
      title: r.title ?? '',
      snippet: r.snippet ?? '',
      source: 'google',
    }));
    return { results, error: null };
  } catch (err) {
    console.warn('Serper/Google:', err.message);
    return { results: [], error: err.message };
  }
}

export async function searchWeb(query, maxResults = 12) {
  const hasGoogle = Boolean(process.env.SERPER_API_KEY?.trim());

  const serperOut = hasGoogle ? await searchSerper(query, maxResults) : { results: [], error: 'no_key' };
  let serper = serperOut.results;

  // DuckDuckGo als Fallback oder Ergänzung wenn Google wenig liefert
  let ddg = [];
  if (!hasGoogle || serper.length < Math.min(4, maxResults)) {
    ddg = await searchDuckDuckGo(query, maxResults);
  }

  const merged = [];
  const seen = new Set();
  // Google-Ergebnisse zuerst (höhere Qualität)
  for (const r of [...serper, ...ddg]) {
    const norm = normalizeProfileUrl(r.url);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push({ ...r, url: norm });
  }
  return merged.slice(0, maxResults);
}

export function filterSocialResults(results, platforms = []) {
  const allowed = platforms.length
    ? platforms.map((p) => p.toLowerCase())
    : ['instagram', 'tiktok', 'twitter', 'reddit', 'onlyfans', 'linkhub', 'youtube'];

  return results.filter((r) => {
    if (!isSocialUrl(r.url)) return false;
    const platform = detectPlatformFromUrl(r.url);
    if (platform === 'other') return false;
    if (platform === 'linkhub') return allowed.includes('linkhub') || allowed.includes('instagram');
    return allowed.includes(platform);
  });
}

export function detectPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('twitter.com') || host === 'x.com') return 'twitter';
    if (host.includes('onlyfans.com')) return 'onlyfans';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (/linktr\.ee|beacons\.ai|allmylinks|hoo\.be/i.test(host)) return 'linkhub';
    return 'other';
  } catch {
    return 'other';
  }
}