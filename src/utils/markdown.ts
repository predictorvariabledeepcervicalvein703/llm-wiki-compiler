/**
 * Markdown parsing and manipulation helpers.
 * Handles YAML frontmatter extraction, slugification, and atomic file writes
 * for wiki pages.
 */

import { writeFile, rename, readFile, mkdir } from "fs/promises";
import path from "path";
import yaml from "js-yaml";

/** Convert a human-readable concept title to a filename slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build YAML frontmatter string from key-value pairs. */
export function buildFrontmatter(fields: Record<string, unknown>): string {
  const dumped = yaml.dump(fields, { lineWidth: -1, quotingType: '"' }).trimEnd();
  return `---\n${dumped}\n---`;
}

/** Parse YAML frontmatter from a markdown string. Returns { meta, body }. */
export function parseFrontmatter(content: string): {
  meta: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }

  let meta: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === "object") {
      meta = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed YAML — return empty meta so callers degrade gracefully.
  }
  return { meta, body: match[2] };
}

/** Atomically write a file (write to .tmp, then rename). */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = filePath + ".tmp";
  await writeFile(tmpPath, content, "utf-8");
  await rename(tmpPath, filePath);
}

/** Read a file, returning empty string if it doesn't exist. */
export async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Validate that a wiki page has non-empty content and valid frontmatter.
 * Returns true if the page is valid.
 */
export function validateWikiPage(content: string): boolean {
  if (!content || content.trim().length === 0) return false;

  const { meta, body } = parseFrontmatter(content);
  if (!meta.title) return false;
  if (body.trim().length === 0) return false;

  return true;
}
