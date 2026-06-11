import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = "dist";
const dest = ".output/public";

if (!existsSync(src) || !existsSync(dest)) {
  console.warn("[pwa] skip copy — dist or .output/public missing");
  process.exit(0);
}

for (const file of readdirSync(src)) {
  if (file === "sw.js" || file.startsWith("workbox-")) {
    cpSync(join(src, file), join(dest, file));
    console.log(`[pwa] copied ${file} → .output/public/`);
  }
}