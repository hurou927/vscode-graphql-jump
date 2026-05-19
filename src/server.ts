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
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { fileURLToPath, pathToFileURL } from "url";
import { collectGraphqlFiles, findDefinition, getWordAt, stripSuffixes } from "./search";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let workspaceRoot: string | null = null;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  if (params.workspaceFolders?.length) {
    workspaceRoot = fileURLToPath(params.workspaceFolders[0].uri);
  } else if (params.rootUri) {
    workspaceRoot = fileURLToPath(params.rootUri);
  } else if (params.rootPath) {
    workspaceRoot = params.rootPath;
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
    },
  };
});

const TS_LANGS = new Set(["typescript", "typescriptreact", "javascript", "javascriptreact"]);

connection.onDefinition((params: DefinitionParams): Location | null => {
  if (!workspaceRoot) return null;

  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const word = getWordAt(doc.getText(), params.position.line, params.position.character);
  if (!word) return null;

  const base = TS_LANGS.has(doc.languageId) ? stripSuffixes(word) : word;
  const files = collectGraphqlFiles(workspaceRoot);
  const result = findDefinition(base, files);
  if (!result) return null;

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
