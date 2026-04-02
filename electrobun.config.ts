import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Quick Sketch",
    identifier: "dev.tome.quick-sketch",
    version: "0.1.0",
  },
  build: {
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    mac: {
      bundleCEF: false,
      icons: "App/QuickSketch.iconset",
    },
    linux: {
      bundleCEF: false,
      icon: "App/QuickSketch.iconset/icon_512x512.png",
    },
    win: {
      bundleCEF: false,
    },
  },
  scripts: {
    postWrap: "scripts/sign.ts",
  },
  release: {
    generatePatch: true,
    baseUrl: "https://github.com/tomenden/quick-sketch/releases/latest/download",
  },
  runtime: {
    exitOnLastWindowClosed: false,
  },
} satisfies ElectrobunConfig;
