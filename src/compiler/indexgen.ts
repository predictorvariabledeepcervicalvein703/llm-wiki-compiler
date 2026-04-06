/**
 * Wiki index generator.
 *
 * Scans all concept pages in wiki/concepts/, extracts frontmatter metadata,
 * and produces wiki/index.md with a sorted list of all concepts and their
 * summaries. Used after each compilation pass.
 */

import { readdir } from "fs/promises";
import path from "path";
import { atomicWrite, safeReadFile, parseFrontmatter } from "../utils/markdown.js";
import { CONCEPTS_DIR, QUERIES_DIR, INDEX_FILE } from "../utils/constants.js";
import * as output from "../utils/output.js";
import type { PageSummary } from "../utils/types.js";

/**
 * Generate the wiki/index.md listing all concept pages with summaries.
 * @param root - Project root directory.
 */
export async function generateIndex(root: string): Promise<void> {
  output.status("*", output.info("Generating index..."));

  const conceptsPath = path.join(root, CONCEPTS_DIR);
  const queriesPath = path.join(root, QUERIES_DIR);
  const concepts = await collectPageSummaries(conceptsPath);
  const queries = await collectPageSummaries(queriesPath);

  concepts.sort((a, b) => a.title.localeCompare(b.title));
  queries.sort((a, b) => a.title.localeCompare(b.title));

  const indexContent = buildIndexContent(concepts, queries);
  const indexPath = path.join(root, INDEX_FILE);
  await atomicWrite(indexPath, indexContent);

  const total = concepts.length + queries.length;
  output.status("+", output.success(`Index updated with ${total} pages.`));
}

/**
 * Scan the concepts directory and extract page summaries from frontmatter.
 * @param conceptsPath - Absolute path to wiki/concepts/.
 * @returns Array of page summary objects.
 */
async function collectPageSummaries(
  conceptsPath: string,
): Promise<PageSummary[]> {
  let files: string[];

  try {
    files = await readdir(conceptsPath);
  } catch {
    return [];
  }

  const pages: PageSummary[] = [];

  for (const file of files.filter((f) => f.endsWith(".md"))) {
    const content = await safeReadFile(path.join(conceptsPath, file));
    const { meta } = parseFrontmatter(content);
    if (meta.title && typeof meta.title === "string" && !meta.orphaned) {
      pages.push({
        title: meta.title,
        slug: file.replace(/\.md$/, ""),
        summary: typeof meta.summary === "string" ? meta.summary : "",
      });
    }
  }

  return pages;
}

/** Strip [[wikilink]] brackets from text, leaving the inner text intact. */
function stripWikilinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/**
 * Build the index.md markdown content from page summaries.
 * @param pages - Sorted array of page summaries.
 * @returns Full index.md content string.
 */
function buildIndexContent(concepts: PageSummary[], queries: PageSummary[]): string {
  const lines = ["# Knowledge Wiki", "", "## Concepts", ""];

  for (const page of concepts) {
    lines.push(`- **[[${page.title}]]** — ${stripWikilinks(page.summary)}`);
  }

  if (queries.length > 0) {
    lines.push("", "## Saved Queries", "");
    for (const page of queries) {
      lines.push(`- **[[${page.title}]]** — ${stripWikilinks(page.summary)}`);
    }
  }

  const total = concepts.length + queries.length;
  lines.push("");
  lines.push(`_${total} pages | Generated ${new Date().toISOString()}_`);
  lines.push("");

  return lines.join("\n");
}
