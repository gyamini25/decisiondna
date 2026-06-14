/**
 * Azure OpenAI client (used when MOCK_LLM=0).
 *
 * Uses the REST API directly via fetch — no SDK dependency. Embeddings come
 * from text-embedding-3-large; entity extraction and direction use a chat
 * deployment with JSON-mode output. Any failure throws; the factory in
 * lib/llm/index.ts decides whether to fall back to the mock.
 */

import type { Trend } from "@/lib/types";
import type { LLMClient } from "@/lib/llm";
import { mockExtractEntities, mockDetectDirection } from "@/lib/llm/mock-llm";

interface AzureConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  chatDeployment: string;
  embeddingDeployment: string;
}

export class AzureOpenAIClient implements LLMClient {
  readonly backend = "azure-openai" as const;
  private cfg: AzureConfig;

  constructor(cfg: AzureConfig) {
    this.cfg = cfg;
  }

  private url(deployment: string, op: string): string {
    const base = this.cfg.endpoint.replace(/\/$/, "");
    return `${base}/openai/deployments/${deployment}/${op}?api-version=${this.cfg.apiVersion}`;
  }

  /** fetch with exponential backoff on 429 / 5xx (Azure rate limits). */
  private async fetchWithRetry(
    url: string,
    body: unknown,
    retries = 4,
  ): Promise<Response> {
    let delay = 500;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": this.cfg.apiKey },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      const retriable = res.status === 429 || res.status >= 500;
      if (!retriable || attempt >= retries) return res;
      const retryAfter = Number(res.headers.get("retry-after")) * 1000;
      await new Promise((r) => setTimeout(r, retryAfter || delay));
      delay *= 2;
    }
  }

  async embed(text: string): Promise<number[]> {
    return (await this.embedBatch([text]))[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.fetchWithRetry(
      this.url(this.cfg.embeddingDeployment, "embeddings"),
      { input: texts },
    );
    if (!res.ok) throw new Error(`Azure embeddings failed: ${res.status}`);
    const json = await res.json();
    // Preserve input order.
    return (json.data as { index: number; embedding: number[] }[])
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  // Entity + direction extraction use the deterministic heuristics: they're
  // instant, free, and reproducible. Azure is reserved for the high-value
  // EMBEDDING signal — which avoids dozens of slow reasoning-model calls per
  // request (gpt-5 latency) that would time out on serverless. The Azure chat
  // method below remains available (gpt-5-compatible) for narrative use.
  async extractEntities(text: string): Promise<string[]> {
    return mockExtractEntities(text);
  }

  async detectDirection(text: string): Promise<Trend> {
    return mockDetectDirection(text);
  }

  async chat(system: string, user: string): Promise<string> {
    // No temperature/max_tokens → compatible with gpt-5 reasoning models.
    const res = await this.fetchWithRetry(
      this.url(this.cfg.chatDeployment, "chat/completions"),
      {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
    );
    if (!res.ok) throw new Error(`Azure chat failed: ${res.status}`);
    const json = await res.json();
    return json.choices[0].message.content as string;
  }
}

export function azureConfigFromEnv(): AzureConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !apiKey) return null;
  return {
    endpoint,
    apiKey,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4o",
    embeddingDeployment:
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-large",
  };
}
