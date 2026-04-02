/// Developer ID sign the Electrobun .app bundle.
/// Runs as an Electrobun postWrap hook.
/// Signs binaries inside-out: dylibs → executables → bundle.

import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const appPath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;
if (!appPath) {
  console.error("ELECTROBUN_WRAPPER_BUNDLE_PATH not set");
  process.exit(1);
}

// Developer ID Application certificate must be in the macOS Keychain.
// Obtain from: developer.apple.com → Certificates, Identifiers & Profiles
const IDENTITY = "Developer ID Application: Tom Enden (Q3VTL5U3XB)";
const ENTITLEMENTS = join(import.meta.dir, "../App/entitlements.plist");

function sign(target: string) {
  console.log(`Signing: ${target}`);
  execSync(
    `codesign --force --options runtime --timestamp --entitlements "${ENTITLEMENTS}" --sign "${IDENTITY}" "${target}"`,
    { stdio: "inherit" }
  );
}

// Walk Contents/ recursively, signing all Mach-O binaries inside-out.
// Skip Contents/Resources — those are JS/HTML assets, not native binaries.
// Sign order: process children before parents so nested code is sealed first.
function collectSignables(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (full === `${contentsDir}/Resources`) continue; // skip JS/HTML assets
      results.push(...collectSignables(full));
      // Sign bundle-like directories (.app, .framework, .xpc) after their contents
      if (entry.endsWith(".app") || entry.endsWith(".framework") || entry.endsWith(".xpc")) {
        results.push(full);
      }
    } else if (stat.isFile() && (extname(entry) === ".dylib" || (stat.mode & 0o111) !== 0)) {
      results.push(full);
    }
  }
  return results;
}

const contentsDir = `${appPath}/Contents`;
const signables = collectSignables(contentsDir);

for (const target of signables) {
  sign(target);
}

// Sign the bundle itself last
sign(appPath);

console.log("Signing complete.");
