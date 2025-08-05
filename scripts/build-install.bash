#!/bin/bash
set -eux 

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

rm -rf graphql-jump-*.vsix

npm run compile

npx vsce package

cursor --install-extension "graphql-jump-${CURRENT_VERSION}.vsix"
