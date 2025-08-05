#!/bin/bash

rm -rf graphql-jump-1.0.0.vsix

npm run compile

npx vsce package

cursor --install-extension graphql-jump-1.0.0.vsix