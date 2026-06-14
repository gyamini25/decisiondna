/**
 * Unified read model for the Decisions registry: the corpus (historical
 * organizational memory) plus newly stored decisions, mapped to a single list
 * item shape for the UI.
 */

import type { DecisionRecord, StoredDecision } from "@/lib/types";
import { getCorpus, getRecord } from "@/lib/search";
import { getRepository } from "@/lib/memory/cosmos";

export interface DecisionListItem {
  id: string;
  proposal: string;
  proposer: string;
  date: string;
  category: string;
  risk: "High" | "Medium" | "Low";
  confidence: number;
  status: string;
  impact: string;
  source: "memory" | "new";
}

function corpusRisk(r: DecisionRecord): "High" | "Medium" | "Low" {
  if (r.risksMaterialized.some((x) => x.severity === "high")) return "High";
  if (r.risksMaterialized.some((x) => x.severity === "medium")) return "Medium";
  return "Low";
}

function fromCorpus(r: DecisionRecord): DecisionListItem {
  return {
    id: r.id,
    proposal: r.proposal,
    proposer: r.owner,
    date: r.dateProposed,
    category: r.category,
    risk: corpusRisk(r),
    confidence: r.evidenceSignals.confidence,
    status: r.status,
    impact: r.impactLevel,
    source: "memory",
  };
}

function fromStored(d: StoredDecision): DecisionListItem {
  return {
    id: d.id,
    proposal: d.proposal,
    proposer: d.proposer,
    date: d.createdAt.slice(0, 10),
    category: "New Decision",
    risk: d.risk?.overall ?? "Low",
    confidence: d.confidence.confidence,
    status: d.approvalStatus,
    impact: d.risk?.overall ?? "Medium",
    source: "new",
  };
}

export async function listAllDecisions(): Promise<DecisionListItem[]> {
  const stored = await getRepository().listDecisions();
  const corpus = getCorpus().map(fromCorpus);
  // Newest first; stored decisions on top.
  return [...stored.map(fromStored), ...corpus].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export async function getDecisionDetail(id: string) {
  const rec = getRecord(id);
  if (rec) return { kind: "memory" as const, record: rec };
  const stored = await getRepository().getDecision(id);
  if (stored) return { kind: "new" as const, decision: stored };
  return null;
}
