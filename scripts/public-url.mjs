#!/usr/bin/env node
/**
 * Öffentliche HTTPS-URL ohne Vercel — Docker + Cloudflare Tunnel (kostenlos).
 *
 * Nutzung:
 *   npm run public
 *
 * Die URL in .env eintragen:
 *   CAPACITOR_SERVER_URL=https://....trycloudflare.com
 */
import { spawn, execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledCloudflared = path.join(__dirname, "cloudflared");

const PORT = 8081;
const LOCAL = `http://127.0.0.1:${PORT}`;

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

function ensureDocker() {
  if (!existsSync("docker-compose.yml")) {
    console.error("docker-compose.yml nicht gefunden.");
    process.exit(1);
  }
  console.log("\n🐳 Starte Docker (Web + API + SQLite)…\n");
  run("docker compose up -d --build");
}

async function main() {
  const cloudflared = findCloudflared();
  if (!cloudflared) {
    console.error("\n❌ cloudflared fehlt. Installieren:\n   brew install cloudflared\n");
    process.exit(1);
  }

  ensureDocker();

  console.log("⏳ Warte auf App…");
  const ready = await waitForApp();
  if (!ready) {
    console.error(`\n❌ App antwortet nicht auf ${LOCAL}/api/creators\n`);
    process.exit(1);
  }
  console.log(`✓ Lokal OK: ${LOCAL}/api/creators\n`);

  console.log("🌐 Starte kostenlosen HTTPS-Tunnel (Cloudflare)…\n");

  const child = spawn(cloudflared, ["tunnel", "--url", LOCAL], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let tunnelUrl = "";

  const onData = (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      tunnelUrl = match[0];
      console.log("\n" + "=".repeat(60));
      console.log("\n✅ Öffentliche URL (HTTPS, kostenlos):\n");
      console.log(`   ${tunnelUrl}\n`);
      console.log("In .env eintragen:\n");
      console.log(`   CAPACITOR_SERVER_URL=${tunnelUrl}\n`);
      console.log("Test:");
      console.log(`   ${tunnelUrl}/api/creators`);
      console.log(`   ${tunnelUrl}/api/setup-status\n`);
      console.log("Hinweis: URL ändert sich nach jedem Neustart des Tunnels.");
      console.log("Für feste URL: DuckDNS oder eu.org (siehe README_SELFHOST.md)\n");
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