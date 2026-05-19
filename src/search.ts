import * as fs from "fs";
import * as path from "path";

export type SearchResult = {
  file: string;
  line: number; // 0-based
  col: number; // 0-based
};

export function collectGraphqlFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectGraphqlFiles(fullPath));
    } else if (/\.(graphql|gql)$/.test(entry.name) && !entry.name.includes("persisted")) {
      results.push(fullPath);
    }
  }
  return results;
}

export function searchInFile(filePath: string, pattern: RegExp): SearchResult | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = pattern.exec(lines[i]);
    if (match) {
      return { file: filePath, line: i, col: match.index };
    }
  }
  return null;
}

export function findDefinition(base: string, files: string[]): SearchResult | null {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const opPattern = new RegExp(
    `\\b(query|mutation|subscription|fragment|enum)\\s+${escaped}\\b`,
    "i",
  );
  const fallbackPattern = new RegExp(`\\b${escaped}\\b`, "i");

  for (const pattern of [opPattern, fallbackPattern]) {
    for (const filePath of files) {
      const hit = searchInFile(filePath, pattern);
      if (hit) return hit;
    }
  }
  return null;
}

export function getWordAt(text: string, line: number, character: number): string | null {
  const lines = text.split("\n");
  if (line >= lines.length) return null;
  const lineText = lines[line];
  if (character >= lineText.length || !/\w/.test(lineText[character])) return null;
  let start = character;
  let end = character;
  while (start > 0 && /\w/.test(lineText[start - 1])) start--;
  while (end < lineText.length && /\w/.test(lineText[end])) end++;
  return lineText.slice(start, end) || null;
}

const SUFFIXES = ["Query", "Mutation", "Fragment", "Subscription"] as const;

export function stripSuffixes(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}
