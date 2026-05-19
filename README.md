# GraphQL Jump

Jump to GraphQL type definitions from TypeScript/JavaScript files.

Implemented as an LSP server — works with VS Code, Zed, Neovim, and any LSP-compatible editor.

## How it works

1. Place cursor on a GraphQL type/operation name in a TS/JS file
2. Trigger "Go to Definition" in your editor
3. Jumps to the definition in the corresponding `.graphql` / `.gql` file

Suffixes are automatically stripped: `GetUserQuery` → searches for `GetUser`.

## VS Code

Install from the Marketplace or via `.vsix`. Uses F12 / `cmd+click` / right-click → Go to Definition.

## Zed / Neovim のセットアップ

まずグローバルコマンドとして登録する：

```bash
cd /path/to/graphql-jump-extension
npm run compile
npm link
```

### Zed

`~/.config/zed/settings.json` に追加：

```json
{
  "lsp": {
    "graphql-jump": {
      "binary": {
        "path": "graphql-jump-lsp"
      }
    }
  },
  "languages": {
    "TypeScript": {
      "language_servers": ["typescript-language-server", "graphql-jump"]
    },
    "TSX": {
      "language_servers": ["typescript-language-server", "graphql-jump"]
    }
  }
}
```

`gd` (Vim mode) または `F12` でジャンプ。

### Neovim

`nvim-lspconfig` を使う場合：

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.graphql_jump then
  configs.graphql_jump = {
    default_config = {
      cmd = { 'graphql-jump-lsp' },
      filetypes = { 'typescript', 'typescriptreact', 'javascript', 'javascriptreact' },
      root_dir = lspconfig.util.root_pattern('package.json', '.git'),
    },
  }
end

lspconfig.graphql_jump.setup({})
```

`gd` でジャンプ。

## Requirements

- Node.js 18+
- `.graphql` or `.gql` files in the workspace
