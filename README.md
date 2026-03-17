# Quick Sketch

A lightweight macOS drawing app built with [Excalidraw](https://excalidraw.com) and [Electrobun](https://electrobun.dev).

Sketch a diagram, copy it to clipboard, paste anywhere. Toggle the window with a global keyboard shortcut — it stays running in the background ready to go.

## Features

- Excalidraw as the drawing engine
- Global keyboard shortcuts (customizable in Settings)
- Copy to clipboard as PNG — with optional auto-clear
- Persistent scene and settings across restarts
- Native macOS app menu with ⌘, for Settings
- Accessibility permission detection with guided setup

## Running the app

Install dependencies:

```bash
yarn install
```

Run the native app in watch mode:

```bash
yarn dev
```

Run with Vite HMR alongside the native shell:

```bash
yarn dev:hmr
```

Build the app:

```bash
yarn build
```

## Default shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle window | ⌃⇧S |
| Copy & close | ⌃⇧C |

Shortcuts can be customized in Settings (⌘,).

## Tech stack

- [Electrobun](https://electrobun.dev) — native desktop runtime
- [Excalidraw](https://excalidraw.com) — drawing editor
- React 18 + TypeScript + Vite
