import { BrowserView, BrowserWindow, GlobalShortcut, Updater, Utils } from "electrobun/bun";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeStoredScene,
  type ExportImageResponse,
  type QuickSketchBootstrap,
  type QuickSketchRPC,
  type QuickSketchSettings,
  type StoredScene,
} from "../shared/rpc.ts";

const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const TOGGLE_SHORTCUT = "Control+Shift+P";
const COPY_AND_CLOSE_SHORTCUT = "Control+Shift+Enter";

const appDataDir = Utils.paths.userData;
const scenePath = join(appDataDir, "scene.json");
const settingsPath = join(appDataDir, "settings.json");

if (!existsSync(appDataDir)) {
  mkdirSync(appDataDir, { recursive: true });
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      return fallback;
    }

    return await file.json();
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown) {
  await Bun.write(path, JSON.stringify(value, null, 2));
}

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      return DEV_SERVER_URL;
    } catch {
      return "views://mainview/index.html";
    }
  }

  return "views://mainview/index.html";
}

function createDefaultSettings(): QuickSketchSettings {
  return {
    showGrid: true,
    autoClearAfterCopyAndClose: true,
  };
}

function normalizeSettings(settings: QuickSketchSettings): QuickSketchSettings {
  const defaults = createDefaultSettings();
  return {
    showGrid: settings.showGrid ?? defaults.showGrid,
    autoClearAfterCopyAndClose: settings.autoClearAfterCopyAndClose ?? defaults.autoClearAfterCopyAndClose,
  };
}

function sceneHasContent(scene: StoredScene | null): boolean {
  return Boolean(scene && Array.isArray(scene.elements) && scene.elements.length > 0);
}

let currentScene = normalizeStoredScene(await readJson<StoredScene | null>(scenePath, null));
let currentSettings = normalizeSettings(await readJson(settingsPath, createDefaultSettings()));

type MainWindow = BrowserWindow<QuickSketchRPC>;
let mainWindow: MainWindow | null = null;

const rpc = BrowserView.defineRPC<QuickSketchRPC>({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      getBootstrap: async (): Promise<QuickSketchBootstrap> => ({
        scene: currentScene,
        settings: currentSettings,
        shortcuts: {
          toggleWindow: TOGGLE_SHORTCUT,
          copyAndClose: COPY_AND_CLOSE_SHORTCUT,
        },
      }),
      persistScene: async ({ scene }: { scene: StoredScene }) => {
        currentScene = normalizeStoredScene(scene);
        await writeJson(scenePath, currentScene);
        return { ok: true as const };
      },
      persistSettings: async ({ settings }: { settings: QuickSketchSettings }) => {
        currentSettings = normalizeSettings(settings);
        await writeJson(settingsPath, currentSettings);
        return { ok: true as const };
      },
      writeClipboardImage: async ({ pngBase64 }: { pngBase64: string }) => {
        try {
          const normalized = pngBase64.replace(/^data:image\/png;base64,/, "");
          const bytes = Uint8Array.from(Buffer.from(normalized, "base64"));
          Utils.clipboardWriteImage(bytes);
          return { ok: true };
        } catch {
          return { ok: false };
        }
      },
      closeWindow: async () => {
        hideMainWindow();
        return { ok: true as const };
      },
      notify: async ({ title, body }: { title: string; body?: string }) => {
        Utils.showNotification({ title, body });
        return { ok: true as const };
      },
    },
    messages: {},
  },
});

const mainViewUrl = await getMainViewUrl();

function createWindow(): MainWindow {
  if (mainWindow) {
    return showMainWindow();
  }

  mainWindow = new BrowserWindow({
    title: "Quick Sketch",
    url: mainViewUrl,
    rpc,
    titleBarStyle: "default",
    frame: {
      width: 1120,
      height: 820,
      x: 120,
      y: 90,
    },
  });

  mainWindow.on("close", () => {
    mainWindow = null;
  });

  mainWindow.show();
  return mainWindow;
}

function showMainWindow(): MainWindow {
  if (!mainWindow) {
    return createWindow();
  }

  if (mainWindow.isMinimized?.()) {
    mainWindow.unminimize();
  }

  mainWindow.show();
  return mainWindow;
}

function hideMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (!mainWindow.isMinimized?.()) {
    mainWindow.minimize();
  }
}

async function requestExportPng(): Promise<ExportImageResponse> {
  if (!mainWindow) {
    return { pngBase64: null, hasContent: false };
  }

  const response = await mainWindow.webview.rpc.request.exportPng({});
  return response ?? { pngBase64: null, hasContent: false };
}

async function copyAndClose() {
  if (!mainWindow) {
    return;
  }

  const result = await requestExportPng();
  if (!result.hasContent || !result.pngBase64) {
    Utils.showNotification({
      title: "Quick Sketch",
      body: "There is nothing to copy yet.",
    });
    return;
  }

  const normalized = result.pngBase64.replace(/^data:image\/png;base64,/, "");
  const bytes = Uint8Array.from(Buffer.from(normalized, "base64"));
  Utils.clipboardWriteImage(bytes);

  if (currentSettings.autoClearAfterCopyAndClose) {
    currentScene = null;
    await writeJson(scenePath, currentScene);
    mainWindow.webview.rpc.send.clearScene({});
  }

  hideMainWindow();
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized?.()) {
    showMainWindow();
    return;
  }

  hideMainWindow();
}

function registerShortcuts() {
  GlobalShortcut.unregisterAll();
  GlobalShortcut.register(TOGGLE_SHORTCUT, toggleWindow);
  GlobalShortcut.register(COPY_AND_CLOSE_SHORTCUT, () => {
    void copyAndClose();
  });
}

registerShortcuts();

if (sceneHasContent(currentScene)) {
  createWindow();
} else {
  createWindow();
}
