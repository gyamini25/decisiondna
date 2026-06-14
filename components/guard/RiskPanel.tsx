"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/ui";
import { Badge, RiskBadge } from "@/components/ui/primitives";
import type { DecisionAnalysis, RiskAssessment } from "@/lib/types";

function dimColor(level: string): string {
  return level === "High"
    ? "text-risk-high"
    : level === "Medium"
      ? "text-risk-med"
      : "text-risk-low";
}

export function RiskPanel({
  analysis,
}: {
  analysis: DecisionAnalysis;
}) {
  const risk = analysis.risk as RiskAssessment;
  const [status, setStatus] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action: "approved" | "review" | "rejected", rationale?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, action, rationale }),
      });
      const data = await res.json();
      setStatus(data.message ?? "Done");
    } catch {
      setStatus("Approval failed");
    } finally {
      setBusy(false);
      setShowReason(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-risk-high-bg bg-risk-high-bg/40 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Overall Risk Level
          </p>
          <AlertTriangle size={18} className={dimColor(risk.overall)} />
        </div>
        <p className={cn("mt-1 text-2xl font-bold", dimColor(risk.overall))}>
          {risk.overall.toUpperCase()} RISK
        </p>
        <p className="mt-1 text-[11px] text-ink-soft">{risk.rationale}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink">Risk Breakdown</p>
        <div className="space-y-1.5">
          {risk.dimensions.map((d) => (
            <div
              key={d.dimension}
              className="flex items-center justify-between rounded-md border border-line px-2.5 py-1.5"
              title={d.reasoning}
            >
              <span className="text-xs capitalize text-ink">{d.dimension} Risk</span>
              <Badge
                tone={d.level === "High" ? "bad" : d.level === "Medium" ? "warn" : "good"}
              >
                {d.level}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink">Recommended Actions</p>
        <div className="space-y-1.5">
          {analysis.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 text-risk-low" />
              <div className="flex-1">
                <p className="text-xs text-ink">{r.action}</p>
              </div>
              <Badge
                tone={r.priority === "High" ? "bad" : r.priority === "Medium" ? "warn" : "neutral"}
              >
                {r.priority}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3">
        <p className="text-xs font-semibold text-ink">Approval Required</p>
        <p className="mt-0.5 text-[11px] text-ink-soft">{analysis.detection.proposal}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-ink-soft">Risk Level</span>
          <RiskBadge level={risk.overall} />
        </div>

        {status ? (
          <p className="mt-3 rounded-md bg-risk-low-bg px-2 py-1.5 text-[11px] font-medium text-risk-low">
            ✓ {status}
          </p>
        ) : showReason ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason required to approve despite risk…"
              className="w-full rounded-md border border-line bg-surface p-2 text-xs outline-none focus:border-brand-400"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                disabled={!reason || busy}
                onClick={() => submit("approved", reason)}
                className="flex-1 rounded-md bg-risk-low px-2 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
              >
                Confirm Approval
              </button>
              <button
                onClick={() => setShowReason(false)}
                className="rounded-md border border-line px-2 py-1.5 text-[11px] text-ink-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowReason(true)}
              className="rounded-md bg-risk-low px-2 py-1.5 text-[11px] font-medium text-white"
            >
              Approve Anyway
            </button>
            <button
              disabled={busy}
              onClick={() => submit("review")}
              className="rounded-md bg-brand-600 px-2 py-1.5 text-[11px] font-medium text-white"
            >
              Request Review
            </button>
            <button
              disabled={busy}
              onClick={() => submit("rejected")}
              className="rounded-md border border-risk-high text-risk-high px-2 py-1.5 text-[11px] font-medium"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfidenceMeter({ analysis }: { analysis: DecisionAnalysis }) {
  const c = analysis.confidence.confidence;
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">Confidence Score</p>
        <span className="text-sm font-bold text-ink">{Math.round(c * 100)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{
            width: `${c * 100}%`,
            backgroundColor:
              c >= 0.8 ? "var(--color-good)" : c >= 0.6 ? "var(--color-warn)" : "var(--color-bad)",
          }}
        />
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft">
        <Circle size={8} className="fill-current" />
        {analysis.confidence.explanation}
      </p>
    </div>
  );
}
