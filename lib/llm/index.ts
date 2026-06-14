/**
 * LLM client factory.
 *
 * Returns the deterministic mock by default (MOCK_LLM=1 or unset) — the
 * demo-safe path with no external dependency. Set MOCK_LLM=0 with valid Azure
 * OpenAI env vars to use real embeddings + reasoning. If Azure is requested but
 * not configured, we fall back to the mock and log a warning rather than break
 * the demo.
 */

import type { Trend } from "@/lib/types";
import { MockLLMClient } from "@/lib/llm/mock-llm";
import { AzureOpenAIClient, azureConfigFromEnv } from "@/lib/llm/azure-openai";

export interface LLMClient {
  readonly backend: "mock" | "azure-openai";
  /** Embed text into a vector for cosine similarity. */
  embed(text: string): Promise<number[]>;
  /** Embed many texts at once (one API call for Azure). */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Extract named entities (lowercased) for Jaccard alignment. */
  extractEntities(text: string): Promise<string[]>;
  /** Classify the intended trend direction of a proposal. */
  detectDirection(text: string): Promise<Trend>;
  /** Free-form reasoning (narrative). */
  chat(system: string, user: string): Promise<string>;
}

let cached: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (cached) return cached;

  const useMock = (process.env.MOCK_LLM ?? "1") !== "0";
  if (useMock) {
    cached = new MockLLMClient();
    return cached;
  }

  const cfg = azureConfigFromEnv();
  if (!cfg) {
    console.warn(
      "[DecisionDNA] MOCK_LLM=0 but Azure OpenAI env vars are missing — falling back to deterministic mock.",
    );
    cached = new MockLLMClient();
    return cached;
  }

  cached = new AzureOpenAIClient(cfg);
  return cached;
}

/** For tests: reset the cached client between cases. */
export function __resetLLMClient(): void {
  cached = null;
}
