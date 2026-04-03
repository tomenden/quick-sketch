declare module "electrobun/bun" {
  export class BrowserView<TRPC = any> {
    static defineRPC<TRPC = any>(config: unknown): any;
  }

  export class BrowserWindow<TRPC = any> {
    constructor(options: unknown);
    webview: {
      on(event: string, handler: (...args: any[]) => void): void;
      rpc: any;
    };
    on(event: string, handler: (...args: any[]) => void): void;
    show(): void;
    minimize(): void;
    unminimize(): void;
    isMinimized?(): boolean;
    getFrame(): unknown;
  }

  export const GlobalShortcut: {
    register(accelerator: string, action: () => void): boolean;
    unregisterAll(): void;
  };

  export type UpdateStatusType =
    | "idle" | "checking" | "check-complete" | "no-update" | "update-available"
    | "downloading" | "download-starting" | "downloading-patch" | "applying-patch"
    | "patch-applied" | "patch-failed" | "downloading-full-bundle" | "download-progress"
    | "decompressing" | "download-complete" | "applying" | "extracting"
    | "replacing-app" | "launching-new-version" | "complete" | "error";

  export interface UpdateStatusEntry {
    status: UpdateStatusType;
    message: string;
    timestamp: number;
    details?: {
      currentHash?: string;
      latestHash?: string;
      progress?: number;
      bytesDownloaded?: number;
      totalBytes?: number;
      errorMessage?: string;
    };
  }

  export const Updater: {
    localInfo: {
      channel(): Promise<string>;
    };
    checkForUpdate(): Promise<{
      version: string;
      hash: string;
      updateAvailable: boolean;
      updateReady: boolean;
      error: string;
    }>;
    downloadUpdate(): Promise<void>;
    applyUpdate(): Promise<void>;
    onStatusChange(callback: ((entry: UpdateStatusEntry) => void) | null): void;
  };

  export const Utils: {
    paths: {
      userData: string;
    };
    clipboardWriteImage(data: Uint8Array): void;
    showNotification(input: { title: string; body?: string }): void;
    openExternal(url: string): boolean;
  };

  export const ApplicationMenu: {
    setApplicationMenu(menu: unknown[]): void;
    on(event: string, handler: (event: any) => void): void;
  };
}
