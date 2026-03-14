# Architecture Direction

## Stack

- desktop shell: Electrobun
- editor: Excalidraw
- UI layer: React
- local persistence: simple file-based settings and sketch state

## Why this architecture

Excalidraw should own the editor semantics.

That means we do not rebuild:

- selection logic
- text-in-shape behavior
- arrow binding behavior
- resize handles
- common whiteboard shortcuts and interaction patterns

Our app-specific code should focus on:

- window lifecycle
- global shortcuts
- clipboard export
- persistence
- lightweight settings UI
- design integration around the editor

## Suggested repository shape

- `quick-sketch.pen`
- `App/` for icon assets
- `docs/` for product and engineering intent
- future app code:
  - `src/bun/` for Electrobun runtime code
  - `src/mainview/` for the React view
  - `src/shared/` for app-specific shared types and serialization

## Boundary rules

- Excalidraw is the source of truth for editor interactions
- app code wraps Excalidraw rather than fighting it
- if a desired behavior requires large invasive overrides to Excalidraw internals, stop and reassess before proceeding
- keep custom code small and explain why it exists

## Implementation sequence

1. minimal window shell
2. Excalidraw embedded and visible
3. clipboard export
4. local persistence
5. settings and shortcuts
6. visual polish against `quick-sketch.pen`
