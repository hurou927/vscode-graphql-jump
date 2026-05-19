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
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

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

function collectGraphqlFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectGraphqlFiles(fullPath));
    } else if (/\.(graphql|gql)$/.test(entry.name) && !entry.name.includes('persisted')) {
      results.push(fullPath);
    }
  }
  return results;
}

function searchInFile(filePath: string, pattern: RegExp): { line: number; col: number } | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = pattern.exec(lines[i]);
    if (match) {
      return { line: i, col: match.index };
    }
  }
  return null;
}

function findDefinition(base: string, files: string[]): Location | null {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opPattern = new RegExp(`\\b(query|mutation|subscription|fragment|enum)\\s+${escaped}\\b`, 'i');
  const fallbackPattern = new RegExp(`\\b${escaped}\\b`, 'i');

  for (const pattern of [opPattern, fallbackPattern]) {
    for (const filePath of files) {
      const hit = searchInFile(filePath, pattern);
      if (hit) {
        return Location.create(
          pathToFileURL(filePath).toString(),
          Range.create(Position.create(hit.line, hit.col), Position.create(hit.line, hit.col))
        );
      }
    }
  }
  return null;
}

function getWordAt(text: string, line: number, character: number): string | null {
  const lines = text.split('\n');
  if (line >= lines.length) return null;
  const lineText = lines[line];
  let start = character;
  let end = character;
  while (start > 0 && /\w/.test(lineText[start - 1])) start--;
  while (end < lineText.length && /\w/.test(lineText[end])) end++;
  return start === end ? null : lineText.slice(start, end);
}

const TS_LANGS = new Set(['typescript', 'typescriptreact', 'javascript', 'javascriptreact']);
const SUFFIXES = ['Query', 'Mutation', 'Fragment', 'Subscription'];

function stripSuffixes(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

connection.onDefinition((params: DefinitionParams): Location | null => {
  if (!workspaceRoot) return null;

  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const word = getWordAt(doc.getText(), params.position.line, params.position.character);
  if (!word) return null;

  const base = TS_LANGS.has(doc.languageId) ? stripSuffixes(word) : word;
  const files = collectGraphqlFiles(workspaceRoot);
  return findDefinition(base, files);
});

documents.listen(connection);
connection.listen();
