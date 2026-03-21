import { ApplicationMenu, BrowserView, BrowserWindow, GlobalShortcut, Updater, Utils } from "electrobun/bun";
import { dlopen, FFIType } from "bun:ffi";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SHORTCUTS,
  normalizeStoredScene,
  type ExportImageResponse,
  type QuickSketchBootstrap,
  type QuickSketchRPC,
  type QuickSketchSettings,
  type QuickSketchShortcuts,
  type StoredScene,
} from "../shared/rpc.ts";

const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

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
    showGrid: false,
    autoClearAfterCopyAndClose: true,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  };
}

function normalizeSettings(raw: any): QuickSketchSettings {
  const defaults = createDefaultSettings();
  const s = raw && typeof raw === "object" ? raw : {};
  const sc = s.shortcuts && typeof s.shortcuts === "object" ? s.shortcuts : {};
  return {
    showGrid: typeof s.showGrid === "boolean" ? s.showGrid : defaults.showGrid,
    autoClearAfterCopyAndClose:
      typeof s.autoClearAfterCopyAndClose === "boolean" ? s.autoClearAfterCopyAndClose : defaults.autoClearAfterCopyAndClose,
    shortcuts: {
      toggleWindow: typeof sc.toggleWindow === "string" && sc.toggleWindow ? sc.toggleWindow : defaults.shortcuts.toggleWindow,
      copyAndClose: typeof sc.copyAndClose === "string" && sc.copyAndClose ? sc.copyAndClose : defaults.shortcuts.copyAndClose,
    },
  };
}


let currentScene = normalizeStoredScene(await readJson<StoredScene | null>(scenePath, null));
let currentSettings = normalizeSettings(await readJson(settingsPath, createDefaultSettings()));

type MainWindow = BrowserWindow<QuickSketchRPC>;
let mainWindow: MainWindow | null = null;

const rpc = BrowserView.defineRPC<QuickSketchRPC>({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      getBootstrap: async (): Promise<QuickSketchBootstrap> => {
        console.log(`[QuickSketch] getBootstrap called — shortcutsRegistered=${shortcutsRegistered}`);
        return {
          scene: currentScene,
          settings: currentSettings,
          shortcutsRegistered,
        };
      },
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
      openSystemPreferences: async () => {
        Utils.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
        return { ok: true as const };
      },
      retryShortcuts: async () => {
        const ok = registerShortcuts();
        return { ok };
      },
      updateShortcuts: async ({ shortcuts }: { shortcuts: QuickSketchShortcuts }) => {
        currentSettings = { ...currentSettings, shortcuts };
        await writeJson(settingsPath, currentSettings);
        const ok = registerShortcuts();
        return { ok };
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
  mainWindow.webview.rpc.send.focusCanvas({});
  return mainWindow;
}

function hideMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (!mainWindow.isMinimized?.()) {
    mainWindow.minimize();
  }

  // After minimizing, the app remains frontmost on macOS, which means
  // the global shortcut monitor (addGlobalMonitorForEventsMatchingMask)
  // won't fire since it only captures events for other apps.
  // Hide the app so macOS activates the previous application — equivalent
  // to [NSApp hide:nil].
  Bun.spawn(["osascript", "-e",
    'tell application "System Events" to set visible of the first process whose frontmost is true to false',
  ]);
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
  console.log("[QuickSketch] toggleWindow() fired!");
  // The global shortcut monitor (NSEvent.addGlobalMonitorForEventsMatchingMask)
  // only fires when OTHER apps are focused. So if this fires, our window is
  // never in front — always show it. Hiding is handled by the local keydown
  // listener in the webview (which fires when our window IS focused).
  showMainWindow();
}

// Check macOS Accessibility permission via AXIsProcessTrusted()
// Global shortcuts use NSEvent.addGlobalMonitorForEventsMatchingMask which
// silently requires this permission — register() returns true either way,
// but the monitor never fires without it.
function isAccessibilityTrusted(): boolean {
  try {
    console.log("[QuickSketch] Checking AXIsProcessTrusted via FFI...");
    const lib = dlopen(
      "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices",
      { AXIsProcessTrusted: { args: [], returns: FFIType.bool } },
    );
    const trusted = lib.symbols.AXIsProcessTrusted();
    lib.close();
    console.log(`[QuickSketch] AXIsProcessTrusted() = ${trusted}`);
    return trusted;
  } catch (err) {
    console.error("[QuickSketch] Failed to call AXIsProcessTrusted:", err);
    // If we can't check, assume trusted (non-macOS or unexpected error)
    return true;
  }
}

let shortcutsRegistered = false;

function registerShortcuts(): boolean {
  const { toggleWindow: toggleAccel, copyAndClose: copyAccel } = currentSettings.shortcuts;
  console.log(`[QuickSketch] registerShortcuts: toggle="${toggleAccel}" copy="${copyAccel}"`);

  GlobalShortcut.unregisterAll();

  const toggleOk = GlobalShortcut.register(toggleAccel, toggleWindow);
  console.log(`[QuickSketch] register("${toggleAccel}") → ${toggleOk}`);

  const copyOk = GlobalShortcut.register(copyAccel, () => {
    void copyAndClose();
  });
  console.log(`[QuickSketch] register("${copyAccel}") → ${copyOk}`);

  const trusted = isAccessibilityTrusted();
  shortcutsRegistered = toggleOk && copyOk && trusted;
  console.log(`[QuickSketch] shortcutsRegistered=${shortcutsRegistered} (trusted=${trusted})`);
  return shortcutsRegistered;
}

console.log("[QuickSketch] === Starting shortcut registration ===");
registerShortcuts();
console.log("[QuickSketch] === Shortcut registration complete ===");

ApplicationMenu.setApplicationMenu([
  {
    label: "Quick Sketch",
    submenu: [
      { role: "about" },
      { type: "divider" },
      { label: "Settings...", action: "openSettings", accelerator: "Cmd+," },
      { type: "divider" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhideAll" },
      { type: "divider" },
      { role: "quit" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "divider" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      { role: "close" },
    ],
  },
]);

ApplicationMenu.on("application-menu-clicked", (event: any) => {
  if (event?.data?.action === "openSettings") {
    if (mainWindow) {
      mainWindow.webview.rpc.send.openSettings({});
    }
  }
});

createWindow();
