/**
 * Agent 2 — RetrieveHistoryAgent.
 *
 * SK plugin: given a detected decision, retrieves and scores similar historical
 * decisions from the decision memory (mock Azure AI Search hybrid retrieval),
 * returning ranked ScoredCandidates with the full four-signal breakdown.
 */

import type { DecisionDetection, ScoredCandidate } from "@/lib/types";
import type { LLMClient } from "@/lib/llm";
import { retrieveSimilar } from "@/lib/search";

export async function retrieveHistory(
  detection: DecisionDetection,
  contextText: string,
  llm: LLMClient,
  referenceDate?: string,
): Promise<ScoredCandidate[]> {
  // Enrich the query with proposal + surrounding discussion for better recall.
  const queryText = `${detection.proposal} ${contextText}`.trim();
  return retrieveSimilar(
    {
      text: queryText,
      direction: detection.direction,
      entities: detection.entities,
      referenceDate,
    },
    llm,
  );
}
