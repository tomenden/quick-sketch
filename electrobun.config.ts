import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Quick Sketch",
    identifier: "dev.tome.quick-sketch",
    version: "0.0.10",
  },
  build: {
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    mac: {
      bundleCEF: false,
      icons: "App/QuickSketch.iconset",
      codesign: true,
      // Bun runtime requires these entitlements under hardened runtime.
      entitlements: {
        "com.apple.security.cs.allow-jit": true,
        "com.apple.security.cs.disable-library-validation": true,
        "com.apple.security.cs.allow-unsigned-executable-memory": true,
      },
    },
    linux: {
      bundleCEF: false,
      icon: "App/QuickSketch.iconset/icon_512x512.png",
    },
    win: {
      bundleCEF: false,
    },
  },
  release: {
    generatePatch: true,
    baseUrl: "https://github.com/tomenden/quick-sketch/releases/latest/download",
  },
  runtime: {
    exitOnLastWindowClosed: false,
  },
} satisfies ElectrobunConfig;
