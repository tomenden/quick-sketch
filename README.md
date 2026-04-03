# Quick Sketch

A lightweight macOS drawing app built with [Excalidraw](https://excalidraw.com) and [Electrobun](https://electrobun.dev).

Sketch a diagram, copy it to clipboard, paste anywhere. Toggle the window with a global keyboard shortcut — it stays running in the background ready to go.

## Install

```bash
brew install --cask tomenden/tap/quick-sketch
```

Or download the latest `.dmg` from [Releases](https://github.com/tomenden/quick-sketch/releases).

## Features

- Excalidraw as the drawing engine
- Global keyboard shortcuts (customizable in Settings)
- Copy to clipboard as PNG — with optional auto-clear
- Persistent scene and settings across restarts
- Native macOS app menu with ⌘, for Settings
- Accessibility permission detection with guided setup
- Auto-updates via Electrobun's built-in updater

## Default shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle window | ⌃⇧S |
| Copy & close | ⌃⇧C |

Shortcuts can be customized in Settings (⌘,).

## Development

```bash
bun install       # Install dependencies
bun run dev       # Build + run in watch mode
bun run dev:hmr   # Vite HMR + native shell (faster iteration)
bun run build     # Production build
bun run typecheck # TypeScript validation
```

## Releasing

Prerequisites: Developer ID cert in Keychain, `quick-sketch-notary` profile set up via `xcrun notarytool store-credentials`, `gh` CLI authenticated, `../homebrew-tap` checked out.

```bash
bun run release          # patch bump (0.1.0 → 0.1.1)
bun run release minor    # minor bump (0.1.0 → 0.2.0)
bun run release major    # major bump (0.1.0 → 1.0.0)
```

This builds, signs, notarizes, creates the GitHub Release, and updates the Homebrew Cask automatically.

## Tech stack

- [Electrobun](https://electrobun.dev) — native desktop runtime
- [Excalidraw](https://excalidraw.com) — drawing editor
- React 18 + TypeScript + Vite
