#!/usr/bin/env node
/**
 * Öffentliche URL ohne Vercel — Docker + DuckDNS + Cloudflare HTTPS-Tunnel.
 *
 *   npm run public
 *
 * .env (optional DuckDNS):
 *   DUCKDNS_DOMAIN=lumina
 *   DUCKDNS_TOKEN=dein-token
 */
import { spawn, execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledCloudflared = path.join(__dirname, "cloudflared");
const PORT = 8081;
const LOCAL = `http://127.0.0.1:${PORT}`;

function loadEnv() {
  const env = { ...process.env };
  if (!existsSync(".env")) return env;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}

function downloadCloudflared() {
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${arch}.tgz`;
  const tgz = path.join(__dirname, ".cloudflared.tgz");
  console.log("⬇️  Lade cloudflared…");
  execSync(`curl -fsSL "${url}" -o "${tgz}"`, { stdio: "inherit" });
  execSync(`tar -xzf "${tgz}" -C "${__dirname}" cloudflared`, { stdio: "inherit" });
  chmodSync(bundledCloudflared, 0o755);
  execSync(`rm -f "${tgz}"`);
  return bundledCloudflared;
}

function findCloudflared() {
  if (existsSync(bundledCloudflared)) return bundledCloudflared;
  try {
    return execSync("which cloudflared", { encoding: "utf8" }).trim();
  } catch {
    try {
      mkdirSync(__dirname, { recursive: true });
      return downloadCloudflared();
    } catch {
      return null;
    }
  }
}

async function waitForApp(maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${LOCAL}/api/creators`);
      if (res.ok) return true;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function isDockerHealthy() {
  try {
    const res = await fetch(`${LOCAL}/api/creators`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureDocker() {
  if (!existsSync("docker-compose.yml")) {
    console.error("docker-compose.yml nicht gefunden.");
    process.exit(1);
  }

  if (await isDockerHealthy()) {
    console.log("\n✓ Docker läuft bereits — kein Rebuild nötig\n");
    return;
  }

  console.log("\n🐳 Starte Docker (Web + API)…\n");
  try {
    run("docker compose up -d");
    if (await waitForApp(45_000)) return;
  } catch {
    // containers missing — build images
  }

  console.log("🔨 Erster Start — baue Docker-Images (einmalig)…\n");
  run("docker compose up -d --build");
}

async function updateDuckDns(env) {
  const domain = env.DUCKDNS_DOMAIN?.trim();
  const token = env.DUCKDNS_TOKEN?.trim();
  if (!domain || !token) {
    console.log("💡 DuckDNS (optional): In .env eintragen:\n");
    console.log("   DUCKDNS_DOMAIN=lumina");
    console.log("   DUCKDNS_TOKEN=dein-token-von-duckdns.org\n");
    return null;
  }

  const res = await fetch(
    `https://www.duckdns.org/update?domains=${encodeURIComponent(domain)}&token=${encodeURIComponent(token)}&ip=`,
  );
  const text = (await res.text()).trim();
  if (text !== "OK") {
    console.warn(`⚠ DuckDNS Update fehlgeschlagen: ${text}\n`);
    return null;
  }

  const duckUrl = `http://${domain}.duckdns.org:${PORT}`;
  console.log(`✓ DuckDNS aktualisiert: ${duckUrl}`);
  console.log("  Router: Port 8081 auf deinen Mac weiterleiten (Fritzbox/Portfreigabe)\n");
  return duckUrl;
}

async function main() {
  const env = loadEnv();
  const cloudflared = findCloudflared();
  if (!cloudflared) {
    console.error("\n❌ cloudflared konnte nicht geladen werden.\n");
    process.exit(1);
  }

  await ensureDocker();

  console.log("⏳ Warte auf App…");
  const ready = await waitForApp();
  if (!ready) {
    console.error(`\n❌ App antwortet nicht auf ${LOCAL}/api/creators\n`);
    process.exit(1);
  }
  console.log(`✓ Lokal OK: ${LOCAL}/api/creators\n`);

  await updateDuckDns(env);

  console.log("🌐 Starte HTTPS-Tunnel (Cloudflare, kostenlos)…\n");
  console.log("   → Für TestFlight/iPhone brauchst du HTTPS (DuckDNS allein reicht nicht)\n");

  const child = spawn(cloudflared, ["tunnel", "--url", LOCAL], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let tunnelUrl = "";

  const onData = (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      console.log("\n" + "=".repeat(60));
      console.log("\n✅ HTTPS-URL für TestFlight / iPhone:\n");
      console.log(`   ${tunnelUrl}\n`);
      console.log("In .env eintragen:\n");
      console.log(`   CAPACITOR_SERVER_URL=${tunnelUrl}\n`);
      console.log("Test im Browser:");
      console.log(`   ${tunnelUrl}/api/creators\n`);
      console.log("Tunnel-Fenster offen lassen! Beenden mit Ctrl+C.\n");
      console.log("=".repeat(60) + "\n");
    }
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  child.on("exit", (code) => {
    if (code !== 0 && !tunnelUrl) {
      console.error(`\nTunnel beendet (Code ${code})\n`);
      process.exit(code ?? 1);
    }
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});