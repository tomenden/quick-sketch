# Product Requirements

## Purpose

Quick Sketch is a lightweight desktop sketch pad for turning thoughts into visual snippets quickly, then copying them straight into the clipboard for use in chats, docs, tickets, and notes.

The app is not trying to be a full whiteboard platform. It should feel fast, obvious, and disposable.

## Product principles

1. Launch fast and get out of the way.
2. Drawing behavior should feel familiar to users of modern sketch/whiteboard tools.
3. The default workflow is sketch -> copy -> paste.
4. We should use a mature canvas library instead of rebuilding standard editor interactions by hand.
5. The codebase should stay small, readable, and focused on app-specific behavior.

## v1 scope

### Core editor

- Excalidraw-based canvas embedded inside an Electrobun desktop shell
- freehand drawing
- rectangles, ellipses, arrows, and text
- selecting, moving, resizing, and deleting elements
- multi-element sketches on one canvas

### Expected app workflow

- open and hide the sketch window with a global shortcut
- draw or annotate quickly
- copy the current sketch as an image to the clipboard
- optionally auto-clear after copy-and-close

### Settings

- configurable toggle shortcut
- configurable copy-and-close shortcut
- auto-clear after copy-and-close toggle

### Persistence

- restore the most recent in-progress sketch when reopening the window
- persist settings locally

## Visual direction

- `quick-sketch.pen` is the design reference
- the current intended direction is Variation A: minimal, calm, native
- specifically, the shell should feel like a lightweight desktop utility with a compact title row, a restrained toolbar, and a quiet canvas-first composition
- implementation may simplify visuals slightly, but should keep the same overall product feel: calm canvas, light chrome, clear actions, minimal distraction

## Explicit non-goals for v1

- no migration compatibility with the old Swift app
- no coexistence of Swift and Electrobun implementations in the active codebase
- no custom drawing engine unless Excalidraw becomes a proven blocker
- no multi-user collaboration
- no cloud sync
- no plugin system
- no attempt to expose every Excalidraw capability if it harms simplicity

## Success criteria

- the app feels predictable to someone familiar with Excalidraw-like editors
- the common sketch -> copy -> paste flow works smoothly
- the repository has one active implementation path and clear docs
- future changes can be made without rediscovering product intent from old experiments
