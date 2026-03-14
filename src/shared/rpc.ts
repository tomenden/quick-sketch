import type { RPCSchema } from "electrobun";

export type StoredScene = {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
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
