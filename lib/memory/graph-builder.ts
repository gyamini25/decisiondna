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
  /** Human-readable description shown in the node detail panel. */
  description: string;
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

const RISK_DESCRIPTIONS: Record<string, string> = {
  customer: "Customer-facing impact — satisfaction (CSAT), churn, and wait/response times.",
  operational: "Operational impact — coverage gaps, backlog, and incident response (MTTR).",
  financial: "Financial impact — cost, revenue, margin, and budget overruns.",
  execution: "Execution impact — delivery velocity, rollout risk, and ramp time.",
};

const OUTCOME_DESCRIPTIONS: Record<string, string> = {
  positive: "Decisions that produced a net-positive outcome.",
  negative: "Decisions that produced a net-negative outcome (often later reversed).",
  mixed: "Decisions with mixed results — gains offset by unintended costs.",
  neutral: "Decisions with neutral or not-yet-final outcomes.",
};

/** Per-stakeholder stats for node descriptions. */
function stakeholderStats(records: DecisionRecord[]) {
  const stats = new Map<
    string,
    { role: string; decisions: Set<string>; validated: number; total: number }
  >();
  const ensure = (name: string, role: string) => {
    const s = stats.get(name) ?? {
      role,
      decisions: new Set<string>(),
      validated: 0,
      total: 0,
    };
    if (role && (!s.role || s.role === "Decision owner")) s.role = role;
    stats.set(name, s);
    return s;
  };
  for (const r of records) {
    ensure(r.owner, "Decision owner").decisions.add(r.id);
    for (const o of r.objections) {
      const s = ensure(o.raisedBy, o.role);
      s.decisions.add(r.id);
      s.total += 1;
      if (
        o.result === "validated" ||
        o.result === "partially-validated" ||
        o.result === "recommendation-proven"
      ) {
        s.validated += 1;
      }
    }
  }
  return stats;
}

export function buildMemoryGraph(records: DecisionRecord[] = getCorpus()): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const people = stakeholderStats(records);

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
      description: OUTCOME_DESCRIPTIONS[bucket] ?? "Decision outcome bucket.",
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
      description: RISK_DESCRIPTIONS[rt],
    });
  }

  for (const r of records) {
    upsert({
      id: r.id,
      label: r.title,
      type: "decision",
      weight: Math.max(0.4, r.evidenceSignals.confidence),
      description: `${r.proposal} — outcome: ${r.outcome.netAssessment}.`,
      meta: {
        date: r.dateProposed,
        impact: r.impactLevel,
        confidence: r.evidenceSignals.confidence,
        outcome: r.outcome.netAssessment,
      },
    });

    // Owner + objectors → stakeholder nodes + edges.
    const involved = [
      { name: r.owner, rel: "owns" },
      ...r.objections.map((o) => ({ name: o.raisedBy, rel: "objected" })),
    ];
    for (const p of involved) {
      const sid = `person:${p.name.toLowerCase().replace(/\s+/g, "-")}`;
      const st = people.get(p.name);
      const desc = st
        ? st.total > 0
          ? `${st.role} · involved in ${st.decisions.size} decisions · ${st.validated}/${st.total} predictions validated`
          : `${st.role} · involved in ${st.decisions.size} decisions`
        : "Stakeholder";
      upsert({
        id: sid,
        label: p.name,
        type: "stakeholder",
        weight: 0.5,
        description: desc,
        meta: st
          ? { role: st.role, decisions: st.decisions.size, validated: `${st.validated}/${st.total}` }
          : undefined,
      });
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
