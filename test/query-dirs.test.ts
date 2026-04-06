import { describe, it, expect, beforeEach } from "vitest";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { buildFrontmatter } from "../src/utils/markdown.js";
import { loadSelectedPages } from "../src/commands/query.js";

/**
 * Tests that the query system loads pages from both wiki/concepts/ and
 * wiki/queries/ directories. Calls the real loadSelectedPages function
 * to validate the actual multi-directory lookup behavior.
 *
 * Validates the "compounding knowledge" principle: saved query answers
 * become retrievable context for future queries.
 */

/** Create a temp wiki structure. */
async function makeTempRoot(): Promise<string> {
  const root = path.join(os.tmpdir(), `llmwiki-qdir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(path.join(root, "wiki/concepts"), { recursive: true });
  await mkdir(path.join(root, "wiki/queries"), { recursive: true });
  return root;
}

/** Write a wiki page to a specific directory. */
async function writePage(dir: string, slug: string, title: string, body: string): Promise<void> {
  const fm = buildFrontmatter({ title, summary: `Summary of ${title}` });
  await writeFile(path.join(dir, `${slug}.md`), `${fm}\n\n${body}\n`);
}

describe("query page loading from multiple directories", () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempRoot();
  });

  it("loads concept pages from wiki/concepts/", async () => {
    await writePage(path.join(root, "wiki/concepts"), "neural-networks", "Neural Networks", "Deep learning basics.");

    const result = await loadSelectedPages(root, ["neural-networks"]);
    expect(result).toContain("Neural Networks");
    expect(result).toContain("Deep learning basics.");
    expect(result).toContain("--- Page: neural-networks ---");
  });

  it("loads saved query pages from wiki/queries/", async () => {
    await writePage(path.join(root, "wiki/queries"), "what-is-backprop", "What is Backprop?", "Backpropagation explained.");

    const result = await loadSelectedPages(root, ["what-is-backprop"]);
    expect(result).toContain("What is Backprop?");
    expect(result).toContain("Backpropagation explained.");
  });

  it("loads pages from both directories in a single query", async () => {
    await writePage(path.join(root, "wiki/concepts"), "transformers", "Transformers", "Attention is all you need.");
    await writePage(path.join(root, "wiki/queries"), "how-do-transformers-work", "How do Transformers work?", "They use self-attention.");

    const result = await loadSelectedPages(root, ["transformers", "how-do-transformers-work"]);
    expect(result).toContain("--- Page: transformers ---");
    expect(result).toContain("--- Page: how-do-transformers-work ---");
    expect(result).toContain("Attention is all you need.");
    expect(result).toContain("They use self-attention.");
  });

  it("prefers concepts/ over queries/ for same slug", async () => {
    await writePage(path.join(root, "wiki/concepts"), "attention", "Attention (Concept)", "The concept version.");
    await writePage(path.join(root, "wiki/queries"), "attention", "Attention (Query)", "The query version.");

    const result = await loadSelectedPages(root, ["attention"]);
    expect(result).toContain("Attention (Concept)");
    expect(result).not.toContain("Attention (Query)");
  });

  it("skips missing pages without failing", async () => {
    await writePage(path.join(root, "wiki/concepts"), "exists", "Exists", "This page exists.");

    const result = await loadSelectedPages(root, ["exists", "does-not-exist"]);
    expect(result).toContain("--- Page: exists ---");
    expect(result).not.toContain("--- Page: does-not-exist ---");
  });

  it("returns empty string when no pages found", async () => {
    const result = await loadSelectedPages(root, ["nonexistent"]);
    expect(result).toBe("");
  });

  it("skips orphaned pages from query results", async () => {
    const orphanFm = buildFrontmatter({ title: "Stale Concept", summary: "Gone", orphaned: true });
    await writeFile(
      path.join(root, "wiki/concepts/stale-concept.md"),
      `${orphanFm}\n\nThis content should not appear.\n`,
    );
    await writePage(path.join(root, "wiki/concepts"), "fresh", "Fresh", "This is current.");

    const result = await loadSelectedPages(root, ["stale-concept", "fresh"]);
    expect(result).not.toContain("Stale Concept");
    expect(result).toContain("Fresh");
  });

  it("falls through to queries/ when concept is orphaned", async () => {
    const orphanFm = buildFrontmatter({ title: "Attention", summary: "Old", orphaned: true });
    await writeFile(
      path.join(root, "wiki/concepts/attention.md"),
      `${orphanFm}\n\nOrphaned concept.\n`,
    );
    await writePage(path.join(root, "wiki/queries"), "attention", "Attention (Query)", "Live query answer.");

    const result = await loadSelectedPages(root, ["attention"]);
    expect(result).toContain("Attention (Query)");
    expect(result).toContain("Live query answer.");
    expect(result).not.toContain("Orphaned concept.");
  });
});
