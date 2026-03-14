# Quick Sketch

This branch is a clean reboot of Quick Sketch.

The previous Swift implementation and the first Electrobun spike were intentionally removed from the active tree so we can rebuild the app cleanly with Electrobun + Excalidraw for v1.

## What remains on purpose

- `quick-sketch.pen` is the primary visual reference and must be preserved.
- `App/` contains reusable app icon assets.
- `docs/` describes the product requirements, UX expectations, architecture direction, and reboot decision.

## Current status

This branch is intentionally docs-first. There is no runnable app yet.

The goal is to make the next implementation phase clean and boring:

1. scaffold a minimal Electrobun shell
2. embed Excalidraw
3. add the Quick Sketch behaviors we actually want
4. ship one coherent implementation instead of carrying multiple abandoned stacks

## Read first

- `docs/requirements.md`
- `docs/ux-behavior.md`
- `docs/architecture.md`
- `docs/decisions/0001-excalidraw-reboot.md`
