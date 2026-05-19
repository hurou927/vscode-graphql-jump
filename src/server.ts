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
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { collectGraphqlFiles, findDefinition, getWordAt, stripSuffixes } from "./search";

const LOG_FILE = path.join(os.homedir(), ".graphql-jump.log");
const log = (msg: string) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
};

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

  log(`initialized. workspaceRoot: ${workspaceRoot}`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
    },
  };
});

const TS_LANGS = new Set(["typescript", "typescriptreact", "javascript", "javascriptreact"]);

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
  log(`searching: "${base}" (original: "${word}")`);

  const files = collectGraphqlFiles(workspaceRoot);
  log(`found ${files.length} graphql files`);

  const result = findDefinition(base, files);
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
