#!/usr/bin/env node
/**
 * Bereitet das iOS-Projekt für Xcode / TestFlight vor.
 *
 * Dev:   node scripts/prepare-ios.mjs --dev
 * Release/TestFlight: node scripts/prepare-ios.mjs --release
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const isRelease = args.has("--release");
const isDev = args.has("--dev") || !isRelease;
const skipBuild = args.has("--skip-build");

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

function isLocalUrl(url) {
  return /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./i.test(url);
}

const env = loadEnv();
let serverUrl = env.CAPACITOR_SERVER_URL?.trim() ?? "";

if (isRelease) {
  if (!serverUrl) {
    console.error("\n❌ TestFlight: CAPACITOR_SERVER_URL in .env setzen (öffentliche HTTPS-URL)\n");
    console.error("   Beispiel: CAPACITOR_SERVER_URL=https://lumina.deine-domain.com\n");
    process.exit(1);
  }
  if (!serverUrl.startsWith("https://")) {
    console.error("\n❌ TestFlight erfordert HTTPS in CAPACITOR_SERVER_URL\n");
    process.exit(1);
  }
  if (isLocalUrl(serverUrl)) {
    console.error("\n❌ TestFlight: keine lokale IP/localhost als Server-URL\n");
    process.exit(1);
  }
  console.log(`\n✓ Release-Modus → ${serverUrl}\n`);
} else {
  if (!serverUrl) {
    serverUrl = "http://127.0.0.1:8081";
    console.log(`\n⚠ Dev-Modus: CAPACITOR_SERVER_URL nicht gesetzt → ${serverUrl}\n`);
  } else {
    console.log(`\n✓ Dev-Modus → ${serverUrl}\n`);
  }
}

execSync("node scripts/ios-icons.mjs", { stdio: "inherit" });

if (!skipBuild) {
  execSync("npm run build", { stdio: "inherit", env: { ...process.env, CAPACITOR_SERVER_URL: serverUrl } });
}

execSync("npx cap sync ios", {
  stdio: "inherit",
  env: { ...process.env, CAPACITOR_SERVER_URL: serverUrl },
});

console.log("\n✅ iOS-Projekt bereit. Nächster Schritt:");
console.log("   npx cap open ios");
console.log("   oder: npm run mobile:ios:release\n");