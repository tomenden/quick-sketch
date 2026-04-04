import type { RPCSchema } from "electrobun";

export type StoredAppState = {
  viewBackgroundColor?: string;
  gridModeEnabled?: boolean;
};

export type StoredScene = {
  elements: readonly unknown[];
  appState: StoredAppState;
  files: Record<string, unknown>;
};

export type QuickSketchShortcuts = {
  toggleWindow: string;
  copyAndClose: string;
};

export const DEFAULT_SHORTCUTS: QuickSketchShortcuts = {
  toggleWindow: "Control+Shift+S",
  copyAndClose: "Control+Shift+C",
};

export type QuickSketchSettings = {
  showGrid: boolean;
  autoClearAfterCopyAndClose: boolean;
  shortcuts: QuickSketchShortcuts;
};

export type QuickSketchBootstrap = {
  scene: StoredScene | null;
  settings: QuickSketchSettings;
  shortcutsRegistered: boolean;
  launchAtLogin: boolean;
};

export type ExportImageResponse = {
  pngBase64: string | null;
  hasContent: boolean;
};

export type QuickSketchRPC = {
  bun: RPCSchema<{
    requests: {
      getBootstrap: {
        params: {};
        response: QuickSketchBootstrap;
      };
      persistScene: {
        params: { scene: StoredScene };
        response: { ok: true };
      };
      persistSettings: {
        params: { settings: QuickSketchSettings };
        response: { ok: true };
      };
      writeClipboardImage: {
        params: { pngBase64: string };
        response: { ok: boolean };
      };
      closeWindow: {
        params: {};
        response: { ok: true };
      };
      notify: {
        params: { title: string; body?: string };
        response: { ok: true };
      };
      openSystemPreferences: {
        params: {};
        response: { ok: true };
      };
      retryShortcuts: {
        params: {};
        response: { ok: boolean };
      };
      updateShortcuts: {
        params: { shortcuts: QuickSketchShortcuts };
        response: { ok: boolean };
      };
      setLoginItemEnabled: {
        params: { enabled: boolean };
        response: { ok: boolean };
      };
    };
    messages: {};
  }>;
  webview: RPCSchema<{
    requests: {
      exportPng: {
        params: {};
        response: ExportImageResponse;
      };
    };
    messages: {
      clearScene: {};
      openSettings: {};
      focusCanvas: {};
    };
  }>;
};

// ---------------------------------------------------------------------------
// Accelerator ↔ display helpers
// Electrobun accelerator format: "Control+Shift+Backquote"
// ---------------------------------------------------------------------------

const KEY_DISPLAY: Record<string, string> = {
  backspace: "⌫",
  delete: "⌦",
  enter: "↵",
  return: "↵",
  space: "Space",
  escape: "⎋",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  home: "Home",
  pageup: "PgUp",
  pagedown: "PgDn",
  plus: "+",
  minus: "-",
};

/** Convert an Electrobun accelerator string to a human-friendly display string. */
export function acceleratorToDisplay(accel: string): string {
  return accel
    .split("+")
    .map((part) => {
      switch (part) {
        case "Control":
          return "⌃";
        case "Shift":
          return "⇧";
        case "Alt":
        case "Option":
          return "⌥";
        case "Cmd":
        case "Command":
        case "Meta":
          return "⌘";
        default:
          return KEY_DISPLAY[part] ?? part;
      }
    })
    .join("");
}

/** Convert a KeyboardEvent.code (e.g. "KeyP") to an Electrobun accelerator
 *  key name. Only emits names Electrobun's native parser actually recognizes:
 *  single letters/digits, plus: backspace, delete, enter, return, escape,
 *  space, up, down, left, right, home, pageup, pagedown, plus, minus. */
export function codeToAcceleratorKey(code: string): string | null {
  if (code.startsWith("Key")) return code.slice(3); // KeyP → P
  if (code.startsWith("Digit")) return code.slice(5); // Digit1 → 1
  const map: Record<string, string> = {
    Enter: "enter",
    Backspace: "backspace",
    Delete: "delete",
    Space: "space",
    Escape: "escape",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Home: "home",
    End: "home", // best effort
    PageUp: "pageup",
    PageDown: "pagedown",
    Minus: "minus",
    Equal: "plus",
  };
  return map[code] ?? null;
}

/** Build an Electrobun accelerator string from a KeyboardEvent. */
export function keyEventToAccelerator(e: {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  code: string;
}): string | null {
  const key = codeToAcceleratorKey(e.code);
  if (!key) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Control");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Cmd");
  if (parts.length === 0) return null; // require at least one modifier
  parts.push(key);
  return parts.join("+");
}

/** Check whether a KeyboardEvent matches an Electrobun accelerator string. */
export function keyEventMatchesAccelerator(
  e: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; code: string },
  accel: string,
): boolean {
  const parts = accel.split("+");
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));

  if (e.ctrlKey !== mods.has("Control")) return false;
  if (e.shiftKey !== mods.has("Shift")) return false;
  if (e.altKey !== (mods.has("Alt") || mods.has("Option"))) return false;
  if (e.metaKey !== (mods.has("Cmd") || mods.has("Command") || mods.has("Meta"))) return false;

  const eventKey = codeToAcceleratorKey(e.code);
  return eventKey === key;
}

export function normalizeStoredScene(value: unknown): StoredScene | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    elements?: unknown;
    appState?: unknown;
    files?: unknown;
  };

  const elements = Array.isArray(candidate.elements) ? candidate.elements : [];
  const rawAppState =
    candidate.appState && typeof candidate.appState === "object"
      ? (candidate.appState as Record<string, unknown>)
      : {};
  const files =
    candidate.files && typeof candidate.files === "object"
      ? (candidate.files as Record<string, unknown>)
      : {};

  return {
    elements,
    appState: {
      viewBackgroundColor:
        typeof rawAppState.viewBackgroundColor === "string" ? rawAppState.viewBackgroundColor : "#fffdfa",
      gridModeEnabled: typeof rawAppState.gridModeEnabled === "boolean" ? rawAppState.gridModeEnabled : false,
    },
    files,
  };
}
