"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const url_1 = require("url");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const search_1 = require("./search");
const LOG_FILE = path.join(os.homedir(), ".graphql-jump.log");
const log = (msg) => {
    const line = `${new Date().toISOString()} ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
};
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
let workspaceRoot = null;
connection.onInitialize((params) => {
    if (params.workspaceFolders?.length) {
        workspaceRoot = (0, url_1.fileURLToPath)(params.workspaceFolders[0].uri);
    }
    else if (params.rootUri) {
        workspaceRoot = (0, url_1.fileURLToPath)(params.rootUri);
    }
    else if (params.rootPath) {
        workspaceRoot = params.rootPath;
    }
    log(`initialized. workspaceRoot: ${workspaceRoot}`);
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            definitionProvider: true,
        },
    };
});
const TS_LANGS = new Set(["typescript", "typescriptreact", "javascript", "javascriptreact"]);
connection.onDefinition((params) => {
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
    const word = (0, search_1.getWordAt)(doc.getText(), params.position.line, params.position.character);
    if (!word) {
        log("no word at cursor");
        return null;
    }
    const base = TS_LANGS.has(doc.languageId) ? (0, search_1.stripSuffixes)(word) : word;
    log(`searching: "${base}" (original: "${word}")`);
    const files = (0, search_1.collectGraphqlFiles)(workspaceRoot);
    log(`found ${files.length} graphql files`);
    const result = (0, search_1.findDefinition)(base, files);
    if (!result) {
        log(`no match for "${base}"`);
        return null;
    }
    log(`found: ${result.file}:${result.line}`);
    return node_1.Location.create((0, url_1.pathToFileURL)(result.file).toString(), node_1.Range.create(node_1.Position.create(result.line, result.col), node_1.Position.create(result.line, result.col)));
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map