/**
 * Agent 3 — EvidenceScoringAgent.
 *
 * SK plugin: turns ranked ScoredCandidates into UI-ready MatchCards and applies
 * the confidence gate that decides whether the pipeline proceeds or abstains.
 * The per-card match % is the semantic similarity; the full four-signal
 * breakdown + confidence travel with the card for the audit tooltip.
 */

import type { Citation, MatchCard, ScoredCandidate } from "@/lib/types";
import { DEFAULT_CONFIDENCE_THRESHOLD, surfaces } from "@/lib/confidence";

export function toMatchCard(c: ScoredCandidate): MatchCard {
  return {
    decisionId: c.record.id,
    title: c.record.title,
    date: c.record.dateProposed,
    impact: c.record.impactLevel,
    matchPct: Math.round(c.signals.semantic * 100),
    signals: c.signals,
    confidence: c.confidence,
    evidence: c.record.evidence,
    outcomeSummary: c.record.outcome.summary,
    netAssessment: c.record.outcome.netAssessment,
  };
}

export interface EvidenceGate {
  confident: ScoredCandidate[];
  weak: ScoredCandidate[];
  top: ScoredCandidate | null;
  abstain: boolean;
}

/**
 * Split candidates into confident (≥ threshold) and weak, and decide abstention
 * (no candidate clears the threshold). Threshold is configurable (Settings).
 */
export function gateEvidence(
  ranked: ScoredCandidate[],
  threshold: number = envThreshold(),
): EvidenceGate {
  // Abstention protocol: confident = signals agree (C ≥ threshold) AND evidence
  // is genuinely strong (S_final ≥ relevance floor).
  const confident = ranked.filter((c) =>
    surfaces(c.confidence.confidence, c.sFinal, threshold),
  );
  const weak = ranked.filter(
    (c) => !surfaces(c.confidence.confidence, c.sFinal, threshold),
  );
  return {
    confident,
    weak,
    top: ranked[0] ?? null,
    abstain: confident.length === 0,
  };
}

export function buildCitations(candidates: ScoredCandidate[]): Citation[] {
  const citations: Citation[] = [];
  for (const c of candidates) {
    for (const s of c.record.evidence.sources) {
      citations.push({
        decisionId: c.record.id,
        title: c.record.title,
        date: c.record.dateProposed,
        sourceType: s.type,
        ref: s.ref,
        quality: s.quality,
      });
    }
  }
  return citations;
}

export function aggregateEvidenceTotals(candidates: ScoredCandidate[]) {
  return candidates.reduce(
    (acc, c) => {
      acc.meetings += c.record.evidence.meetings;
      acc.emails += c.record.evidence.emails;
      acc.documents += c.record.evidence.documents;
      acc.chats += c.record.evidence.sources.filter(
        (s) => s.type === "chat",
      ).length;
      return acc;
    },
    { meetings: 0, emails: 0, documents: 0, chats: 0 },
  );
}

export function envThreshold(): number {
  const v = Number(process.env.DECISIONDNA_CONFIDENCE_THRESHOLD);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_CONFIDENCE_THRESHOLD;
}
