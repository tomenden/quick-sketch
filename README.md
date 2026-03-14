# Quick Sketch

This branch is a clean reboot of Quick Sketch.

The previous Swift implementation and the first Electrobun spike were intentionally removed from the active tree so we can rebuild the app cleanly with Electrobun + Excalidraw for v1.

## What remains on purpose

- `quick-sketch.pen` is the primary visual reference and must be preserved.
- `App/` contains reusable app icon assets.
- `docs/` describes the product requirements, UX expectations, architecture direction, and reboot decision.

## Current status

This branch now has a fresh minimal Electrobun + Excalidraw implementation.

The current app is intentionally small:

1. native Electrobun window shell
2. Excalidraw embedded as the editor
3. persisted local scene + settings
4. PNG copy flow and copy-and-close behavior

More product-specific behavior will be layered on top of this baseline incrementally.

## Running the app

Install dependencies:

```bash
npm install
```

Run the native app in watch mode:

```bash
npm run dev
```

Run with Vite HMR alongside the native shell:

```bash
npm run dev:hmr
```

Build the app:

```bash
npm run build
```

## Read first

- `docs/requirements.md`
- `docs/ux-behavior.md`
- `docs/architecture.md`
- `docs/decisions/0001-excalidraw-reboot.md`
