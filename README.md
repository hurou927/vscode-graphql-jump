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

## Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "lsp": {
    "graphql-jump": {
      "binary": {
        "path": "node",
        "arguments": ["/path/to/graphql-jump-extension/out/server.js"]
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

Use `gd` (Vim mode) or `F12` to jump.

## Neovim

Add to your config (requires `nvim-lspconfig`):

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.graphql_jump then
  configs.graphql_jump = {
    default_config = {
      cmd = { 'node', '/path/to/graphql-jump-extension/out/server.js', '--stdio' },
      filetypes = { 'typescript', 'typescriptreact', 'javascript', 'javascriptreact' },
      root_dir = lspconfig.util.root_pattern('package.json', '.git'),
    },
  }
end

lspconfig.graphql_jump.setup({})
```

Use `gd` to jump.

## Requirements

- Node.js 18+
- `.graphql` or `.gql` files in the workspace
