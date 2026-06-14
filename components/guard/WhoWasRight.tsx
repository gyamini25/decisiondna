"use client";

import { Avatar, Badge } from "@/components/ui/primitives";
import type { WhoWasRightCard } from "@/lib/types";

function verdictTone(v: WhoWasRightCard["verdict"]): "good" | "warn" | "bad" | "brand" {
  switch (v) {
    case "Concern Validated":
      return "warn";
    case "Recommendation Proven":
      return "good";
    case "Mitigated":
      return "brand";
    case "Incorrect":
      return "bad";
  }
}

export function WhoWasRight({ cards }: { cards: WhoWasRightCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="space-y-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={c.stakeholder} size={28} />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-ink">{c.stakeholder}</p>
                <p className="text-[10px] text-ink-soft">{c.role}</p>
              </div>
            </div>
            <Badge tone={verdictTone(c.verdict)} className="font-semibold">
              {c.verdict}
            </Badge>
          </div>
          <p className="mt-2 text-xs italic text-ink-soft">“{c.claim}”</p>
          <p className="mt-1 text-[11px] text-ink">
            <span className="font-medium">Outcome:</span> {c.outcome}
          </p>
        </div>
      ))}
    </div>
  );
}
