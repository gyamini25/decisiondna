"use client";

import { MemoryGraph } from "@/components/MemoryGraph";
import { useJson } from "@/lib/use-fetch";
import { Skeleton } from "@/components/ui/primitives";
import type { GraphData } from "@/lib/memory/graph-builder";

export default function MemoryGraphPage() {
  const { data, loading } = useJson<GraphData>("/api/memory-graph");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Memory Graph</h1>
        <p className="text-xs text-ink-soft">
          Relationships between decisions, stakeholders, risks, and outcomes.
        </p>
      </div>
      {loading || !data ? (
        <Skeleton className="h-[560px]" />
      ) : (
        <MemoryGraph data={data} />
      )}
    </div>
  );
}
