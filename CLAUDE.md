# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quick Sketch is a lightweight macOS desktop drawing app built with Electrobun (desktop runtime) and Excalidraw (drawing engine). Users launch it with a global shortcut, sketch something, copy to clipboard, and paste elsewhere.

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Build + run Electrobun in watch mode
bun run dev:hmr          # Vite HMR + Electrobun (faster iteration)
bun run build            # Production build
bun run package          # Build + create DMG (build/Quick-Sketch-0.1.0.dmg)
bun run typecheck        # TypeScript validation (no tests yet)
```

## Architecture

Three-layer architecture with typed RPC between processes:

- **Bun process** (`src/bun/index.ts`) — OS integration: window lifecycle, global keyboard shortcuts (via NSEvent FFI), clipboard (PNG pasteboard), file persistence (`~/.config/quick-sketch/`), native app menu, accessibility permission check.

- **React view** (`src/mainview/App.tsx`) — Wraps Excalidraw with app-specific UI: copy-to-clipboard export, settings modal with shortcut recorder, debounced scene persistence, empty state, accessibility warning banner.

- **Shared RPC schema** (`src/shared/rpc.ts`) — Typed bidirectional IPC definitions (`QuickSketchRPC`), accelerator key conversion utilities (Electrobun format ↔ display symbols ↔ KeyboardEvent), scene/settings type definitions and normalizers.

### Key design rule

Excalidraw owns all editor semantics (selection, text, arrows, shapes). App code wraps Excalidraw — it never reimplements or fights its behavior. Custom code only where it adds clear value (clipboard export, global shortcuts, persistence).

### Build pipeline

Vite compiles `src/mainview/` → `dist/` → Electrobun bundles into `.app`. In dev, the app checks for a Vite dev server on port 5174.

### Config files

- `electrobun.config.ts` — App metadata, bundle ID (`dev.tome.quick-sketch`), icon path, WKWebView (no CEF)
- `vite.config.ts` — Root is `src/mainview`, output to `dist/`, dev port 5174

## Type declarations

Electrobun types are in `src/types/` — these are hand-written `.d.ts` files (not from a package) covering the Bun process API, webview API, and root module.
