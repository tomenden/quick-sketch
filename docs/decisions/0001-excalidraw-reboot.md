# 0001 - Reboot The App Around Excalidraw

## Status

Accepted.

## Context

Quick Sketch started as a Swift implementation. A later Electrobun spike explored a custom drawing implementation. The repository ended up with multiple directions in flight and no clean path forward.

At the same time, the product expectations increasingly matched behaviors that mature sketch editors already solve well:

- predictable selection and deletion
- text labels inside shapes
- consistent resizing and text sizing
- arrow binding to shapes

Rebuilding those behaviors from scratch would create unnecessary complexity for a v1 utility app.

## Decision

We are rebooting the active branch around Electrobun + Excalidraw.

We intentionally removed the legacy Swift implementation and the first Electrobun spike from the active tree so the new codebase can start clean.

We keep:

- `quick-sketch.pen`
- reusable app icon assets
- docs describing product intent and behavior

We do not keep:

- the Swift app as live code in this branch
- the custom drawing-engine spike

## Consequences

### Positive

- faster path to standard editor behavior
- cleaner repository with one active implementation direction
- less custom canvas code to maintain
- easier future onboarding

### Tradeoffs

- the new branch is temporarily non-runnable while the clean rebuild is underway
- some prototype work is intentionally discarded

## Follow-up

The next implementation work should start from the docs in this branch and build only the minimum app-specific shell around Excalidraw.
