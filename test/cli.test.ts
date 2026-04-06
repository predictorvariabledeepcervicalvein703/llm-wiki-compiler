import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { tmpdir } from "os";

const exec = promisify(execFile);
const CLI = path.resolve("dist/cli.js");

describe("CLI smoke tests", () => {
  beforeAll(async () => {
    if (!existsSync(CLI)) {
      await exec("npx", ["tsup"], { cwd: path.resolve(".") });
    }
  }, 30_000);
  it("prints help and exits 0", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toContain("llmwiki");
    expect(stdout).toContain("ingest");
    expect(stdout).toContain("compile");
    expect(stdout).toContain("query");
  });

  it("prints version", async () => {
    const { stdout } = await exec("node", [CLI, "--version"]);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("compile fails without ANTHROPIC_API_KEY", async () => {
    try {
      await exec("node", [CLI, "compile"], {
        env: { ...process.env, ANTHROPIC_API_KEY: "" },
      });
      expect.fail("should have thrown");
    } catch (err: unknown) {
      const error = err as { stderr?: string; code?: number };
      // Should exit with non-zero or print an error
      expect(error.code).not.toBe(0);
    }
  });

  it("ingest shows next-step hint", async () => {
    const cwd = path.join(tmpdir(), `llmwiki-test-ingest-${Date.now()}`);
    await mkdir(cwd, { recursive: true });
    const fixture = path.resolve("test/fixtures/sample-source.md");
    try {
      const { stdout } = await exec("node", [CLI, "ingest", fixture], { cwd });
      expect(stdout).toContain("Next: llmwiki compile");
    } finally {
      await rm(path.join(cwd, "sources"), { recursive: true, force: true });
      await rm(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  it("compile without sources does not show query hint", async () => {
    const cwd = path.join(tmpdir(), `llmwiki-test-compile-${Date.now()}`);
    await mkdir(path.join(cwd, "sources"), { recursive: true });
    try {
      const { stdout } = await exec("node", [CLI, "compile"], {
        cwd,
        env: { ...process.env, ANTHROPIC_API_KEY: "dummy" },
      });
      expect(stdout).not.toContain("Next: llmwiki query");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 30_000);
});
