import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const src = join(root, "public/icons/icon-512.png");
const appIconDir = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const splashDir = join(root, "ios/App/App/Assets.xcassets/Splash.imageset");

if (!existsSync(src)) {
  console.error("[ios-icons] public/icons/icon-512.png fehlt");
  process.exit(1);
}

mkdirSync(appIconDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

const appIcon = join(appIconDir, "AppIcon-512@2x.png");
execSync(`sips -z 1024 1024 "${src}" --out "${appIcon}"`, { stdio: "inherit" });

for (const [name, size] of [
  ["splash-2732x2732-2.png", 910],
  ["splash-2732x2732-1.png", 1820],
  ["splash-2732x2732.png", 2732],
]) {
  execSync(`sips -z ${size} ${size} "${src}" --out "${join(splashDir, name)}"`, { stdio: "inherit" });
}

console.log("[ios-icons] App Icon (1024) + Splash aktualisiert");