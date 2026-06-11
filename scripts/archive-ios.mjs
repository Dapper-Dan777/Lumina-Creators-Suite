#!/usr/bin/env node
/**
 * Archive + Upload zu App Store Connect (TestFlight).
 * Voraussetzung: Apple Developer Account, Xcode, Signing in Xcode konfiguriert.
 *
 * Usage: npm run mobile:archive
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const project = join(root, "ios/App/App.xcodeproj");
const scheme = "App";
const archivePath = join(root, "build/LuminaManage.xcarchive");
const exportPath = join(root, "build/export");
const exportPlist = join(root, "ios/ExportOptions.plist");

if (!existsSync(project)) {
  console.error("❌ ios/App/App.xcodeproj fehlt — zuerst: npm run mobile:prepare:release");
  process.exit(1);
}

console.log("\n📦 Archive erstellen…\n");
execSync(
  `xcodebuild -project "${project}" -scheme "${scheme}" -configuration Release -archivePath "${archivePath}" archive CODE_SIGN_STYLE=Automatic`,
  { stdio: "inherit" },
);

console.log("\n🚀 Upload zu App Store Connect…\n");
execSync(
  `xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${exportPath}" -exportOptionsPlist "${exportPlist}"`,
  { stdio: "inherit" },
);

console.log("\n✅ Fertig. Prüfe TestFlight in App Store Connect (https://appstoreconnect.apple.com)\n");