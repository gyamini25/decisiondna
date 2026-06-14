/**
 * Foundry IQ — agentic knowledge-retrieval layer.
 *
 * Implements the Microsoft Foundry IQ pattern for DecisionDNA: agentic retrieval
 * that connects enterprise sources, returns **cited, grounded** answers, and
 * applies grounding checks to reduce hallucination. It wraps the decision-memory
 * retriever (lib/search) and turns confident matches into evidence chunks with
 * citations, a source-diversity score, and a grounding verdict.
 *
 * In production this binds to an Azure AI Foundry knowledge base over the
 * SharePoint corpus + Cosmos memory; the contract (GroundingResult) is identical.
 */

import type { Citation, ScoredCandidate } from "@/lib/types";
import { buildCitations } from "@/lib/agents/scoreEvidence";

export interface EvidenceChunk {
  text: string;
  citation: Citation;
  relevanceScore: number;
}

export interface GroundingResult {
  chunks: EvidenceChunk[];
  citations: Citation[];
  totalEvidenceCount: number;
  /** Distinct source decisions backing the answer. */
  groundedSources: number;
  /** 0..1 — penalises answers grounded in a single document. */
  sourceDiversityScore: number;
  /** False when grounding is too thin to trust (drives the abstention story). */
  passed: boolean;
}

/**
 * Ground a set of confident candidates into cited evidence chunks with a
 * source-diversity check — the Foundry IQ "grounded, cited answer" contract.
 */
export function groundDecision(confident: ScoredCandidate[]): GroundingResult {
  const citations = buildCitations(confident);

  const chunks: EvidenceChunk[] = confident.flatMap((c) =>
    c.record.evidence.sources.map((s) => ({
      text: `${c.record.title}: ${c.record.outcome.summary}`,
      citation: {
        decisionId: c.record.id,
        title: c.record.title,
        date: c.record.dateProposed,
        sourceType: s.type,
        ref: s.ref,
        quality: s.quality,
      },
      relevanceScore: Math.round(c.rank * 100) / 100,
    })),
  );

  const totalEvidenceCount = confident.reduce(
    (n, c) =>
      n +
      c.record.evidence.meetings +
      c.record.evidence.emails +
      c.record.evidence.documents,
    0,
  );

  const groundedSources = new Set(citations.map((c) => c.decisionId)).size;
  const distinctRefs = new Set(citations.map((c) => c.ref)).size;
  const sourceDiversityScore = citations.length
    ? Math.round((distinctRefs / citations.length) * 100) / 100
    : 0;

  // Grounded when backed by real, reasonably diverse sources.
  const passed = groundedSources >= 1 && sourceDiversityScore >= 0.4;

  return {
    chunks,
    citations,
    totalEvidenceCount,
    groundedSources,
    sourceDiversityScore,
    passed,
  };
}
