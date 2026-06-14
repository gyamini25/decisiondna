/**
 * Build the organizational memory graph from the corpus: decisions linked to the
 * stakeholders who shaped them, the risk dimensions they triggered, the outcomes
 * they produced, and to each other via shared themes. Shape is consumed by the
 * Memory Graph screen (force-directed).
 */

import type { DecisionRecord } from "@/lib/types";
import { getCorpus } from "@/lib/search";

export type GraphNodeType =
  | "decision"
  | "stakeholder"
  | "risk"
  | "outcome";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  /** 0..1 — drives node radius. */
  weight: number;
  meta?: Record<string, string | number>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const OUTCOME_BUCKETS: Record<string, string> = {
  positive: "outcome:positive",
  negative: "outcome:negative",
  mixed: "outcome:mixed",
  neutral: "outcome:neutral",
};

export function buildMemoryGraph(records: DecisionRecord[] = getCorpus()): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const upsert = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };

  // Outcome buckets.
  for (const [bucket, id] of Object.entries(OUTCOME_BUCKETS)) {
    upsert({
      id,
      label: `${bucket[0].toUpperCase()}${bucket.slice(1)} outcome`,
      type: "outcome",
      weight: 0.6,
    });
  }

  // Risk-dimension nodes.
  const riskTypes = ["customer", "operational", "financial", "execution"];
  for (const rt of riskTypes) {
    upsert({
      id: `risk:${rt}`,
      label: `${rt[0].toUpperCase()}${rt.slice(1)} risk`,
      type: "risk",
      weight: 0.5,
    });
  }

  for (const r of records) {
    upsert({
      id: r.id,
      label: r.title,
      type: "decision",
      weight: Math.max(0.4, r.evidenceSignals.confidence),
      meta: {
        date: r.dateProposed,
        impact: r.impactLevel,
        confidence: r.evidenceSignals.confidence,
        outcome: r.outcome.netAssessment,
      },
    });

    // Owner + objectors → stakeholder nodes + edges.
    const people = [
      { name: r.owner, rel: "owns" },
      ...r.objections.map((o) => ({ name: o.raisedBy, rel: "objected" })),
    ];
    for (const p of people) {
      const sid = `person:${p.name.toLowerCase().replace(/\s+/g, "-")}`;
      upsert({ id: sid, label: p.name, type: "stakeholder", weight: 0.5 });
      edges.push({ source: r.id, target: sid, label: p.rel, weight: 1 });
    }

    // Risk edges.
    for (const rm of r.risksMaterialized) {
      edges.push({
        source: r.id,
        target: `risk:${rm.type}`,
        label: "flagged",
        weight: rm.severity === "high" ? 3 : rm.severity === "medium" ? 2 : 1,
      });
    }

    // Outcome edge.
    const bucket = OUTCOME_BUCKETS[r.outcome.netAssessment] ?? OUTCOME_BUCKETS.neutral;
    edges.push({ source: r.id, target: bucket, label: "resulted in", weight: 1 });
  }

  // Decision ↔ decision similarity via shared tags (>= 2 shared).
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const shared = records[i].tags.filter((t) => records[j].tags.includes(t));
      if (shared.length >= 2) {
        edges.push({
          source: records[i].id,
          target: records[j].id,
          label: "similar to",
          weight: shared.length,
        });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}
