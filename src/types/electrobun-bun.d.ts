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

  export const Updater: {
    localInfo: {
      channel(): Promise<string>;
    };
  };

  export const Utils: {
    paths: {
      userData: string;
    };
    clipboardWriteImage(data: Uint8Array): void;
    showNotification(input: { title: string; body?: string }): void;
  };
}
