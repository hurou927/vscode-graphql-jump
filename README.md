# GraphQL Jump

Jump to GraphQL type definitions from TypeScript/JavaScript files.

LSP server として動作し、VS Code・Zed・Neovim に対応。

## 動作

1. TS/JS ファイルで GraphQL の型・オペレーション名にカーソルを置く
2. エディタの "Go to Definition" を実行
3. 対応する `.graphql` / `.gql` ファイルの定義にジャンプ

suffix は自動除去: `GetUserQuery` → `GetUser` として検索。

## VS Code

Marketplace またはローカルの `.vsix` からインストール。  
F12 / `cmd+click` / 右クリック → Go to Definition で動作。

## Zed

### 1. LSP サーバーをグローバルコマンドとして登録

```bash
cd /path/to/graphql-jump-extension
npm run compile
npm link
```

### 2. Dev Extension としてインストール

`Cmd+Shift+P` → `zed: install dev extension` → `zed-extension/` ディレクトリを選択。

### 3. settings.json に追加

```json
{
  "languages": {
    "TypeScript": {
      "language_servers": ["graphql-jump", "..."]
    },
    "TSX": {
      "language_servers": ["graphql-jump", "..."]
    }
  }
}
```

`gd` (Vim mode) または `F12` でジャンプ。

## Neovim

`nvim-lspconfig` を使う場合：

```bash
npm run compile && npm link
```

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
- `.graphql` または `.gql` ファイルがワークスペース内に存在すること
