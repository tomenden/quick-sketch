# UX Behavior Expectations

This document defines the baseline interaction behavior the new implementation must satisfy.

## General rule

When a behavior is standard in Excalidraw or similar tools, prefer the standard behavior over custom invention.

## Selection and deletion

- clicking an element selects it
- dragging a selected element moves it
- dragging handles resizes it when applicable
- pressing `Delete` or `Backspace` removes the current selection
- selection behavior should feel consistent across freehand strokes, text, shapes, and arrows

## Text and labels

- double-clicking a rectangle or ellipse should create or edit a centered label
- when a shape is selected and the user types, that typing should become the shape label
- text should be editable after creation
- text sizing should use simple presets that feel like Excalidraw, for example XS / S / M / L / XL
- arrows should support labels as well when the underlying library supports it cleanly

## Arrow behavior

- arrows should bind cleanly to shapes
- users should be able to start or end an arrow from the edge of a shape
- moving a bound shape should preserve the arrow relationship
- arrow creation should feel precise without requiring pixel-perfect manual positioning

## Drawing behavior

- freehand drawing should create selectable strokes
- rectangle and ellipse tools should create annotatable shapes
- text tool should place standalone text when used on empty canvas space
- the editor should not invent surprising mode-specific exceptions unless required by the library

## Keyboard and shortcuts

- global shortcut toggles the window
- copy-and-close shortcut exports the sketch to the clipboard and hides the window
- shortcut editing should be clear and safe
- if macOS accessibility permission is needed, the app should explain why in plain language

## Window-level behavior

- the app should open into a ready-to-draw state
- empty state messaging should be minimal and helpful
- copy-and-close should be a primary action
- the window should feel like a quick utility, not a full productivity suite

## Design guardrails

- the `quick-sketch.pen` file is the visual reference
- avoid heavy dashboard UI, inspector overload, or side-panel-first layouts
- keep the canvas central
- prefer a small number of polished controls over a large number of exposed settings
