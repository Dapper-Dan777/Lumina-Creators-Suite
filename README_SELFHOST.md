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

2. Build & start with Docker Compose:

```bash
docker compose up --build -d
```

3. Open on your Mac: http://localhost:8081/
   On your iPhone (same Wi‑Fi): http://<MAC_IP>:8081/ (find IP: `ipconfig getifaddr en0`).

Optional: HTTPS / remote access
- For easy secure remote access from your iPhone or anywhere, install ngrok and run:

```bash
ngrok http 8081
```

- Open the generated HTTPS URL on your iPhone. API requests are proxied automatically from the frontend to the backend at `/api`.

n8n integration (self-hosted)
- If you run a self-hosted n8n (Docker) instance, set `N8N_BASE_URL` in your `.env` to the instance URL (for example `http://n8n:5678` or `http://localhost:5678`).
- Optionally set `N8N_API_KEY` in `.env` to enable the server proxy to inject the `X-N8N-API-KEY` header for authenticated requests.
- The app exposes the embedded n8n UI at `/n8n/` and the new app page `Automationen` loads it in an iframe. The server rewrites HTML asset paths so the iframe can load assets via the proxy.

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
