import { describe, it, expect } from "vitest";
import { slugify } from "../src/utils/markdown.js";

describe("slugify", () => {
  it("converts titles to lowercase hyphenated slugs", () => {
    expect(slugify("LLM Knowledge Bases")).toBe("llm-knowledge-bases");
  });

  it("strips apostrophes", () => {
    expect(slugify("Karpathy's Vision")).toBe("karpathys-vision");
  });

  it("strips smart quotes", () => {
    expect(slugify("Karpathy\u2019s Vision")).toBe("karpathys-vision");
  });

  it("strips punctuation", () => {
    expect(slugify("What is AI? (A Guide)")).toBe("what-is-ai-a-guide");
  });

  it("collapses multiple spaces into single hyphen", () => {
    expect(slugify("too   many    spaces")).toBe("too-many-spaces");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("already---hyphenated")).toBe("already-hyphenated");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-leading and trailing-")).toBe("leading-and-trailing");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("handles single word", () => {
    expect(slugify("Concept")).toBe("concept");
  });
});
