// VSCode GraphQL Jump Extension
// extension.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ripgrepを使ってGraphQLファイルを検索する関数
async function rgGraphql(pattern: string): Promise<string[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return [];
    }

    const cmd = `rg --line-number --column --no-heading --color=never --type-add 'graphql:*.{graphql,gql}' --ignore-case --type graphql '${pattern}' --glob '!*persisted*' "${workspaceFolder.uri.fsPath}"`;
    
    console.log(`DEBUG: Running command: ${cmd}  at ${workspaceFolder.uri.fsPath}`);
    vscode.window.showInformationMessage(`Searching: ${pattern} attt ${workspaceFolder.uri.fsPath}`);

    try {
        const { stdout, stderr } = await execAsync(cmd, { 
            cwd: workspaceFolder.uri.fsPath,
            timeout: 3000 // 10秒でタイムアウト
        });

        if (stderr) {
            console.warn(`ripgrep stderr: ${stderr}`);
        }

        if (!stdout || stdout.trim() === '') {
            return [];
        }
        
        return stdout.trim().split('\n').filter(line => line.length > 0);
    } catch (error: any) {
        if (error.code === 1) {
            // ripgrepの終了コード1は「マッチなし」を意味する
            return [];
        }
        console.error(`ripgrep error: ${error.message}`);
        vscode.window.showErrorMessage(`Search failed: ${error.message}`);
        return [];
    }
}

// ripgrepの出力から最初のヒットをパースする関数
function parseFirstHit(hits: string[]): { file: string; line: number; col: number } | null {
    if (hits.length === 0) {
        return null;
    }
    
    const firstHit = hits[0];
    console.log(`DEBUG: Parsing hit: ${firstHit}`);
    
    // ripgrepの出力形式: filename:line:column:content
    const match = firstHit.match(/^([^:]+):(\d+):(\d+):/);
    
    if (match) {
        const [, file, line, col] = match;
        return {
            file,
            line: parseInt(line, 10),
            col: parseInt(col, 10)
        };
    } else {
        console.warn(`DEBUG: Failed to parse hit: ${firstHit}`);
        return null;
    }
}

// ファイルを開いて指定位置にジャンプする関数
async function openLocation(file: string, line: number, col: number): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        
        // 相対パスを絶対パスに変換
        const absolutePath = path.isAbsolute(file) 
            ? file 
            : path.join(workspaceFolder.uri.fsPath, file);
        
        console.log(`DEBUG: Opening file ${absolutePath} at line ${line}, col ${col}`);
        
        // ファイルを開く
        const document = await vscode.workspace.openTextDocument(absolutePath);
        const editor = await vscode.window.showTextDocument(document);
        
        // カーソル位置を設定（VSCodeは0ベースのインデックス）
        const position = new vscode.Position(line - 1, Math.max(0, col - 1));
        editor.selection = new vscode.Selection(position, position);
        
        // 該当行を画面中央に表示
        editor.revealRange(
            new vscode.Range(position, position), 
            vscode.TextEditorRevealType.InCenter
        );
        
        console.log(`DEBUG: Successfully opened ${file} at line ${line}, col ${col}`);
        vscode.window.showInformationMessage(`Jumped to ${path.basename(file)}:${line}:${col}`);
        
    } catch (error: any) {
        console.error(`Failed to open location: ${error.message}`);
        vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
    }
}

// GraphQL定義にジャンプするメイン関数
async function goGraphql(term?: string): Promise<void> {
    let searchTerm = term;
    
    // 引数が指定されていない場合は、カーソル下の単語を取得
    if (!searchTerm) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        const document = editor.document;
        const position = editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(position);
        
        if (!wordRange) {
            vscode.window.showErrorMessage('No word at cursor position');
            return;
        }
        
        searchTerm = document.getText(wordRange);
    }
    
    if (!searchTerm) {
        vscode.window.showErrorMessage('No search term provided');
        return;
    }
    
    // 型名のsuffixを除去（...Query/Mutation/Fragment/Subscription[Type]）
    let base = searchTerm;
    base = base.replace(/Query$/, '');
    base = base.replace(/Mutation$/, '');
    base = base.replace(/Fragment$/, '');
    base = base.replace(/Subscription$/, '');
    if (base === '') {
        base = searchTerm;
    }

    console.log(`DEBUG: Searching for GraphQL definition: ${base} (original: ${searchTerm})`);

    // 1) query/mutation/subscription/fragment/enum <base> を優先
    const opPattern = `\\b(query|mutation|subscription|fragment|enum)\\s+${base}\\b`;
    let hits = await rgGraphql(opPattern);

    // 2) なければbaseの単語境界で再検索
    if (hits.length === 0) {
        console.log(`DEBUG: No operation matches, searching for word boundary: ${base}`);
        hits = await rgGraphql(`\\b${base}\\b`);
    }

    if (hits.length === 0) {
        vscode.window.showWarningMessage(`No matches: ${base} (.graphql only, excluding *persisted*)`);
        return;
    }

    console.log(`hits[0]: ${hits[0]}`);
    const result = parseFirstHit(hits);
    
    if (result) {
        await openLocation(result.file, result.line, result.col);
    } else {
        vscode.window.showErrorMessage('Failed to parse ripgrep output');
    }
}

// 拡張機能のアクティベーション
export function activate(context: vscode.ExtensionContext) {
    console.log('GraphQL Jump extension is now active!');

    // コマンドを登録
    const disposable = vscode.commands.registerCommand('graphql-jump.goGraphql', async (term?: string) => {
        await goGraphql(term);
    });

    context.subscriptions.push(disposable);

    // キーバインドのためのコマンドも登録（カーソル下の単語用）
    const disposableCurrentWord = vscode.commands.registerCommand('graphql-jump.goGraphqlCurrentWord', async () => {
        await goGraphql();
    });

    context.subscriptions.push(disposableCurrentWord);
}

export function deactivate() {
    console.log('GraphQL Jump extension is now deactivated');
}
