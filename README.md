# Quick Sketch

Quick Sketch is a macOS utility for fast "draw and paste" workflows while chatting with AI tools.

## Product direction

The first usable milestone is intentionally narrow:

- A global hotkey opens a floating sketch window.
- You draw a rough diagram with freehand strokes.
- Another hotkey copies the rendered image to the macOS clipboard and hides the window.

This keeps the loop short enough for in-conversation use.

## Current implementation

The app is structured around a few small native components:

- `SketchStore` owns drawing state.
- `SketchCanvasView` is the freehand canvas.
- `SketchWindowController` manages a floating overlay-style window.
- `HotkeyManager` registers global shortcuts through Carbon.
- `ClipboardService` renders the canvas into an `NSImage` and writes it to the pasteboard.
- `StatusItemController` exposes the app in the macOS menu bar.

Default shortcuts:

- Toggle window: `control-shift-space`
- Copy and close: `control-shift-return`

## Near-term roadmap

1. Persist user-configurable shortcuts.
2. Add undo/redo and an eraser.
3. Add simple shapes, arrows, and text labels.
4. Export transparent-background images.
5. Add launch-at-login and onboarding for permissions if needed.

## Running

Build an app bundle into `dist/QuickSketch.app`:

```bash
./scripts/build-app.sh
```

Build and launch it:

```bash
./scripts/run-app.sh
```

The first launch path is intentionally lightweight: Swift Package Manager builds the binary, then a small script wraps it in a macOS `.app` bundle with the required `Info.plist`.
