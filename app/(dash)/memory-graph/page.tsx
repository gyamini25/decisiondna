"use client";

import { MemoryGraph } from "@/components/MemoryGraph";
import { useJson } from "@/lib/use-fetch";
import { Card, Skeleton } from "@/components/ui/primitives";
import type { GraphData } from "@/lib/memory/graph-builder";

const TYPE_COLOR: Record<string, string> = {
  decision: "#6366f1",
  stakeholder: "#0ea5e9",
  risk: "#ef4444",
  outcome: "#10b981",
};

export default function MemoryGraphPage() {
  const { data, loading } = useJson<GraphData>("/api/memory-graph");

  const counts = (data?.nodes ?? []).reduce(
    (acc, n) => ((acc[n.type] = (acc[n.type] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Memory Graph</h1>
        <p className="text-xs text-ink-soft">
          Relationships between decisions, stakeholders, risks, and outcomes.
        </p>
      </div>

      {/* Context — what the whole graph represents */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-ink">
          Your organization&apos;s decision memory at a glance
        </p>
        <p className="mt-1 max-w-3xl text-xs text-ink-soft">
          Each <b className="text-ink">decision</b> is linked to the{" "}
          <b className="text-ink">stakeholders</b> who shaped it, the{" "}
          <b className="text-ink">risk dimensions</b> it triggered, and the{" "}
          <b className="text-ink">outcome</b> it produced — and to other decisions
          that share themes. <b className="text-ink">Node size</b> reflects a
          decision&apos;s confidence; <b className="text-ink">links</b> show
          participation and shared topics. Click any node for its details.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["decision", "stakeholder", "risk", "outcome"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />
              <b className="text-ink">{counts[t] ?? 0}</b> {t}s
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-ink-soft">
            <b className="text-ink">{data?.edges.length ?? 0}</b> relationships
          </span>
        </div>
      </Card>

      {loading || !data ? (
        <Skeleton className="h-[560px]" />
      ) : (
        <MemoryGraph data={data} />
      )}
    </div>
  );
}
