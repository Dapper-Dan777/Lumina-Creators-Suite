# Lumina Manage — Local self-hosting (personal)

This adds a lightweight Docker Compose setup and an API stub so you can run the app on your Mac and access from your iPhone.

Overview
- `web` — the Vite frontend (served with `npm run preview`).
- `api` — small Express server for OnlyFans adapters and webhook endpoints.
- `db` — Postgres (optional), data persisted to a Docker volume.
- `redis` — optional queue/cache.

Quick start (recommended)
1. Copy `.env.example` to `.env` and set values (DO NOT commit your secrets):

```bash
cp .env.example .env
# Edit .env and set real values
```

2. Build & start with Docker Compose (production):

```bash
npm run docker:up
# or: docker compose up --build -d
```

3. **Develop in Docker** (live reload, code mounted from host):

```bash
npm run docker:dev
```

4. Open on your Mac: http://localhost:8081/
   On your iPhone (same Wi‑Fi): http://<MAC_IP>:8081/ (find IP: `ipconfig getifaddr en0`).

Optional: HTTPS / remote access
- For easy secure remote access from your iPhone or anywhere, install ngrok and run:

```bash
ngrok http 8081
```

- Open the generated HTTPS URL on your iPhone. API requests are proxied automatically from the frontend to the backend at `/api`.

iPhone als App (2 Wege)

**Option A — PWA (schnell, kein App Store)**

1. App deployen oder per ngrok HTTPS-URL öffnen (iOS braucht HTTPS für „Zum Home-Bildschirm“).
2. In **Safari** auf dem iPhone die URL öffnen.
3. **Teilen** → **Zum Home-Bildschirm** → **Hinzufügen**.
4. Lumina startet dann im Vollbild wie eine native App (eigenes Icon, keine Safari-Leiste).

**Option B — Native iOS-App (Xcode + TestFlight)**

Die App ist ein Capacitor-WebView, der deinen **deployed HTTPS-Server** lädt. Backend (Docker/API) muss öffentlich erreichbar sein.

### Voraussetzungen

- Mac mit **Xcode** (App Store)
- **Apple Developer Program** (~99 €/Jahr) — [developer.apple.com](https://developer.apple.com)
- Öffentliche **HTTPS-URL** (VPS, Railway, Fly.io, oder ngrok für Tests)
- App-ID `com.lumina.manage` in App Store Connect anlegen

### 1. Server deployen & URL setzen

```bash
cp .env.example .env
# In .env — PFLICHT für TestFlight:
CAPACITOR_SERVER_URL=https://deine-domain.com
```

Server muss erreichbar sein unter `https://deine-domain.com` (Web + `/api`).

### 2. iOS-Projekt vorbereiten

```bash
npm install
npm run mobile:prepare:release   # Icons, Web-Build, cap sync
npm run mobile:ios:release       # öffnet Xcode
```

Dev auf echtem iPhone im WLAN (HTTP erlaubt):

```bash
# .env: CAPACITOR_SERVER_URL=http://192.168.x.x:8081
npm run mobile:ios:dev
```

### 3. Signing in Xcode

1. Projekt **App** → Target **App** → **Signing & Capabilities**
2. **Team** = dein Apple Developer Team
3. **Bundle Identifier** = `com.lumina.manage` (muss in App Store Connect existieren)
4. **Automatically manage signing** ✓

### 4. Auf dem iPhone testen

- iPhone per USB verbinden
- Oben Gerät wählen (nicht Simulator)
- **Product → Run** (▶) oder `Cmd+R`

### 5. TestFlight hochladen

**In Xcode (empfohlen):**

1. Zielgerät: **Any iOS Device (arm64)**
2. **Product → Archive**
3. Im Organizer: **Distribute App** → **App Store Connect** → **Upload**
4. Nach Verarbeitung (~5–15 Min): [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight** → Tester einladen

**Per Terminal (optional):**

```bash
npm run mobile:archive
```

### 6. Jeder neue Upload

- **Build-Nummer erhöhen** in Xcode: Target App → General → **Build** (`CURRENT_PROJECT_VERSION`, z. B. 1 → 2)
- Optional **Version** (`MARKETING_VERSION`, z. B. 1.0 → 1.1)
- Dann erneut Archive → Upload

### Checkliste TestFlight

| Schritt | Status |
|--------|--------|
| `CAPACITOR_SERVER_URL` = HTTPS (kein localhost) | ☐ |
| Server online, API unter `/api` erreichbar | ☐ |
| Apple Developer Account aktiv | ☐ |
| App in App Store Connect mit Bundle ID `com.lumina.manage` | ☐ |
| Signing Team in Xcode gesetzt | ☐ |
| Export Compliance: „Nein“ (ITSAppUsesNonExemptEncryption=false) | ✓ vorkonfiguriert |

n8n integration (separate Docker instance)
- n8n is **not** bundled in the app. It runs as its own Docker container and is only used when reachable.
- Start n8n: `docker compose -f docker-compose.n8n.yml up -d`
- Start the app: `docker compose up --build -d`
- Set `N8N_BASE_URL` in `.env`:
  - Local dev: `http://localhost:5678`
  - App in Docker, n8n on host: `http://host.docker.internal:5678`
  - Both containers on shared network: `http://lumina-n8n:5678` (run `docker network connect lumina-network <api-container>` after starting both)
- Optionally set `N8N_API_KEY` for authenticated API proxy requests.
- The `Automationen` page embeds n8n directly via iframe (`N8N_PUBLIC_URL`, default `http://localhost:5678`). The API server uses `N8N_BASE_URL` only for health checks and future workflow calls.
- Check connection: `GET /api/n8n/status`

OnlyFans integration notes
- The repository includes `server/adapters/onlyfans.js` as a stub. Do NOT put credentials into client code.
- Provide credentials in `.env` and keep the private key out of the repository.
- Use `ONLYFANS_API_KEY` for your external onlyfansapi token.
- Set `ONLYFANS_BASE_URL=https://api.onlyfansapi.com/v2` for onlyfansapi.
- If your provider requires a different header, optionally override `ONLYFANS_API_KEY_HEADER` and `ONLYFANS_API_KEY_PREFIX`.
- If you instead have a direct OnlyFans OAuth flow, you can still use `ONLYFANS_ACCESS_TOKEN`, or `ONLYFANS_CLIENT_ID` / `ONLYFANS_CLIENT_SECRET`.

Security & privacy
- Secrets live in `.env` and should never be committed.
- For long-term hosting consider using a VPS and managed DB + TLS.

If you want, I can now:
- Implement a working OnlyFans adapter for the auth method you have (you provide which type), or
- Swap Postgres for SQLite for a simpler local-only setup.

Tell me which of the two you'd like next: `implement-adapter` or `use-sqlite`.
