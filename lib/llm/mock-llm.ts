/**
 * Deterministic mock LLM — the demo-safe fallback (MOCK_LLM=1, default).
 *
 * - Embeddings: normalised term-frequency vectors over a hashed vocabulary.
 *   Cosine of these is genuine lexical similarity, so "reduce support staffing"
 *   really does rank the support-related corpus records highest — no network,
 *   no key, fully reproducible for the recorded demo.
 * - Entity extraction: significant-token + acronym + proper-noun heuristic.
 * - Direction: verb-keyword heuristic (reduce/cut → down, raise/grow → up).
 *
 * The contract is identical to the Azure OpenAI client, so the agent pipeline
 * is agnostic to which backend is live.
 */

import type { DecisionRecord, Trend } from "@/lib/types";
import type { LLMClient } from "@/lib/llm";
import corpusJson from "@/data/corpus/decisions.json";

const EMBED_DIM = 256;

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "her",
  "was", "one", "our", "out", "his", "has", "had", "how", "its", "who", "did",
  "yes", "this", "that", "with", "from", "they", "will", "would", "there",
  "their", "what", "about", "which", "when", "make", "like", "time", "just",
  "into", "than", "then", "them", "some", "could", "should", "been", "more",
  "also", "very", "much", "many", "such", "only", "over", "before", "after",
  "by", "to", "of", "in", "on", "a", "an", "is", "it", "we", "be", "as", "at",
  "or", "so", "up", "do", "if", "no", "us",
]);

const DOMAIN_ACRONYMS = new Set([
  "apac", "csat", "sla", "mttr", "tco", "finops", "opex", "saas", "p1", "rfp",
  "ltv", "cac", "emea",
]);

function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return raw
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map(stem);
}

/** Crude stemmer so "staffing"/"staff", "costs"/"cost" collide. */
function stem(w: string): string {
  return w
    .replace(/ing$/, "")
    .replace(/ies$/, "y")
    .replace(/(ss)$/, "$1")
    .replace(/s$/, "")
    .replace(/ed$/, "");
}

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * IDF table built once from the corpus so distinctive shared terms (e.g.
 * "apac", "staffing", "weekend") dominate the cosine over generic words.
 * This is what gives the lexical mock genuine discriminating power.
 */
let IDF: Map<string, number> | null = null;
let DEFAULT_IDF = 1;

function buildIdf(): Map<string, number> {
  if (IDF) return IDF;
  const records = corpusJson.records as unknown as DecisionRecord[];
  const docs = records.map((r) =>
    `${r.title}. ${r.proposal} ${r.tags.join(" ")} ${r.objections
      .map((o) => o.objection)
      .join(" ")} ${r.outcome.summary}`,
  );
  const N = docs.length;
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const tok of new Set(tokenize(d))) {
      df.set(tok, (df.get(tok) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [tok, count] of df) {
    idf.set(tok, Math.log((N + 1) / (count + 1)) + 1);
  }
  // Unseen tokens are treated as maximally distinctive.
  DEFAULT_IDF = Math.log((N + 1) / 1) + 1;
  IDF = idf;
  return idf;
}

/**
 * Concept clusters — a tiny synonym/concept map so the lexical mock behaves more
 * like real embeddings: "reduce staffing" and "cut headcount" share concept
 * dimensions and therefore score a high cosine. This lifts genuine matches into
 * the embedding-like range (≈ what Azure OpenAI returns) for the demo, without
 * faking scores — it is a better mock embedding model, not a hard-coded result.
 */
const CONCEPT_DEFS: Record<string, string[]> = {
  workforce: ["staffing", "staff", "headcount", "workforce", "fte", "hiring", "hire", "personnel", "employees"],
  support: ["support", "service", "helpdesk", "customer", "csat", "tier", "ticket"],
  reduce: ["reduce", "cut", "lower", "decrease", "trim", "shrink", "downsize", "reduction", "cutting", "freeze"],
  cost: ["cost", "opex", "spend", "budget", "operating", "savings", "expense", "optimize", "optimization"],
  pilot: ["pilot", "trial", "phased", "rollout"],
  region: ["apac", "region", "regional", "emea", "offshore", "weekend", "coverage"],
  automation: ["chatbot", "automation", "automate", "deflect", "deflection", "bot"],
  pricing: ["pricing", "price", "subscription"],
  retention: ["churn", "retention", "renewal"],
  restructure: ["restructure", "consolidate", "reorganization", "reorg"],
};

let CONCEPT_MAP: Map<string, string> | null = null;
function conceptOf(stemmed: string): string | undefined {
  if (!CONCEPT_MAP) {
    CONCEPT_MAP = new Map();
    for (const [concept, members] of Object.entries(CONCEPT_DEFS)) {
      for (const m of members) CONCEPT_MAP.set(stem(m), concept);
    }
  }
  return CONCEPT_MAP.get(stemmed);
}

export function mockEmbed(text: string): number[] {
  const idf = buildIdf();
  const v = new Array<number>(EMBED_DIM).fill(0);
  for (const tok of tokenize(text)) {
    const w = idf.get(tok) ?? DEFAULT_IDF;
    v[fnv1a(tok) % EMBED_DIM] += w;
    // Concept expansion: related synonyms share a concept dimension.
    const concept = conceptOf(tok);
    if (concept) v[fnv1a(`concept:${concept}`) % EMBED_DIM] += w * 1.9;
  }
  return v;
}

export function mockExtractEntities(text: string): string[] {
  const entities = new Set<string>();

  // Proper nouns (capitalised words not at sentence start heuristics aside).
  const caps = text.match(/\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?\b/g) ?? [];
  for (const c of caps) entities.add(c.toLowerCase());

  // Domain acronyms + significant tokens.
  for (const tok of tokenize(text)) {
    if (DOMAIN_ACRONYMS.has(tok)) entities.add(tok);
    else if (tok.length >= 4) entities.add(tok);
  }

  // Percentages / numbers as entities (metrics).
  const nums = text.match(/\d+(?:\.\d+)?%?/g) ?? [];
  for (const n of nums) entities.add(n);

  return [...entities];
}

export function mockDetectDirection(text: string): Trend {
  const t = text.toLowerCase();
  const down = /\b(reduce|cut|lower|decrease|shrink|freeze|downsize|consolidat|outsourc|trim|slash)/;
  const up = /\b(increase|raise|grow|expand|boost|scale up|hire|add|invest)/;
  if (down.test(t)) return "down";
  if (up.test(t)) return "up";
  return "flat";
}

export class MockLLMClient implements LLMClient {
  readonly backend = "mock" as const;

  async embed(text: string): Promise<number[]> {
    return mockEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(mockEmbed);
  }

  async extractEntities(text: string): Promise<string[]> {
    return mockExtractEntities(text);
  }

  async detectDirection(text: string): Promise<Trend> {
    return mockDetectDirection(text);
  }

  async chat(_system: string, user: string): Promise<string> {
    // The pipeline derives structured reasoning deterministically from
    // retrieval + scoring; this is only a narrative fallback.
    return `Based on historical evidence, ${user.slice(0, 120)}`;
  }
}
