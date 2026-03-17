#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Quick Sketch"
DMG_NAME="Quick-Sketch"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="build/dev-macos-arm64"
APP_PATH="${BUILD_DIR}/${APP_NAME}-dev.app"
DMG_DIR="build/dmg-staging"
DMG_PATH="build/${DMG_NAME}-${VERSION}.dmg"

if [ ! -d "$APP_PATH" ]; then
  echo "App not found at $APP_PATH — run 'yarn build' first."
  exit 1
fi

echo "Packaging ${APP_NAME} v${VERSION}..."

# Clean staging
rm -rf "$DMG_DIR" "$DMG_PATH"
mkdir -p "$DMG_DIR"

# Copy app bundle (rename to drop the -dev suffix)
cp -R "$APP_PATH" "${DMG_DIR}/${APP_NAME}.app"

# Create symlink to /Applications for drag-to-install
ln -s /Applications "${DMG_DIR}/Applications"

# Create the DMG
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$DMG_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

# Clean staging
rm -rf "$DMG_DIR"

echo ""
echo "Done: $DMG_PATH"
echo "Size: $(du -h "$DMG_PATH" | cut -f1)"
