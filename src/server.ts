import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  DefinitionParams,
  Location,
  Range,
  Position,
  DidChangeWatchedFilesNotification,
  WatchKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { fileURLToPath, pathToFileURL } from "url";
import { collectGraphqlFiles, findDefinition, getWordAt, stripSuffixes } from "./search";

const log = (msg: string) => connection.console.log(msg);

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let workspaceRoot: string | null = null;
let cachedFiles: string[] | null = null;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  if (params.workspaceFolders?.length) {
    workspaceRoot = fileURLToPath(params.workspaceFolders[0].uri);
  } else if (params.rootUri) {
    workspaceRoot = fileURLToPath(params.rootUri);
  } else if (params.rootPath) {
    workspaceRoot = params.rootPath;
  }

  log(`initialized. workspaceRoot: ${workspaceRoot}`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      workspace: {
        fileOperations: {},
      },
    },
  };
});

connection.onInitialized(() => {
  connection.client.register(DidChangeWatchedFilesNotification.type, {
    watchers: [{ globPattern: "**/*.{graphql,gql}", kind: WatchKind.Create | WatchKind.Delete }],
  });
});

connection.onDidChangeWatchedFiles(() => {
  log("graphql files changed, invalidating cache");
  cachedFiles = null;
});

// VS Code: "typescript", "typescriptreact", "javascript", "javascriptreact"
// Zed:     "typescript", "tsx", "javascript", "jsx"
const TS_LANGS = new Set([
  "typescript",
  "typescriptreact",
  "tsx",
  "javascript",
  "javascriptreact",
  "jsx",
]);

connection.onDefinition((params: DefinitionParams): Location | null => {
  log(`onDefinition: ${params.textDocument.uri}`);

  if (!workspaceRoot) {
    log("no workspaceRoot");
    return null;
  }

  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    log("document not found in sync");
    return null;
  }

  const word = getWordAt(doc.getText(), params.position.line, params.position.character);
  if (!word) {
    log("no word at cursor");
    return null;
  }

  const base = TS_LANGS.has(doc.languageId) ? stripSuffixes(word) : word;
  log(`searching: "${base}" (original: "${word}", languageId: "${doc.languageId}")`);

  if (!cachedFiles) {
    cachedFiles = collectGraphqlFiles(workspaceRoot);
    log(`scanned ${cachedFiles.length} graphql files`);
  }

  const result = findDefinition(base, cachedFiles);
  if (!result) {
    log(`no match for "${base}"`);
    return null;
  }

  log(`found: ${result.file}:${result.line}`);

  return Location.create(
    pathToFileURL(result.file).toString(),
    Range.create(
      Position.create(result.line, result.col),
      Position.create(result.line, result.col),
    ),
  );
});

documents.listen(connection);
connection.listen();
