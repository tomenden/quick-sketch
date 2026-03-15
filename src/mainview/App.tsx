import Electrobun, { Electroview } from "electrobun/view";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  normalizeStoredScene,
  type ExportImageResponse,
  type QuickSketchBootstrap,
  type QuickSketchRPC,
  type QuickSketchSettings,
  type StoredScene,
} from "../shared/rpc.ts";

type Bridge = {
  exportPng: () => Promise<ExportImageResponse>;
  clearScene: () => void;
};

const bridge: Bridge = {
  exportPng: async () => ({ pngBase64: null, hasContent: false }),
  clearScene: () => undefined,
};

const rpc = Electroview.defineRPC<QuickSketchRPC>({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      exportPng: () => bridge.exportPng(),
    },
    messages: {
      clearScene: () => {
        bridge.clearScene();
      },
    },
  },
});

const electrobun = new Electrobun.Electroview({ rpc });

function IconSpark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m5 18 1 3 1-3 3-1-3-1-1-3-1 3-3 1Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 8.7A3.3 3.3 0 1 1 8.7 12 3.3 3.3 0 0 1 12 8.7Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m19.2 15 .8 1.4-1.5 2.6-1.7-.2a7.8 7.8 0 0 1-1.5.9l-.8 1.6h-3l-.8-1.6a7.8 7.8 0 0 1-1.5-.9l-1.7.2L4 16.4l.8-1.4a8 8 0 0 1 0-2l-.8-1.4 1.5-2.6 1.7.2a7.8 7.8 0 0 1 1.5-.9l.8-1.6h3l.8 1.6a7.8 7.8 0 0 1 1.5.9l1.7-.2 1.5 2.6-.8 1.4a8 8 0 0 1 0 2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect
        x="9"
        y="8"
        width="10"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={checked ? "toggle on" : "toggle"}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span />
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Close" className="ghost-button" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function sceneHasContent(scene: StoredScene | null): boolean {
  return Boolean(scene && Array.isArray(scene.elements) && scene.elements.length > 0);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export function App() {
  const [bootstrap, setBootstrap] = useState<QuickSketchBootstrap | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [scenePresent, setScenePresent] = useState(false);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneRef = useRef<StoredScene | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void electrobun.rpc.request.getBootstrap({}).then((nextBootstrap: QuickSketchBootstrap | undefined) => {
      if (!nextBootstrap || cancelled) {
        return;
      }

      sceneRef.current = nextBootstrap.scene;
      setScenePresent(sceneHasContent(nextBootstrap.scene));
      setBootstrap(nextBootstrap);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const settings = bootstrap?.settings ?? {
    showGrid: true,
    autoClearAfterCopyAndClose: true,
  };

  const shortcuts = bootstrap?.shortcuts ?? {
    toggleWindow: "Control+Shift+P",
    copyAndClose: "Control+Shift+Enter",
  };

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        loadScene: false,
        saveToActiveFile: false,
        export: false as const,
        clearCanvas: false,
        toggleTheme: false,
        changeViewBackgroundColor: false,
      },
    }),
    [],
  );

  function persistScene(scene: StoredScene) {
    const normalizedScene = normalizeStoredScene(scene);
    if (!normalizedScene) {
      return;
    }

    sceneRef.current = normalizedScene;
    setScenePresent(normalizedScene.elements.length > 0);

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      void electrobun.rpc.request.persistScene({ scene: normalizedScene });
    }, 180);
  }

  function updateSettings(nextSettings: QuickSketchSettings) {
    setBootstrap((prev) =>
      prev
        ? {
            ...prev,
            settings: nextSettings,
          }
        : prev,
    );
    void electrobun.rpc.request.persistSettings({ settings: nextSettings });
  }

  async function exportCurrentScene(): Promise<ExportImageResponse> {
    const api = apiRef.current;
    if (!api) {
      return { pngBase64: null, hasContent: false };
    }

    const elements = api.getSceneElements();
    if (!elements.length) {
      return { pngBase64: null, hasContent: false };
    }

    const blob = await exportToBlob({
      elements,
      appState: {
        ...api.getAppState(),
        exportBackground: true,
        viewBackgroundColor: "#fffdfa",
      },
      files: api.getFiles(),
      mimeType: "image/png",
    });

    return {
      pngBase64: await blobToDataUrl(blob),
      hasContent: true,
    };
  }

  async function handleCopy(andClose: boolean) {
    if (copying) {
      return;
    }

    setCopying(true);
    try {
      const result = await exportCurrentScene();
      if (!result.hasContent || !result.pngBase64) {
        await electrobun.rpc.request.notify({
          title: "Quick Sketch",
          body: "There is nothing to copy yet.",
        });
        return;
      }

      const response = await electrobun.rpc.request.writeClipboardImage({
        pngBase64: result.pngBase64,
      });

      if (!response?.ok) {
        await electrobun.rpc.request.notify({
          title: "Quick Sketch",
          body: "Clipboard export failed.",
        });
        return;
      }

      if (settings.autoClearAfterCopyAndClose && andClose) {
        apiRef.current?.resetScene();
      }

      if (andClose) {
        await electrobun.rpc.request.closeWindow({});
      }
    } finally {
      setCopying(false);
    }
  }

  bridge.exportPng = exportCurrentScene;
  bridge.clearScene = () => {
    apiRef.current?.resetScene();
  };

  if (!bootstrap) {
    return <div className="boot-screen">Loading Quick Sketch…</div>;
  }

  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="titlebar-left">
          <div aria-hidden="true" className="traffic-lights">
            <span className="traffic red" />
            <span className="traffic yellow" />
            <span className="traffic green" />
          </div>
          <span className="window-title">Quick Sketch</span>
        </div>

        <div className="titlebar-actions">
          <button className="ghost-button icon-only" onClick={() => setSettingsOpen(true)} type="button">
            <IconGear />
          </button>
          <button className="primary-button" disabled={copying} onClick={() => void handleCopy(true)} type="button">
            <IconCopy />
            <span>{copying ? "Copying…" : "Copy & Close"}</span>
          </button>
        </div>
      </header>

      <div className="utility-bar">
        <div className="shortcut-strip">
          <span>Toggle {shortcuts.toggleWindow}</span>
          <span>Copy {shortcuts.copyAndClose}</span>
        </div>
        <button className="text-button" onClick={() => void handleCopy(false)} type="button">
          Copy PNG
        </button>
      </div>

      <main className="canvas-shell">
        {!scenePresent ? (
          <div className="empty-state">
            <div className="empty-icon">
              <IconSpark />
            </div>
            <h1>Draw something quick</h1>
            <p>Sketch a diagram, copy it to clipboard, paste anywhere.</p>
            <p>Toggle with {shortcuts.toggleWindow}</p>
            <span>Pen tool&apos;s ready — just start drawing</span>
          </div>
        ) : null}

        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          gridModeEnabled={settings.showGrid}
          initialData={
            bootstrap.scene
              ? {
                  elements: bootstrap.scene.elements as any,
                  appState: bootstrap.scene.appState as any,
                  files: bootstrap.scene.files as BinaryFiles,
                }
              : {
                  appState: {
                    viewBackgroundColor: "#fffdfa",
                  },
                }
          }
          onChange={(elements, appState, files) => {
            persistScene({
              elements,
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridModeEnabled: appState.gridModeEnabled,
              },
              files: files as unknown as Record<string, unknown>,
            });
          }}
          theme="light"
          UIOptions={uiOptions}
        />
      </main>

      {settingsOpen ? (
        <Modal onClose={() => setSettingsOpen(false)} title="Settings">
          <div className="settings-group">
            <h3>Shortcuts</h3>
            <div className="settings-row">
              <span>Toggle Window</span>
              <code>{shortcuts.toggleWindow}</code>
            </div>
            <div className="settings-row">
              <span>Copy and close</span>
              <code>{shortcuts.copyAndClose}</code>
            </div>
          </div>

          <div className="settings-group">
            <h3>Behavior</h3>
            <div className="settings-row">
              <span>Auto-clear after copy and close</span>
              <Toggle
                checked={settings.autoClearAfterCopyAndClose}
                onChange={(value) =>
                  updateSettings({
                    ...settings,
                    autoClearAfterCopyAndClose: value,
                  })
                }
              />
            </div>
          </div>

          <div className="settings-group">
            <h3>Canvas</h3>
            <div className="settings-row">
              <span>Show grid</span>
              <Toggle
                checked={settings.showGrid}
                onChange={(value) =>
                  updateSettings({
                    ...settings,
                    showGrid: value,
                  })
                }
              />
            </div>
          </div>

          <div className="settings-group about">
            <h3>About</h3>
            <p>Quick Sketch v1.0</p>
            <p>Excalidraw inside Electrobun</p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
