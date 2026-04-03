#!/usr/bin/env bun
/// Release orchestration script.
/// Usage: bun scripts/release.ts [patch|minor|major]
/// Prerequisites: Developer ID cert in Keychain, notarytool profile "quick-sketch-notary",
/// gh CLI authenticated, homebrew-tap repo at ../homebrew-tap

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = join(import.meta.dir, "..");
const ARTIFACTS_DIR = join(ROOT, "artifacts");
const IDENTITY = "Developer ID Application: Tom Enden (Q3VTL5U3XB)";
const TEAM_ID = "Q3VTL5U3XB";
const NOTARY_PROFILE = "quick-sketch-notary";

// Electrobun's native codesign pass reads these env vars.
process.env.ELECTROBUN_DEVELOPER_ID = IDENTITY;
process.env.ELECTROBUN_TEAMID = TEAM_ID;
const GITHUB_REPO = "tomenden/quick-sketch";
const CASK_PATH = join(ROOT, "../homebrew-tap/Casks/quick-sketch.rb");
const HOMEBREW_TAP_DIR = join(ROOT, "../homebrew-tap");

function run(cmd: string, opts: { cwd?: string } = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: opts.cwd ?? ROOT });
}

function runCapture(cmd: string, opts: { cwd?: string } = {}): string {
  return execSync(cmd, { cwd: opts.cwd ?? ROOT }).toString().trim();
}

// --- Version bump ---

function bumpVersion(current: string, bump: string): string {
  const [major, minor, patch] = current.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updatePackageJsonVersion(pkg: Record<string, unknown>, version: string) {
  pkg.version = version;
  writeFileSync(join(ROOT, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
}

function updateElectrobunConfigVersion(version: string) {
  const configPath = join(ROOT, "electrobun.config.ts");
  let content = readFileSync(configPath, "utf8");
  content = content.replace(/version: "[^"]+"/, `version: "${version}"`);
  writeFileSync(configPath, content);
}

// --- SHA256 ---

function sha256File(filePath: string): string {
  const data = readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

// --- Main ---

const bump = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: bun scripts/release.ts [patch|minor|major]");
  process.exit(1);
}

// Guard: must be on master with a clean working tree
const branch = runCapture("git rev-parse --abbrev-ref HEAD");
if (branch !== "master") {
  console.error(`Must release from master (current branch: ${branch})`);
  process.exit(1);
}
const status = runCapture("git status --porcelain");
if (status) {
  console.error("Working tree is not clean. Commit or stash changes first.");
  process.exit(1);
}

// Read current version
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const currentVersion: string = pkg.version;
const newVersion = bumpVersion(currentVersion, bump);
console.log(`\nBumping version: ${currentVersion} → ${newVersion}`);

// Capture current hash BEFORE building — the patch file is named after it.
// On the very first release: delete the artifacts/ directory first so prevHash
// starts empty and no stale patch from a pre-release build is uploaded.
const updateJsonPath = join(ARTIFACTS_DIR, "stable-macos-arm64-update.json");
const prevHash: string = existsSync(updateJsonPath)
  ? JSON.parse(readFileSync(updateJsonPath, "utf8")).hash ?? ""
  : "";

// Bump versions
updatePackageJsonVersion(pkg, newVersion);
updateElectrobunConfigVersion(newVersion);

// Build — Electrobun signs inner + outer bundles, produces DMG + tarball + update.json + patch
console.log("\n=== Building ===");
try {
  run("bun run build");
} catch (err) {
  console.error("\nBuild failed — reverting version bump");
  run("git checkout -- package.json electrobun.config.ts");
  process.exit(1);
}

// Paths after build
const dmgSrc = join(ARTIFACTS_DIR, "stable-macos-arm64-QuickSketch.dmg");
const dmgVersioned = join(ARTIFACTS_DIR, `Quick-Sketch-${newVersion}.dmg`);
const tarball = join(ARTIFACTS_DIR, "stable-macos-arm64-QuickSketch.app.tar.zst");
const updateJson = join(ARTIFACTS_DIR, "stable-macos-arm64-update.json");

if (!existsSync(dmgSrc)) {
  console.error(`DMG not found at ${dmgSrc}`);
  process.exit(1);
}

// Copy to versioned name
run(`cp "${dmgSrc}" "${dmgVersioned}"`);

// Sign the DMG
console.log("\n=== Signing DMG ===");
run(`codesign --force --timestamp --sign "${IDENTITY}" "${dmgVersioned}"`);

// Notarize
console.log("\n=== Notarizing DMG (this takes 1-5 minutes) ===");
run(`xcrun notarytool submit "${dmgVersioned}" --keychain-profile "${NOTARY_PROFILE}" --wait`);

// Staple
console.log("\n=== Stapling ===");
run(`xcrun stapler staple "${dmgVersioned}"`);

// Verify
console.log("\n=== Verifying ===");
run(`spctl --assess --verbose --type open --context context:primary-signature "${dmgVersioned}"`);

// SHA256 for Cask
const dmgSha256 = sha256File(dmgVersioned);
console.log(`\nDMG SHA256: ${dmgSha256}`);

// Git tag + commit version bump
console.log("\n=== Tagging release ===");
run(`git add package.json electrobun.config.ts`);
run(`git commit -m "chore: release v${newVersion}"`);
run(`git tag v${newVersion}`);
run(`git push --follow-tags`);

// GitHub Release
console.log("\n=== Creating GitHub Release ===");
const releaseFiles = [
  `"${dmgVersioned}"`,
  `"${tarball}"`,
  `"${updateJson}"`,
];

// Include patch file if it exists (named stable-macos-arm64-{prevHash}.patch)
// prevHash was captured before the build — Electrobun names the patch after the old hash.
const patchFile = join(ARTIFACTS_DIR, `stable-macos-arm64-${prevHash}.patch`);
if (existsSync(patchFile)) {
  releaseFiles.push(`"${patchFile}"`);
  console.log(`Including patch file: ${patchFile}`);
}

run(
  `gh release create "v${newVersion}" ` +
  `--repo "${GITHUB_REPO}" ` +
  `--title "Quick Sketch v${newVersion}" ` +
  `--generate-notes ` +
  releaseFiles.join(" ")
);

// Update Homebrew Cask
console.log("\n=== Updating Homebrew Cask ===");
let cask = readFileSync(CASK_PATH, "utf8");
cask = cask.replace(/version "[^"]+"/, `version "${newVersion}"`);
cask = cask.replace(/sha256 "[^"]+"/, `sha256 "${dmgSha256}"`);
writeFileSync(CASK_PATH, cask);

run(`git add Casks/quick-sketch.rb`, { cwd: HOMEBREW_TAP_DIR });
run(`git commit -m "Update quick-sketch to v${newVersion}"`, { cwd: HOMEBREW_TAP_DIR });
run(`git push`, { cwd: HOMEBREW_TAP_DIR });

console.log(`\n✓ Released Quick Sketch v${newVersion}`);
console.log(`  GitHub: https://github.com/${GITHUB_REPO}/releases/tag/v${newVersion}`);
console.log(`  Brew:   brew install --cask tomenden/tap/quick-sketch`);
