import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "path";
import {
  collectGraphqlFiles,
  searchInFile,
  findDefinition,
  getWordAt,
  stripSuffixes,
} from "./search";

const FIXTURES = path.join(__dirname, "..", "test", "fixtures");

// ---------------------------------------------------------------------------
// stripSuffixes
// ---------------------------------------------------------------------------
describe("stripSuffixes", () => {
  it("strips Query suffix", () => assert.equal(stripSuffixes("GetUserQuery"), "GetUser"));
  it("strips Mutation suffix", () =>
    assert.equal(stripSuffixes("CreateProductMutation"), "CreateProduct"));
  it("strips Fragment suffix", () => assert.equal(stripSuffixes("UserBasicFragment"), "UserBasic"));
  it("strips Subscription suffix", () =>
    assert.equal(stripSuffixes("OnProductUpdatedSubscription"), "OnProductUpdated"));
  it("does not strip if word equals suffix", () => assert.equal(stripSuffixes("Query"), "Query"));
  it("does not strip unrelated word", () => assert.equal(stripSuffixes("User"), "User"));
});

// ---------------------------------------------------------------------------
// getWordAt
// ---------------------------------------------------------------------------
describe("getWordAt", () => {
  const text = "const GetUserQuery = gql`...`";

  it("returns word when cursor is in the middle of it", () =>
    assert.equal(getWordAt(text, 0, 10), "GetUserQuery"));

  it("returns word when cursor is at the start", () =>
    assert.equal(getWordAt(text, 0, 6), "GetUserQuery"));

  it("returns word when cursor is at the end", () =>
    assert.equal(getWordAt(text, 0, 17), "GetUserQuery"));

  it("returns null when cursor is on a space", () => assert.equal(getWordAt(text, 0, 5), null));

  it("returns null when line is out of range", () => assert.equal(getWordAt(text, 99, 0), null));
});

// ---------------------------------------------------------------------------
// collectGraphqlFiles
// ---------------------------------------------------------------------------
describe("collectGraphqlFiles", () => {
  it("finds .graphql files", () => {
    const files = collectGraphqlFiles(FIXTURES);
    assert.ok(files.some((f) => f.endsWith("user.graphql")));
    assert.ok(files.some((f) => f.endsWith("product.graphql")));
  });

  it('excludes files with "persisted" in the name', () => {
    const files = collectGraphqlFiles(FIXTURES);
    assert.ok(!files.some((f) => f.includes("persisted")));
  });

  it("returns empty array for non-existent directory", () => {
    const files = collectGraphqlFiles("/non/existent/path");
    assert.deepEqual(files, []);
  });
});

// ---------------------------------------------------------------------------
// searchInFile
// ---------------------------------------------------------------------------
describe("searchInFile", () => {
  const userFile = path.join(FIXTURES, "user.graphql");

  it("returns correct line and col for a match", () => {
    const result = searchInFile(userFile, /query GetUser/i);
    assert.ok(result !== null);
    assert.equal(result!.line, 6); // 0-based: "query GetUser" is on line 6
    assert.equal(result!.col, 0);
  });

  it("returns null when pattern does not match", () => {
    const result = searchInFile(userFile, /NonExistentType/i);
    assert.equal(result, null);
  });

  it("returns null for non-existent file", () => {
    const result = searchInFile("/no/such/file.graphql", /anything/);
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// findDefinition (integration)
// ---------------------------------------------------------------------------
describe("findDefinition", () => {
  const files = collectGraphqlFiles(FIXTURES);

  it("finds query by name", () => {
    const result = findDefinition("GetUser", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("user.graphql"));
  });

  it("finds fragment by name", () => {
    const result = findDefinition("UserBasic", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("user.graphql"));
  });

  it("finds mutation by name", () => {
    const result = findDefinition("CreateProduct", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("product.graphql"));
  });

  it("finds subscription by name", () => {
    const result = findDefinition("OnProductUpdated", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("product.graphql"));
  });

  it("finds enum by name", () => {
    const result = findDefinition("ProductStatus", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("product.graphql"));
  });

  it("finds type by name", () => {
    const result = findDefinition("User", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("user.graphql"));
  });

  it("finds input type by name", () => {
    const result = findDefinition("CreateProductInput", files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("product.graphql"));
  });

  it("returns null for unknown name", () => {
    const result = findDefinition("NonExistentType", files);
    assert.equal(result, null);
  });

  it("suffix stripping + findDefinition resolves correctly", () => {
    const base = stripSuffixes("GetUserQuery");
    const result = findDefinition(base, files);
    assert.ok(result !== null);
    assert.ok(result!.file.endsWith("user.graphql"));
  });
});
