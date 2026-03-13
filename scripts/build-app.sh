#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="QuickSketch"
BUILD_DIR="$ROOT_DIR/.build"
PRODUCT_DIR="$ROOT_DIR/dist"
APP_DIR="$PRODUCT_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
SOURCE_BINARY="$BUILD_DIR/debug/quick-sketch"

cd "$ROOT_DIR"

python3 "$ROOT_DIR/scripts/generate-app-icon.py"
swift build

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

cp "$ROOT_DIR/App/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$ROOT_DIR/App/QuickSketch.icns" "$RESOURCES_DIR/QuickSketch.icns"
cp "$SOURCE_BINARY" "$MACOS_DIR/$APP_NAME"
chmod +x "$MACOS_DIR/$APP_NAME"

cat <<EOF
Built app bundle:
  $APP_DIR

Launch with:
  open "$APP_DIR"
EOF
