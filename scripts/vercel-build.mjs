#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, VERCEL: "1" },
  });
}

run("npm run db:generate");

if (process.env.DATABASE_URL) {
  run("npm run db:migrate");
} else {
  console.warn(
    "\n⚠ DATABASE_URL fehlt auf Vercel — DB-Migration übersprungen. API antwortet erst nach Setzen der Variable.\n",
  );
}

run("npm run build");