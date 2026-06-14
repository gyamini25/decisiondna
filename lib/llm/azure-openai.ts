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

  private async chatJSON<T>(system: string, user: string): Promise<T> {
    const res = await this.fetchWithRetry(
      this.url(this.cfg.chatDeployment, "chat/completions"),
      {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      },
    );
    if (!res.ok) throw new Error(`Azure chat failed: ${res.status}`);
    const json = await res.json();
    return JSON.parse(json.choices[0].message.content) as T;
  }

  async extractEntities(text: string): Promise<string[]> {
    const out = await this.chatJSON<{ entities: string[] }>(
      "Extract named entities (people, orgs, products, metrics, locations) from the text. Respond as JSON {\"entities\": string[]} with lowercase values.",
      text,
    );
    return out.entities ?? [];
  }

  async detectDirection(text: string): Promise<Trend> {
    const out = await this.chatJSON<{ direction: Trend }>(
      'Classify the intended trend direction of the proposal as one of "up", "down", or "flat". Respond as JSON {"direction": "up"|"down"|"flat"}.',
      text,
    );
    return out.direction ?? "flat";
  }

  async chat(system: string, user: string): Promise<string> {
    const res = await this.fetchWithRetry(
      this.url(this.cfg.chatDeployment, "chat/completions"),
      {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
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
