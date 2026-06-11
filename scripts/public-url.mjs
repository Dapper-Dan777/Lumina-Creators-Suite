#!/usr/bin/env node
/**
 * Lumina öffentlich machen — Docker + Cloudflare Tunnel (HTTPS, kostenlos).
 *
 *   npm run public
 *   npm run tunnel   (alias)
 *
 * Terminal offen lassen! URL in .env:
 *   CAPACITOR_SERVER_URL=https://....trycloudflare.com
 */
import { spawn, execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    console.log("\n✓ Docker läuft bereits\n");
    return;
  }

  console.log("\n🐳 Starte Docker (Web + API)…\n");
  try {
    run("docker compose up -d");
    if (await waitForApp(45_000)) return;
  } catch {
    // build on first run
  }

  console.log("🔨 Erster Start — baue Docker-Images (einmalig)…\n");
  run("docker compose up -d --build");
}

function saveTunnelUrl(url) {
  writeFileSync(".tunnel-url", `${url}\n`, "utf8");

  if (!existsSync(".env")) return;
  const env = readFileSync(".env", "utf8");
  const line = `CAPACITOR_SERVER_URL=${url}`;
  if (/^CAPACITOR_SERVER_URL=/m.test(env)) {
    writeFileSync(".env", env.replace(/^CAPACITOR_SERVER_URL=.*$/m, line), "utf8");
  } else {
    writeFileSync(".env", `${env.trimEnd()}\n${line}\n`, "utf8");
  }
  console.log("✓ CAPACITOR_SERVER_URL in .env gespeichert\n");
}

async function main() {
  const cloudflared = findCloudflared();
  if (!cloudflared) {
    console.error("\n❌ cloudflared konnte nicht geladen werden.\n");
    process.exit(1);
  }

  console.log("\n☁️  Lumina — Cloudflare Tunnel\n");

  await ensureDocker();

  console.log("⏳ Warte auf API…");
  const ready = await waitForApp();
  if (!ready) {
    console.error(`\n❌ Keine Antwort von ${LOCAL}/api/creators\n`);
    console.error("   Tipp: docker compose logs api\n");
    process.exit(1);
  }
  console.log(`✓ API OK: ${LOCAL}/api/creators\n`);

  console.log("🌐 Starte HTTPS-Tunnel…\n");

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
      saveTunnelUrl(tunnelUrl);
      console.log("\n" + "=".repeat(60));
      console.log("\n✅ Deine öffentliche URL:\n");
      console.log(`   ${tunnelUrl}\n`);
      console.log("Test:");
      console.log(`   ${tunnelUrl}/api/creators\n`);
      console.log("TestFlight:");
      console.log("   npm run mobile:prepare:release\n");
      console.log("⚠️  Terminal offen lassen — Tunnel stoppt bei Ctrl+C\n");
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