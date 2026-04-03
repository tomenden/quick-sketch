# Quick Sketch — Shipping Design

**Date:** 2026-04-02  
**Status:** Approved

## Overview

Ship Quick Sketch as a signed, notarized macOS app distributed via GitHub Releases and Homebrew Cask, with Electrobun-native auto-updates.

---

## 1. Code Signing

Replace `scripts/adhoc-sign.ts` (currently just strips xattrs) with a real Developer ID signing script.

**Identity:** `Developer ID Application: Tom Enden (Q3VTL5U3XB)`  
**Bundle ID:** `dev.tome.quick-sketch`

### Entitlements

A new `App/entitlements.plist` is required by Electrobun's Bun runtime:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
</dict>
</plist>
```

### Signing order (inside-out)

1. Sign all binaries inside `Contents/MacOS/` and `Contents/Frameworks/` with `--options runtime --entitlements App/entitlements.plist`
2. Sign the `.app` bundle itself last
3. Sign the `.dmg` after the app is signed

The `scripts/adhoc-sign.ts` postWrap hook is replaced with `scripts/sign.ts` which performs steps 1–2. Step 3 happens in `scripts/release.ts`.

---

## 2. Notarization + Stapling

After the signed DMG is produced:

1. Submit to Apple's notary service:  
   `xcrun notarytool submit Quick-Sketch-<version>.dmg --keychain-profile "quick-sketch-notary" --wait`
2. Staple the ticket to the DMG:  
   `xcrun stapler staple Quick-Sketch-<version>.dmg`

**Credentials:** Stored in macOS Keychain under profile name `quick-sketch-notary` (App-Specific Password from appleid.apple.com). Never stored in the repo.

Setup (one-time):  
```bash
xcrun notarytool store-credentials "quick-sketch-notary" \
  --apple-id "<apple-id>" \
  --team-id Q3VTL5U3XB \
  --password "<app-specific-password>"
```

---

## 3. Signed Smoke Test

**This is a gate — do not publish until it passes.**

After building the notarized DMG locally:

1. Mount the DMG and drag-install to `/Applications`
2. Run `spctl --assess --verbose /Applications/Quick\ Sketch.app` — must pass
3. Launch the app (not from terminal, double-click from Finder)
4. Open **System Settings → Privacy & Security → Accessibility**, grant permission to Quick Sketch
5. Confirm global shortcuts fire (⌃⇧S to toggle window, ⌃⇧C to copy & close)
6. Confirm the a11y warning banner dismisses after permission is granted

**Goal:** Validate that Developer ID signing causes the Accessibility permission grant to cascade correctly to the `bun` subprocess (the root cause in blackboardsh/electrobun#334). If shortcuts still don't fire after granting permission, stop and investigate before publishing.

---

## 4. Auto-Updates (Electrobun Patches)

### Config change

`electrobun.config.ts`: set `release.generatePatch: true`

This makes `electrobun build` produce both a full app bundle and a binary diff patch relative to the previous release.

### Update manifest

Each GitHub Release includes a `latest.json`:

```json
{
  "version": "0.1.1",
  "url": "https://github.com/tomenden/quick-sketch/releases/download/v0.1.1/Quick-Sketch-0.1.1.dmg",
  "patch_url": "https://github.com/tomenden/quick-sketch/releases/download/v0.1.1/patch.bin",
  "sha256": "<dmg-sha256>",
  "patch_sha256": "<patch-sha256>"
}
```

The stable URL for the latest manifest is:  
`https://github.com/tomenden/quick-sketch/releases/latest/download/latest.json`

### In-app update check

On launch, the Bun process fetches `latest.json`, compares the version to the running version, and if newer: downloads the patch, applies it via Electrobun's update API, and prompts the user to restart.

---

## 5. Release Script

`scripts/release.ts` — run locally to cut a release:

1. Validate working tree is clean and on `master`
2. Bump version in `package.json` and `electrobun.config.ts` (patch/minor/major arg)
3. `bun run build` — produces `.app` bundle and patch (if previous release exists)
4. Sign the `.app` (via `scripts/sign.ts` logic)
5. Package to DMG (`electrobun package` or equivalent)
6. Sign the DMG
7. Notarize + staple the DMG
8. Compute SHA256 of DMG and patch
9. Write `latest.json`
10. `git tag v<version>` and push
11. `gh release create v<version>` — upload DMG, patch, `latest.json`
12. Update Homebrew Cask (see §6)

---

## 6. Homebrew Cask

### Location

New file `Casks/quick-sketch.rb` in `tomenden/homebrew-tap` (at `/Users/tome/projects/homebrew-tap`).

```ruby
cask "quick-sketch" do
  version "0.1.0"
  sha256 "<sha256-of-dmg>"

  url "https://github.com/tomenden/quick-sketch/releases/download/v#{version}/Quick-Sketch-#{version}.dmg"

  name "Quick Sketch"
  desc "Lightweight macOS drawing app — sketch, copy, paste"
  homepage "https://github.com/tomenden/quick-sketch"

  app "Quick Sketch.app"
end
```

**Install:** `brew install --cask tomenden/tap/quick-sketch`

### Release automation

`scripts/release.ts` updates `version` and `sha256` in the Cask file, commits, and pushes to `tomenden/homebrew-tap`.

---

## Files Changed / Created

| File | Change |
|---|---|
| `scripts/adhoc-sign.ts` | Replaced by `scripts/sign.ts` |
| `scripts/sign.ts` | New — Developer ID signing logic |
| `scripts/release.ts` | New — full release orchestration |
| `App/entitlements.plist` | New — Bun runtime entitlements |
| `electrobun.config.ts` | `postWrap` → `sign.ts`; `generatePatch: true` |
| `src/bun/index.ts` | Add update-check on launch |
| `package.json` | Add `release` script |
| `/Users/tome/projects/homebrew-tap/Casks/quick-sketch.rb` | New — Cask formula |
