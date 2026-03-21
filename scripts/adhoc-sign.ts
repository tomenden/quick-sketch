/// Strip provenance/quarantine xattrs from the self-extracting app bundle.
/// Without this, macOS silently deletes executables when users drag-install
/// from the DMG. Runs as an Electrobun postWrap hook.

import { execSync } from "node:child_process";

const appPath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;
if (!appPath) {
  console.error("ELECTROBUN_WRAPPER_BUNDLE_PATH not set");
  process.exit(1);
}

console.log(`Stripping extended attributes from ${appPath}...`);
execSync(`xattr -cr "${appPath}"`, { stdio: "inherit" });
console.log("Done.");
