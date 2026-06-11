#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, VERCEL: "1" },
  });
}

run("npm run db:generate");
run("npm run build");