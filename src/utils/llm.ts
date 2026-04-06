/**
 * Shared LLM helper wrapping the Anthropic SDK.
 * Provides callClaude() for both streaming and tool_use calls,
 * with retry logic and exponential backoff.
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODEL, RETRY_COUNT, RETRY_BASE_MS, RETRY_MULTIPLIER } from "./constants.js";

let client: Anthropic | null = null;

/** Get or create the Anthropic client singleton. */
export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CallClaudeOptions {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
  stream?: boolean;
  onToken?: (text: string) => void;
}

/**
 * Call Claude with retry logic. Supports both streaming and non-streaming modes.
 * For tool_use calls, returns the parsed tool input. For streaming calls, invokes
 * onToken for each text chunk and returns the full assembled text.
 */
export async function callClaude(options: CallClaudeOptions): Promise<string> {
  const { system, messages, tools, maxTokens = 4096, stream = false, onToken } = options;
  const anthropic = getClient();

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      if (stream) {
        return await callClaudeStreaming(anthropic, system, messages, maxTokens, onToken);
      }

      if (tools && tools.length > 0) {
        return await callClaudeToolUse(anthropic, system, messages, tools, maxTokens);
      }

      return await callClaudeBasic(anthropic, system, messages, maxTokens);
    } catch (error) {
      if (attempt === RETRY_COUNT) throw error;

      const delayMs = RETRY_BASE_MS * Math.pow(RETRY_MULTIPLIER, attempt);
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ API call failed (attempt ${attempt + 1}/${RETRY_COUNT + 1}): ${errMsg}`);
      console.warn(`  Retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }

  throw new Error("Unreachable");
}

async function callClaudeStreaming(
  anthropic: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  onToken?: (text: string) => void,
): Promise<string> {
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onToken?.(event.delta.text);
    }
  }

  return fullText;
}

async function callClaudeToolUse(
  anthropic: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  maxTokens: number,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    tools,
  });

  const toolBlock = response.content.find((block) => block.type === "tool_use");
  if (toolBlock && toolBlock.type === "tool_use") {
    return JSON.stringify(toolBlock.input);
  }

  // Fallback: return text content if no tool use
  const textBlock = response.content.find((block) => block.type === "text");
  if (textBlock && textBlock.type === "text") {
    return textBlock.text;
  }

  return "";
}

async function callClaudeBasic(
  anthropic: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (textBlock && textBlock.type === "text") {
    return textBlock.text;
  }

  return "";
}
