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

const IDENTITY = "Developer ID Application: Tom Enden (Q3VTL5U3XB)";
const ENTITLEMENTS = join(import.meta.dir, "../App/entitlements.plist");

function sign(target: string) {
  console.log(`Signing: ${target}`);
  execSync(
    `codesign --force --options runtime --entitlements "${ENTITLEMENTS}" --sign "${IDENTITY}" "${target}"`,
    { stdio: "inherit" }
  );
}

const contentsDir = `${appPath}/Contents/MacOS`;

// Sign dylibs first
for (const entry of readdirSync(contentsDir)) {
  if (extname(entry) === ".dylib") {
    sign(join(contentsDir, entry));
  }
}

// Sign executables (non-dylib files that are executable)
for (const entry of readdirSync(contentsDir)) {
  if (extname(entry) === ".dylib") continue;
  const full = join(contentsDir, entry);
  const stat = statSync(full);
  if (stat.isFile() && (stat.mode & 0o111) !== 0) {
    sign(full);
  }
}

// Sign the bundle itself (must be last)
sign(appPath);

console.log("Signing complete.");
