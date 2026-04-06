# llmwiki

Compile raw sources into an interlinked markdown wiki.

Inspired by Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: instead of re-discovering knowledge at query time, compile it once into a persistent, browsable artifact that compounds over time.

## Who this is for

- **AI researchers and engineers** building persistent knowledge from papers, docs, and notes
- **Technical writers** compiling scattered sources into a structured, interlinked reference
- **Anyone with too many bookmarks** who wants a wiki instead of a graveyard of tabs

## Quick start

```bash
npm install -g llm-wiki-compiler
export ANTHROPIC_API_KEY=sk-...

llmwiki ingest https://some-article.com
llmwiki compile
llmwiki query "what is X?"
```

## Why not just RAG?

RAG retrieves chunks at query time. Every question re-discovers the same relationships from scratch. Nothing accumulates.

llmwiki **compiles** your sources into a wiki. Concepts get their own pages. Pages link to each other. When you ask a question with `--save`, the answer becomes a new page, and future queries use it as context. Your explorations compound.

This is complementary to RAG, not a replacement. RAG is great for ad-hoc retrieval over large corpora. llmwiki gives you a persistent, structured artifact to retrieve from.

```
RAG:     query → search chunks → answer → forget
llmwiki: sources → compile → wiki → query → save → richer wiki → better answers
```

## How it works

```
sources/  →  SHA-256 hash check  →  LLM concept extraction  →  wiki page generation  →  [[wikilink]] resolution  →  index.md
```

**Two-phase pipeline.** Phase 1 extracts all concepts from all sources. Phase 2 generates pages. This eliminates order-dependence, catches failures before writing anything, and merges concepts shared across multiple sources into single pages.

**Incremental.** Only changed sources go through the LLM. Everything else is skipped via hash-based change detection.

**Compounding queries.** `llmwiki query --save` writes the answer as a wiki page and immediately rebuilds the index. Saved answers show up in future queries as context.

### What it produces

A raw source like a Wikipedia article on knowledge compilation becomes a structured wiki page:

```yaml
---
title: Knowledge Compilation
summary: Techniques for converting knowledge representations into forms that support efficient reasoning.
sources:
  - knowledge-compilation.md
createdAt: "2026-04-05T12:00:00Z"
updatedAt: "2026-04-05T12:00:00Z"
---
```

```markdown
Knowledge compilation refers to a family of techniques for pre-processing
a knowledge base into a target language that supports efficient queries.

Related concepts: [[Propositional Logic]], [[Model Counting]]
```

Pages include source attribution in frontmatter. Provenance is page-level today, not claim-level.

## Commands

| Command | What it does |
|---------|-------------|
| `llmwiki ingest <url\|file>` | Fetch a URL or copy a local file into `sources/` |
| `llmwiki compile` | Incremental compile: extract concepts, generate wiki pages |
| `llmwiki query "question"` | Ask questions against your compiled wiki |
| `llmwiki query "question" --save` | Answer and save the result as a wiki page |
| `llmwiki watch` | Auto-recompile when `sources/` changes |

## Output

```
wiki/
  concepts/     one .md file per concept, with YAML frontmatter
  queries/      saved query answers, included in index and retrieval
  index.md      auto-generated table of contents
```

Obsidian-compatible. `[[wikilinks]]` resolve to concept titles.

## Demo

Try it on any article or document:

```bash
mkdir my-wiki && cd my-wiki
llmwiki ingest https://en.wikipedia.org/wiki/Knowledge_compilation
llmwiki compile
llmwiki query "how does knowledge compilation work?"
```

See `examples/basic/` in the repo for pre-generated output you can browse without an API key.

## Limitations

Early software. Best for small, high-signal corpora (a few dozen sources). Query routing is index-based. Provenance is page-level, not claim-level. Anthropic-only for now.

**Honest about truncation.** Sources that exceed the character limit are truncated on ingest with `truncated: true` and the original character count recorded in frontmatter, so downstream consumers know they're working with partial content.

## Karpathy's LLM Wiki pattern vs this compiler

Karpathy describes an abstract pattern for turning raw data into compiled knowledge. Here's how llmwiki maps to it:

| Karpathy's concept | llmwiki | Status |
|---|---|---|
| Data ingest | `llmwiki ingest` | Implemented |
| Compile wiki | `llmwiki compile` | Implemented |
| Q&A | `llmwiki query` | Implemented |
| Output filing (save answers back) | `llmwiki query --save` | Implemented |
| Auto-recompile | `llmwiki watch` | Implemented |
| Linting / health-check pass | — | Not yet implemented (`watch` is auto-recompile, not lint) |
| Image support | — | Not yet implemented |
| Marp slides | — | Not yet implemented |
| Fine-tuning | — | Not yet implemented |

## Roadmap

- Multi-provider support (OpenAI, local models)
- Better provenance (claim-level source attribution)
- Larger-corpus query strategy (semantic search, embeddings)
- Deeper Obsidian integration
- Linting pass for wiki quality checks

If you want to contribute, these are the highest-leverage areas right now. Issues and PRs are welcome.

## Requirements

Node.js >= 18, an Anthropic API key.

## License

MIT


## Disclaimer

No LLMs were harmed in the making of this repo.
