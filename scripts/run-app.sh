#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/dist/QuickSketch.app"
APP_NAME="QuickSketch"

"$ROOT_DIR/scripts/build-app.sh"

osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
sleep 0.2
open "$APP_DIR"
