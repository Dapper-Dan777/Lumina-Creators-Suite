/**
 * OpenAI-compatible chat completions (OpenAI, xAI, local proxies).
 * API key stays server-side only.
 */

const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai-compatible';

function isLocalAiHost() {
  const provider = AI_PROVIDER.toLowerCase();
  if (['ollama', 'local', 'lmstudio', 'openwebui', 'open-webui'].includes(provider)) return true;
  return /localhost|127\.0\.0\.1|host\.docker\.internal/i.test(AI_BASE_URL);
}

export function getAiStatus() {
  const local = isLocalAiHost();
  const hasKey = Boolean(AI_API_KEY?.trim());
  return {
    configured: hasKey || local,
    provider: AI_PROVIDER,
    baseUrl: AI_BASE_URL,
    model: AI_MODEL,
    hasApiKey: hasKey,
    local,
  };
}

function assertConfigured() {
  const { configured, local } = getAiStatus();
  if (!configured) {
    const err = new Error(
      local
        ? 'AI_BASE_URL fehlt — für Ollama: http://host.docker.internal:11434/v1'
        : 'AI_API_KEY fehlt in .env',
    );
    err.status = 503;
    throw err;
  }
}

function buildAiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (AI_API_KEY?.trim()) {
    headers.Authorization = `Bearer ${AI_API_KEY.trim()}`;
  }
  return headers;
}

function stripMarkdownFence(content) {
  const trimmed = String(content).trim();
  const fullFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fullFence) return fullFence[1].trim();
  const inlineFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (inlineFence) return inlineFence[1].trim();
  return trimmed;
}

function sanitizeModelJson(raw) {
  let s = stripMarkdownFence(raw);
  // Trailing junk after JSON object/array (common with small local models)
  s = s.replace(/(\})\s*[.;,\s]+$/u, '$1');
  // Backtick-quoted values: "key": `text` → proper JSON string
  s = s.replace(/:\s*`([^`]*?)`/g, (_, value) => `: ${JSON.stringify(value)}`);
  // Trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s.trim();
}

function extractJsonObjectCandidates(content) {
  const candidates = new Set();
  const add = (value) => {
    if (value?.trim()) candidates.add(value.trim());
  };

  add(content);
  add(stripMarkdownFence(content));
  add(sanitizeModelJson(content));

  const objectMatch = String(content).match(/\{[\s\S]*\}/);
  if (objectMatch) {
    add(objectMatch[0]);
    add(sanitizeModelJson(objectMatch[0]));
  }

  return [...candidates];
}

function extractStringArrayAfterKey(content, key) {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = String(content).match(re);
  if (!match) return null;

  const items = [];
  const quoted = /"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = quoted.exec(match[1])) !== null) {
    const text = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    if (text) items.push(text);
  }

  if (!items.length) {
    const backtick = /`([^`]+)`/g;
    while ((m = backtick.exec(match[1])) !== null) {
      const text = m[1].trim();
      if (text) items.push(text);
    }
  }

  return items.length ? items : null;
}

function parseJsonContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('AI API: leere Antwort');
  }

  for (const candidate of extractJsonObjectCandidates(content)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  const suggestions = extractStringArrayAfterKey(content, 'suggestions');
  if (suggestions) return { suggestions };

  const captions = extractStringArrayAfterKey(content, 'captions');
  if (captions) return { captions };

  const variants = extractStringArrayAfterKey(content, 'variants');
  if (variants) return { variants };

  const messageMatch = content.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (messageMatch) {
    return {
      message: messageMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }

  const captionMatch = content.match(/"caption"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (captionMatch) {
    return {
      caption: captionMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
    };
  }

  throw new Error(
    `AI API: Antwort war kein gültiges JSON — ${String(content).slice(0, 160).replace(/\s+/g, ' ')}…`,
  );
}

async function fetchChatContent({ system, user, temperature = 0.92, maxTokens = 900, jsonMode = false }) {
  assertConfigured();

  const body = {
    model: AI_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  if (jsonMode && process.env.AI_JSON_MODE !== '0') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: buildAiHeaders(),
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    const err = new Error(`AI API ${response.status}: ${text.slice(0, 300)}`);
    err.status = response.status === 401 ? 401 : 502;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('AI API: ungültige JSON-Antwort vom Provider');
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI API: leere Antwort');
  return content;
}

async function chatCompletion(opts) {
  const content = await fetchChatContent({ ...opts, jsonMode: !isLocalAiHost() });
  return parseJsonContent(content);
}

function parseNumberedSuggestions(content) {
  const items = [];
  for (const line of String(content).split('\n')) {
    const match = line.match(/^\s*(?:\d+[\).\]:\-]|[-*•])\s+(.+?)\s*$/u);
    if (match?.[1]?.trim()) items.push(match[1].trim());
  }
  if (items.length) return items.slice(0, 3);

  const blocks = String(content)
    .split(/\n{2,}/)
    .map((s) => s.replace(/^[-*•]\s+/, '').trim())
    .filter((s) => s.length > 8 && !s.startsWith('{') && !s.startsWith('```'));
  return blocks.length ? blocks.slice(0, 3) : null;
}

function extractSuggestionsFromContent(content) {
  const numbered = parseNumberedSuggestions(content);
  if (numbered?.length) return numbered;

  try {
    const parsed = parseJsonContent(content);
    const fromJson = (parsed.suggestions ?? parsed.replies ?? [])
      .filter((s) => typeof s === 'string' && s.trim());
    if (fromJson.length) return fromJson.slice(0, 3);
  } catch {
    // fall through
  }

  const fromArray = extractStringArrayAfterKey(content, 'suggestions');
  if (fromArray?.length) return fromArray.slice(0, 3);

  return [];
}

/** Quick connectivity test for Settings. */
export async function testAiConnection() {
  assertConfigured();
  const local = isLocalAiHost();

  if (local) {
    const content = await fetchChatContent({
      system: 'Antworte nur mit einem kurzen Wort auf Deutsch, z. B. verbunden',
      user: 'ping',
      temperature: 0,
      maxTokens: 24,
      jsonMode: false,
    });
    const message = content.trim().split('\n')[0].slice(0, 60) || 'KI erreichbar';
    return { ok: true, message, model: AI_MODEL, local: true };
  }

  const result = await chatCompletion({
    system: 'Antworte NUR als JSON: {"ok":true,"message":"verbunden"}',
    user: 'ping',
    temperature: 0,
    maxTokens: 40,
  });
  return {
    ok: true,
    message: result.message ?? 'KI erreichbar',
    model: AI_MODEL,
    local: false,
  };
}

const CHATTER_SYSTEM = `Du bist ein Top-OnlyFans-Chatter-Ghostwriter für eine Creator-Agentur.
Schreibe Antworten die wie eine echte, charismatische Creatorin klingen — NICHT wie ein Bot, NICHT wie Kundenservice.

Stil-Regeln:
- Sprache des Fans spiegeln (Deutsch/Englisch/Mix)
- Energie und Flirt-Level des Fans matchen
- Max. 0–2 Emojis, natürlich platziert
- Kurz bis mittel (1–3 Sätze), locker und persönlich
- Soft-Upsell wenn passend (PPV, Customs, Bundles) — nie aufdringlich
- Konkrete Details aus der letzten Fan-Nachricht aufgreifen
- VIP-Fans (hoher Spend) bekommen wärmere, exklusivere Tonalität
- Niemals: "Als KI", "Danke für deine Nachricht", "Ich helfe dir gerne", "Absolut!", "Hope you're doing well"
- Klinge wie eine echte OF-Creatorin in DMs: intim, verspielt, leicht geheimnisvoll

Antworte NUR als JSON: {"suggestions":["...","...","..."]}
Genau 3 unterschiedliche Varianten — unterschiedliche Hooks/Tonalität, gleiche Persona.`;

const CHATTER_SYSTEM_LOCAL = `Du bist ein Top-OnlyFans-Chatter-Ghostwriter für eine Creator-Agentur.
Schreibe Antworten die wie eine echte, charismatische Creatorin klingen — NICHT wie ein Bot.

Stil: Fan-Sprache spiegeln, kurz (1–3 Sätze), 0–2 Emojis, persönlich und flirtig.
Keine Kundenservice-Phrasen. Klinge wie eine echte OF-Creatorin in DMs.

Antworte NUR mit genau 3 Varianten in diesem Format (kein JSON, kein Markdown):
1) erste Antwort
2) zweite Antwort
3) dritte Antwort`;

const CAPTION_SYSTEM = `Du schreibst OnlyFans-Captions für Creator-Posts.
Captions müssen authentisch, nicht generisch klingen — wie eine echte Creatorin die zu ihren Fans spricht.

Regeln:
- Passend zur Nische und Tonalität
- 1–3 Zeilen, post-ready
- Leichte Neugier/CTA ohne cringe
- Max. 2 Emojis
- Keine Hashtag-Spam-Wände

Antworte NUR als JSON: {"captions":["...","...","..."]}`;

const MASS_SYSTEM = `Du schreibst OnlyFans Mass-DM Texte für Creator-Kampagnen.
Ton: persönlich trotz Broadcast — Fans sollen sich angesprochen fühlen, nicht wie Newsletter.

Regeln:
- 2–4 Sätze, direkt und warm
- Zielgruppe und PPV-Preis einbeziehen wenn angegeben
- Kein "Liebe Community" oder Marketing-Sprech
- 0–2 Emojis

Antworte NUR als JSON: {"message":"..."}`;

function formatHistory(messages = []) {
  return messages
    .slice(-12)
    .map((m) => {
      const role = m.from === 'fan' ? 'Fan' : m.from === 'ai' ? 'Creator (AI-Entwurf)' : 'Creator';
      return `${role}: ${m.text}`;
    })
    .join('\n');
}

export async function generateChatReplies(body) {
  const {
    creatorName = 'Creator',
    creatorHandle = '',
    niche = 'Lifestyle',
    creatorNotes = '',
    fanName = 'Fan',
    fanHandle = '',
    spend = 0,
    channel = 'DM',
    messages = [],
  } = body ?? {};

  const lastFan = [...messages].reverse().find((m) => m.from === 'fan');
  if (!lastFan?.text?.trim()) {
    const err = new Error('Keine Fan-Nachricht im Chat — KI braucht Kontext');
    err.status = 400;
    throw err;
  }

  const spendTier = spend >= 500 ? 'whale' : spend >= 100 ? 'vip' : spend >= 20 ? 'regular' : 'new';

  const user = `Creator: ${creatorName} (${creatorHandle || 'kein Handle'})
Nische: ${niche}
Persona-Notizen: ${creatorNotes || '—'}
Fan: ${fanName} (${fanHandle || '—'})
Total Spend: €${spend} (Tier: ${spendTier})
Kanal: ${channel}

Chat-Verlauf:
${formatHistory(messages)}

Letzte Fan-Nachricht (darauf antworten):
"${lastFan.text}"`;

  const local = isLocalAiHost();
  const content = await fetchChatContent({
    system: local ? CHATTER_SYSTEM_LOCAL : CHATTER_SYSTEM,
    user,
    temperature: local ? 0.9 : 0.85,
    maxTokens: 1200,
    jsonMode: !local,
  });

  const suggestions = extractSuggestionsFromContent(content).map((s) =>
    s.replace(/^["'`]+|["'`]+$/g, '').trim(),
  );

  if (!suggestions.length) {
    throw new Error(
      local
        ? 'KI hat keine Vorschläge geliefert — in Open WebUI ein stärkeres Modell wählen (z. B. llama3.1, mistral)'
        : 'KI hat keine Vorschläge geliefert',
    );
  }
  return suggestions;
}

export async function generateCaptions(body) {
  const {
    creatorName = 'Creator',
    niche = 'Lifestyle',
    tone = 'flirty',
    description = '',
    contentType = 'Post',
    ppvPrice,
  } = body ?? {};

  if (!description?.trim()) {
    const err = new Error('Content-Beschreibung fehlt');
    err.status = 400;
    throw err;
  }

  const user = `Creator: ${creatorName}
Nische: ${niche}
Tonalität: ${tone}
Content-Typ: ${contentType}${ppvPrice ? ` · PPV €${ppvPrice}` : ''}
Beschreibung: ${description}`;

  const result = await chatCompletion({ system: CAPTION_SYSTEM, user, temperature: 0.9 });
  const captions = (result.captions ?? result.suggestions ?? [])
    .filter((s) => typeof s === 'string' && s.trim())
    .slice(0, 3);

  if (!captions.length) throw new Error('KI hat keine Captions geliefert');
  return captions;
}

const IMPROVE_CAPTION_SYSTEM = `Du verbesserst eine OnlyFans Post-Caption.
Mache sie authentischer, anziehender und post-ready — ohne generischen Marketing-Sprech.

Regeln:
- Behalte Kerninhalt und PPV-Preis wenn vorhanden
- 1–4 Zeilen, natürlicher Creator-Ton
- Leichte Neugier/CTA
- Max. 2 Emojis
- Gleiche Sprache wie Input

Antworte NUR als JSON: {"caption":"..."}`;

const ONBOARDING_SYSTEM = `Du erstellst OnlyFans Creator-Onboarding-Inhalte für eine Agentur.
Alles muss authentisch und nischen-spezifisch klingen — wie eine echte Top-Creatorin, nicht generisch.

Antworte NUR als JSON:
{
  "bio": "2-3 Sätze Profil-Bio für OnlyFans About",
  "welcomeDm": "Willkommens-DM für neue Subscriber (2-3 Sätze)",
  "personaNotes": "Interne Chatter-Notizen: Ton, Tabus, Upsell-Stil, Emoji-Nutzung (3-5 Bullet-Punkte als Text)"
}`;

const PPV_SYSTEM = `Du schreibst OnlyFans PPV/Bundle Upsell-Texte für DMs oder Posts.
Ton: persönlich, exklusiv, leicht geheimnisvoll — nie wie Werbebanner.

Regeln:
- 2-4 Sätze
- Preis und Bundle-Inhalt einbeziehen
- Dringlichkeit ohne Druck
- 0-2 Emojis

Antworte NUR als JSON: {"variants":["...","...","..."]}`;

const RENEWAL_SYSTEM = `Du schreibst OnlyFans Vertrags-Renewal / Re-Engagement Nachrichten von Creator an Fan oder intern an Manager.
Ton: warm, wertschätzend, leicht persönlich — keine Corporate-Sprache.

Antworte NUR als JSON:
{
  "fanMessage": "Nachricht an treue Fans / VIPs zum Vertragsende/Renewal (2-4 Sätze)",
  "managerBrief": "Kurze interne Talking-Points für Renewal-Gespräch (2-3 Sätze)"
}`;

export async function improveCaption(body) {
  const {
    creatorName = 'Creator',
    niche = 'Lifestyle',
    contentType = 'Post',
    title = '',
    draftCaption = '',
    ppvPrice,
  } = body ?? {};

  const base = draftCaption?.trim() || title?.trim();
  if (!base) {
    const err = new Error('Caption oder Titel fehlt');
    err.status = 400;
    throw err;
  }

  const user = `Creator: ${creatorName} · ${niche}
Typ: ${contentType}${ppvPrice ? ` · PPV €${ppvPrice}` : ''}
Titel: ${title || '—'}
Entwurf:
${base}`;

  const result = await chatCompletion({ system: IMPROVE_CAPTION_SYSTEM, user, temperature: 0.88, maxTokens: 350 });
  const caption = (result.caption ?? result.text ?? '').trim();
  if (!caption) throw new Error('KI hat keine Caption geliefert');
  return caption;
}

export async function generateOnboarding(body) {
  const {
    creatorName = 'Creator',
    handle = '',
    niche = 'Lifestyle',
    monthlyGoal = 0,
    tone = 'flirty',
  } = body ?? {};

  if (!creatorName?.trim()) {
    const err = new Error('Creator-Name fehlt');
    err.status = 400;
    throw err;
  }

  const user = `Creator: ${creatorName} (${handle || 'kein Handle'})
Nische: ${niche}
Monatsziel: €${monthlyGoal}
Gewünschte Tonalität: ${tone}`;

  const result = await chatCompletion({ system: ONBOARDING_SYSTEM, user, temperature: 0.9 });
  const bio = (result.bio ?? '').trim();
  const welcomeDm = (result.welcomeDm ?? result.welcome_dm ?? '').trim();
  const personaNotes = (result.personaNotes ?? result.persona_notes ?? '').trim();
  if (!bio && !welcomeDm && !personaNotes) throw new Error('KI hat kein Onboarding-Paket geliefert');
  return { bio, welcomeDm, personaNotes };
}

export async function generatePpvCopy(body) {
  const {
    creatorName = 'Creator',
    niche = 'Lifestyle',
    bundleName = '',
    itemCount = 1,
    price = 25,
    audience = 'vip',
    hint = '',
  } = body ?? {};

  const user = `Creator: ${creatorName} · ${niche}
Bundle: ${bundleName || 'Exclusive Drop'}
Inhalt: ${itemCount} Item(s)
Preis: €${price}
Zielgruppe: ${audience}
${hint ? `Zusatz: ${hint}` : ''}`;

  const result = await chatCompletion({ system: PPV_SYSTEM, user, temperature: 0.92 });
  const variants = (result.variants ?? result.suggestions ?? [])
    .filter((s) => typeof s === 'string' && s.trim())
    .slice(0, 3);
  if (!variants.length) throw new Error('KI hat keine PPV-Texte geliefert');
  return variants;
}

export async function generateRenewalMessage(body) {
  const {
    creatorName = 'Creator',
    niche = 'Lifestyle',
    contractEndsAt = '',
    daysLeft = 30,
    monthlyRevenue = 0,
    relationship = 'long-term',
  } = body ?? {};

  const user = `Creator: ${creatorName} · ${niche}
Vertrag endet: ${contractEndsAt || 'bald'}
Tage verbleibend: ${daysLeft}
Monats-Revenue: €${monthlyRevenue}
Beziehung: ${relationship}`;

  const result = await chatCompletion({ system: RENEWAL_SYSTEM, user, temperature: 0.85, maxTokens: 500 });
  const fanMessage = (result.fanMessage ?? result.fan_message ?? '').trim();
  const managerBrief = (result.managerBrief ?? result.manager_brief ?? '').trim();
  if (!fanMessage && !managerBrief) throw new Error('KI hat keine Renewal-Texte geliefert');
  return { fanMessage, managerBrief };
}

export async function generateMassMessage(body) {
  const {
    creatorName = 'Creator',
    niche = 'Lifestyle',
    campaignName = '',
    audience = 'vip',
    ppvPrice,
    hint = '',
  } = body ?? {};

  const user = `Creator: ${creatorName} · ${niche}
Kampagne: ${campaignName || 'Drop'}
Zielgruppe: ${audience}
${ppvPrice ? `PPV-Preis: €${ppvPrice}` : ''}
${hint ? `Zusatz: ${hint}` : ''}`;

  const result = await chatCompletion({ system: MASS_SYSTEM, user, temperature: 0.88, maxTokens: 400 });
  const message = (result.message ?? result.text ?? '').trim();
  if (!message) throw new Error('KI hat keinen Mass-DM Text geliefert');
  return message;
}

const SCOUT_QUERY_SYSTEM = `Du bist ein Talent-Scout für eine OnlyFans-Agency (privater Gebrauch).
Erzeuge präzise Websuch-Anfragen um Creatorinnen auf Instagram, TikTok, Twitter, Reddit oder Link-in-Bio-Seiten zu finden.
Antworte NUR als JSON: {"queries":["...","..."]}
5 Suchanfragen max. Mix aus Deutsch/Englisch. Ziel: echte Profile finden, keine generischen Artikel.`;

const SCOUT_SCORE_SYSTEM = `Du bewertest Social-Media-Profile für OnlyFans-Agentur-Recruiting (0-100 Score).
Kriterien: Nische-Fit, Wachstumspotenzial (kleinere Creator oft besser), Content-Signale, Monetarisierungs-Potenzial, Professionalität.
Antworte NUR als JSON:
{"leads":[{"profileUrl":"...","score":0-100,"scoreReason":"kurz","niche":"...","region":"...","aiSummary":"2 Sätze","signals":["..."]}]}`;

const SCOUT_OUTREACH_SYSTEM = `Du schreibst eine erste Outreach-Nachricht (DM/Email) von einer OnlyFans-Agency an eine Creatorin.
Stil: professionell, warm, nicht aufdringlich, personalisiert. Deutsch. Keine falschen Versprechen. 3-5 Sätze.
Antworte NUR als JSON: {"message":"..."}`;

function parseQueriesFromContent(content) {
  try {
    const parsed = parseJsonContent(content);
    const q = parsed.queries ?? parsed.searchQueries ?? [];
    if (Array.isArray(q)) {
      return q.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).slice(0, 6);
    }
  } catch {
    // fall through
  }
  const lines = [];
  for (const line of String(content).split('\n')) {
    const m = line.match(/^\s*(?:\d+[\).\]:\-]|[-*•])\s+(.+?)\s*$/u);
    if (m?.[1]?.trim()) lines.push(m[1].trim());
  }
  return lines.slice(0, 6);
}

function buildFallbackQueries(criteria) {
  const { niche = 'Lifestyle', region = '', ofFilter = 'any', platforms = [] } = criteria;
  const plat = platforms.length ? platforms.join(' OR ') : 'instagram OR tiktok';
  const ofHint =
    ofFilter === 'none'
      ? 'ohne onlyfans "link in bio"'
      : ofFilter === 'has'
        ? 'onlyfans'
        : '';
  const regionHint = region ? `${region} ` : '';
  return [
    `${regionHint}${niche} creator ${plat} ${ofHint} followers`.trim(),
    `site:instagram.com ${niche} ${regionHint}${ofFilter === 'none' ? '-onlyfans' : ''}`.trim(),
    `site:tiktok.com ${niche} creator ${regionHint}`.trim(),
    `${niche} influencer linktree ${regionHint}`.trim(),
    `reddit ${niche} creator self promotion ${regionHint}`.trim(),
  ].filter(Boolean);
}

export async function generateScoutQueries(criteria) {
  const {
    brief = '',
    niche = 'Lifestyle',
    region = '',
    minFollowers,
    maxFollowers,
    ofFilter = 'any',
    platforms = [],
  } = criteria;

  const user = `Brief: ${brief || 'Finde passende Creatorinnen'}
Nische: ${niche}
Region: ${region || 'egal'}
Follower: ${minFollowers ?? '?'} - ${maxFollowers ?? '?'}
OnlyFans: ${ofFilter === 'none' ? 'noch KEIN OF' : ofFilter === 'has' ? 'bereits auf OF' : 'egal'}
Plattformen: ${platforms.join(', ') || 'instagram, tiktok'}`;

  try {
    const content = await fetchChatContent({
      system: SCOUT_QUERY_SYSTEM,
      user,
      temperature: 0.7,
      maxTokens: 600,
      jsonMode: !isLocalAiHost(),
    });
    const queries = parseQueriesFromContent(content);
    if (queries.length) return queries;
  } catch (err) {
    console.warn('Scout query AI:', err.message);
  }
  return buildFallbackQueries(criteria);
}

function heuristicScore(lead, criteria) {
  let score = 45;
  const reasons = [];

  if (lead.hasOnlyfans && criteria.ofFilter === 'none') {
    score -= 25;
    reasons.push('Hat bereits OF');
  } else if (!lead.hasOnlyfans && criteria.ofFilter === 'none') {
    score += 15;
    reasons.push('Noch kein OF — Upside');
  }

  if (lead.followers != null) {
    const min = criteria.minFollowers ?? 0;
    const max = criteria.maxFollowers ?? 1_000_000;
    if (lead.followers >= min && lead.followers <= max) {
      score += 20;
      reasons.push('Follower im Zielbereich');
    } else if (lead.followers < min) {
      score += 5;
      reasons.push('Noch klein — Micro-Potenzial');
    }
  } else {
    score += 5;
    reasons.push('Follower unbekannt');
  }

  if ((lead.signals?.length ?? 0) >= 2) {
    score += 10;
    reasons.push('Mehrere positive Signale');
  }

  if (lead.platform === 'instagram' || lead.platform === 'tiktok') {
    score += 8;
    reasons.push('Starke Plattform für OF-Funnel');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    scoreReason: reasons.join(' · ') || 'Heuristik-Bewertung',
    aiSummary: lead.bio?.slice(0, 200) || '',
    niche: criteria.niche ?? lead.niche,
    region: criteria.region ?? lead.region,
    signals: lead.signals ?? [],
  };
}

export async function scoreScoutLeads(leads, criteria) {
  if (!leads.length) return [];

  const compact = leads.map((l) => ({
    profileUrl: l.profileUrl,
    platform: l.platform,
    displayName: l.displayName,
    handle: l.handle,
    bio: (l.bio ?? '').slice(0, 280),
    followers: l.followers,
    hasOnlyfans: l.hasOnlyfans,
    signals: l.signals ?? [],
  }));

  const user = `Kriterien: ${JSON.stringify({
    niche: criteria.niche,
    region: criteria.region,
    minFollowers: criteria.minFollowers,
    maxFollowers: criteria.maxFollowers,
    ofFilter: criteria.ofFilter,
    brief: criteria.brief,
  })}

Profile:
${JSON.stringify(compact, null, 0)}`;

  try {
    const content = await fetchChatContent({
      system: SCOUT_SCORE_SYSTEM,
      user,
      temperature: 0.5,
      maxTokens: 2000,
      jsonMode: !isLocalAiHost(),
    });
    const parsed = parseJsonContent(content);
    const scored = parsed.leads ?? parsed.results ?? [];
    if (Array.isArray(scored) && scored.length) {
      const byUrl = new Map(scored.map((s) => [s.profileUrl, s]));
      return leads.map((lead) => {
        const ai = byUrl.get(lead.profileUrl);
        if (!ai) return { ...lead, ...heuristicScore(lead, criteria) };
        return {
          ...lead,
          score: Math.min(100, Math.max(0, Number(ai.score) || 0)),
          scoreReason: ai.scoreReason || ai.reason || '',
          aiSummary: ai.aiSummary || ai.summary || '',
          niche: ai.niche || lead.niche || criteria.niche,
          region: ai.region || lead.region || criteria.region,
          signals: [...new Set([...(lead.signals ?? []), ...(ai.signals ?? [])])],
        };
      });
    }
  } catch (err) {
    console.warn('Scout score AI:', err.message);
  }

  return leads.map((lead) => ({ ...lead, ...heuristicScore(lead, criteria) }));
}

export async function generateScoutOutreach(lead, tone = 'professional') {
  const user = `Creator: ${lead.displayName} (${lead.handle ?? 'unbekannt'})
Plattform: ${lead.platform}
Nische: ${lead.niche ?? 'unbekannt'}
Bio: ${lead.bio?.slice(0, 400) ?? ''}
Score-Gründe: ${lead.scoreReason}
Signale: ${(lead.signals ?? []).join(', ')}
Ton: ${tone}`;

  try {
    const content = await fetchChatContent({
      system: SCOUT_OUTREACH_SYSTEM,
      user,
      temperature: 0.82,
      maxTokens: 500,
      jsonMode: !isLocalAiHost(),
    });
    const parsed = parseJsonContent(content);
    const msg = (parsed.message ?? parsed.text ?? '').trim();
    if (msg) return msg;
  } catch (err) {
    console.warn('Scout outreach AI:', err.message);
  }

  return `Hey ${lead.displayName?.split(' ')[0] ?? ''}! 👋 Ich bin von einer OnlyFans-Agentur und finde deinen ${lead.niche ?? 'Content'} echt stark. Wir helfen Creatorinnen beim Setup, Marketing und Growth — ohne dass du dich um alles kümmern musst. Hättest du Lust auf ein kurzes unverbindliches Kennenlernen?`;
}