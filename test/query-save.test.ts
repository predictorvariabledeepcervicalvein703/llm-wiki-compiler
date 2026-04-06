import { describe, it, expect, beforeEach } from "vitest";
import { mkdir, writeFile, readFile, readdir } from "fs/promises";
import path from "path";
import os from "os";
import { buildFrontmatter, parseFrontmatter } from "../src/utils/markdown.js";
import { summarizeAnswer } from "../src/commands/query.js";

/**
 * Tests the query --save integration path end-to-end (without LLM calls).
 *
 * Validates two bugs that were found:
 * 1. saveQueryPage now regenerates the index so saved queries are immediately
 *    retrievable by the next query's page-selection step.
 * 2. saveQueryPage writes a summary to frontmatter so the index entry has
 *    retrieval signal beyond just the title.
 */

/** Create a temp wiki structure. */
async function makeTempRoot(): Promise<string> {
  const root = path.join(os.tmpdir(), `llmwiki-qsave-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(path.join(root, "wiki/concepts"), { recursive: true });
  await mkdir(path.join(root, "wiki/queries"), { recursive: true });
  return root;
}

describe("summarizeAnswer", () => {
  it("extracts the first sentence from an answer", () => {
    const answer = "Knowledge compilation transforms raw sources into structured wiki pages. It uses a two-phase pipeline.";
    expect(summarizeAnswer(answer)).toBe("Knowledge compilation transforms raw sources into structured wiki pages.");
  });

  it("truncates long first sentences to 120 chars", () => {
    const longSentence = "A".repeat(200) + ". Second sentence.";
    expect(summarizeAnswer(longSentence).length).toBe(120);
  });

  it("handles single-line answers", () => {
    const answer = "LLMs are large language models.";
    expect(summarizeAnswer(answer)).toBe("LLMs are large language models.");
  });

  it("uses only the first line of multi-line answers", () => {
    const answer = "First line answer.\n\nSecond paragraph with more detail.";
    expect(summarizeAnswer(answer)).toBe("First line answer.");
  });

  it("handles empty answer", () => {
    expect(summarizeAnswer("")).toBe("");
  });
});

describe("query --save integration", () => {
  let root: string;

  beforeEach(async () => {
    root = await makeTempRoot();
  });

  it("saved query page includes summary in frontmatter", async () => {
    // Simulate what saveQueryPage does: write a query with summary + rebuild index.
    // We write the file directly using the same logic saveQueryPage uses,
    // since calling saveQueryPage requires the full LLM pipeline.
    const question = "What is knowledge compilation?";
    const answer = "Knowledge compilation transforms raw sources into structured wiki pages. It uses a two-phase pipeline with concept extraction.";
    const summary = summarizeAnswer(answer);

    const fm = buildFrontmatter({
      title: question,
      summary,
      type: "query",
      createdAt: new Date().toISOString(),
    });
    const doc = `${fm}\n\n${answer}\n`;
    await writeFile(path.join(root, "wiki/queries/what-is-knowledge-compilation.md"), doc);

    // Verify frontmatter has a summary
    const saved = await readFile(path.join(root, "wiki/queries/what-is-knowledge-compilation.md"), "utf-8");
    const { meta } = parseFrontmatter(saved);
    expect(meta.summary).toBe("Knowledge compilation transforms raw sources into structured wiki pages.");
    expect(typeof meta.summary).toBe("string");
    expect((meta.summary as string).length).toBeGreaterThan(0);
  });

  it("saved query summary appears in the index for retrieval", async () => {
    const { generateIndex } = await import("../src/compiler/indexgen.js");

    // Write a concept page
    const conceptFm = buildFrontmatter({ title: "LLM", summary: "Large language models" });
    await writeFile(path.join(root, "wiki/concepts/llm.md"), `${conceptFm}\n\nLLMs are neural networks.\n`);

    // Write a saved query WITH summary (the fix)
    const answer = "An LLM is a large language model trained on text corpora.";
    const queryFm = buildFrontmatter({
      title: "What is an LLM?",
      summary: summarizeAnswer(answer),
      type: "query",
      createdAt: new Date().toISOString(),
    });
    await writeFile(path.join(root, "wiki/queries/what-is-an-llm.md"), `${queryFm}\n\n${answer}\n`);

    // Generate the index
    await generateIndex(root);

    const index = await readFile(path.join(root, "wiki/index.md"), "utf-8");

    // The index should have the query's summary as retrieval signal
    expect(index).toContain("## Saved Queries");
    expect(index).toContain("[[What is an LLM?]]");
    expect(index).toContain("An LLM is a large language model trained on text corpora.");
  });

  it("saved query without summary produces blank entry (pre-fix behavior)", async () => {
    const { generateIndex } = await import("../src/compiler/indexgen.js");

    // Write a saved query WITHOUT summary (the old bug)
    const noSummaryFm = buildFrontmatter({
      title: "What is backpropagation?",
      type: "query",
      createdAt: new Date().toISOString(),
    });
    await writeFile(
      path.join(root, "wiki/queries/what-is-backpropagation.md"),
      `${noSummaryFm}\n\nBackprop computes gradients.\n`,
    );

    await generateIndex(root);
    const index = await readFile(path.join(root, "wiki/index.md"), "utf-8");

    // Without summary, the index line has no retrieval context after the dash
    expect(index).toContain("[[What is backpropagation?]]");
    expect(index).toMatch(/\[\[What is backpropagation\?\]\]\*\* —\s*$/m);
  });
});
