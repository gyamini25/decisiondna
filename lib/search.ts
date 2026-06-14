/**
 * Hybrid retrieval over the local decision corpus — the mock Azure AI Search.
 *
 * For each candidate we compute the four evidence signals against the query
 * proposal (vector cosine for semantic, entity Jaccard for grounding, recency
 * for temporal, trend match for directional), score with lib/scoring, and rank
 * by R = S_final · confidence. In production this layer is Azure AI Search
 * hybrid (keyword + vector) + the same scoring engine — the contract is the
 * ScoredCandidate[] consumed by the agent pipeline.
 */

import type { DecisionRecord, ScoredCandidate, SignalVector, Trend } from "@/lib/types";
import type { LLMClient } from "@/lib/llm";
import {
  cosineSimilarity,
  jaccard,
  recencyConsistency,
  directionalCorrectness,
  scoreCandidate,
  rankCandidates,
} from "@/lib/scoring";
import corpusJson from "@/data/corpus/decisions.json";

const CORPUS = corpusJson.records as unknown as DecisionRecord[];

export function getCorpus(): DecisionRecord[] {
  return CORPUS;
}

export function getRecord(id: string): DecisionRecord | undefined {
  return CORPUS.find((r) => r.id === id);
}

/** Concise text for the semantic signal (avoids dilution from long bodies). */
function semanticText(r: DecisionRecord): string {
  return `${r.title}. ${r.proposal} ${r.tags.join(" ")}`;
}

/** Fuller text for entity extraction (objections + outcome add real entities). */
function entityText(r: DecisionRecord): string {
  const objections = r.objections.map((o) => o.objection).join(" ");
  return `${r.title}. ${r.proposal} ${r.tags.join(" ")} ${objections} ${r.outcome.summary}`;
}

export interface SearchQuery {
  text: string;
  direction: Trend;
  /** Pre-extracted entities from the proposal/context (optional). */
  entities?: string[];
  /** Reference date for recency (meeting date). Defaults to corpus span. */
  referenceDate?: string;
}

/**
 * Candidate vectors depend only on the corpus + backend, so we compute them ONCE
 * and reuse them across every request. For Azure this turns ~13 embedding calls
 * per analysis into a single batched warm-up call (then zero per request) — the
 * production-equivalent of a pre-built AI Search vector index.
 */
interface CandidateCache {
  backend: string;
  embeddings: number[][];
  entities: string[][];
  directions: Trend[];
}
let cache: CandidateCache | null = null;

async function warmCandidates(llm: LLMClient): Promise<CandidateCache> {
  if (cache && cache.backend === llm.backend) return cache;
  const embeddings = await llm.embedBatch(CORPUS.map(semanticText));
  const entities = await Promise.all(
    CORPUS.map((r) => llm.extractEntities(entityText(r))),
  );
  const directions = await Promise.all(
    CORPUS.map((r) => llm.detectDirection(r.proposal)),
  );
  cache = { backend: llm.backend, embeddings, entities, directions };
  return cache;
}

/**
 * Score and rank the whole corpus against a query. Returns ScoredCandidate[]
 * sorted by rank descending.
 */
export async function retrieveSimilar(
  query: SearchQuery,
  llm: LLMClient,
): Promise<ScoredCandidate[]> {
  const referenceDate = query.referenceDate ?? new Date().toISOString();
  const cand = await warmCandidates(llm);

  const queryEmbedding = await llm.embed(query.text);
  const queryEntities =
    query.entities ?? (await llm.extractEntities(query.text));

  const scored: ScoredCandidate[] = CORPUS.map((record, i) => {
    const signals: SignalVector = {
      semantic: round2(cosineSimilarity(queryEmbedding, cand.embeddings[i])),
      entity: round2(jaccard(queryEntities, cand.entities[i])),
      temporal: round2(recencyConsistency(record.dateProposed, referenceDate)),
      directional: directionalCorrectness(query.direction, cand.directions[i]),
    };
    return scoreCandidate(signals, record);
  });

  return rankCandidates(scored);
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
