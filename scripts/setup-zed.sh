#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ZED_EXT_DIR="$ROOT_DIR/zed-extension"
ZED_INSTALLED_DIR="$HOME/Library/Application Support/Zed/extensions/installed/graphql-jump"

echo "Cleaning previous build..."
rm -f "$ZED_EXT_DIR/server.bundle.js"
rm -f "$ZED_EXT_DIR/target/wasm32-wasip1/release/graphql_jump_zed.wasm"
rm -rf "$ZED_INSTALLED_DIR" || true

echo "Building LSP server and Zed extension..."
npm run build:zed --prefix "$ROOT_DIR"

echo ""
echo "Done. Install the dev extension in Zed:"
echo ""
echo "  1. Cmd+Shift+P → 'zed: install dev extension'"
echo "  2. Select: $ZED_EXT_DIR"
echo ""
echo "Then add to ~/.config/zed/settings.json:"
echo ""
cat <<'EOF'
  "languages": {
    "TypeScript": { "language_servers": ["graphql-jump", "..."] },
    "TSX":        { "language_servers": ["graphql-jump", "..."] }
  }
EOF
