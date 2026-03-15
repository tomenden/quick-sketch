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

export type QuickSketchSettings = {
  showGrid: boolean;
  autoClearAfterCopyAndClose: boolean;
};

export type QuickSketchShortcuts = {
  toggleWindow: string;
  copyAndClose: string;
};

export type QuickSketchBootstrap = {
  scene: StoredScene | null;
  settings: QuickSketchSettings;
  shortcuts: QuickSketchShortcuts;
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
    };
  }>;
};

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
      gridModeEnabled: typeof rawAppState.gridModeEnabled === "boolean" ? rawAppState.gridModeEnabled : true,
    },
    files,
  };
}
