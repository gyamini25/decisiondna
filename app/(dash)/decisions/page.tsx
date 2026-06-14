"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Card, ConfidenceBar, RiskBadge, Badge, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import type { DecisionAnalysis } from "@/lib/types";
import { formatDate } from "@/lib/ui";
import type { DecisionListItem } from "@/lib/decisions-view";
import type { DecisionRecord, StoredDecision } from "@/lib/types";

const FILTERS = [
  { key: "", label: "All" },
  { key: "high-risk", label: "High Risk" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 8;

function DecisionsInner() {
  const params = useSearchParams();
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<DecisionListItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const url = `/api/decisions?filter=${filter}&q=${encodeURIComponent(q)}`;
    setItems(null);
    setPage(1);
    fetch(url)
      .then((r) => r.json())
      .then((d) => setItems(d.decisions));
  }, [filter, q]);

  const total = items?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = items?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Decisions</h1>
          <p className="text-xs text-ink-soft">
            Track, analyze, and learn from organizational decisions.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700">
          + New Decision
        </button>
      </div>

      {showNew && <NewDecisionModal onClose={() => setShowNew(false)} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search decisions…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === f.key
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-[1fr_120px_110px_120px_100px] gap-3 border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          <span>Decision</span>
          <span>Risk</span>
          <span>Confidence</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        <div className="divide-y divide-line">
          {!paged
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-8" />
                </div>
              ))
            : paged.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className="grid w-full grid-cols-[1fr_120px_110px_120px_100px] items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{d.proposal}</p>
                    <p className="text-[11px] text-ink-soft">
                      {d.proposer} · {d.category}
                    </p>
                  </div>
                  <RiskBadge level={d.risk} />
                  <ConfidenceBar value={d.confidence} />
                  <Badge tone={d.status === "approved" ? "good" : d.status === "pending" ? "warn" : "neutral"}>
                    {d.status}
                  </Badge>
                  <span className="text-xs text-ink-soft">{formatDate(d.date)}</span>
                </button>
              ))}
        </div>
        {items && total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11px] text-ink-soft">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} decisions
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-line px-2 py-1 disabled:opacity-40 hover:bg-surface-2">Prev</button>
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`rounded-md px-2 py-1 ${page === i + 1 ? "bg-brand-600 text-white" : "border border-line hover:bg-surface-2"}`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-line px-2 py-1 disabled:opacity-40 hover:bg-surface-2">Next</button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <DetailDrawer id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<
    | { kind: "memory"; record: DecisionRecord }
    | { kind: "new"; decision: StoredDecision }
    | null
  >(null);

  useEffect(() => {
    setDetail(null);
    fetch(`/api/decisions/${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="scroll-thin h-full w-[480px] overflow-y-auto bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-ink">Decision Detail</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {!detail ? (
          <Skeleton className="mt-4 h-64" />
        ) : detail.kind === "memory" ? (
          <MemoryDetail record={detail.record} />
        ) : (
          <NewDetail decision={detail.decision} />
        )}
      </div>
    </div>
  );
}

function MemoryDetail({ record }: { record: DecisionRecord }) {
  const es = record.evidenceSignals;
  const signals = [
    { label: "Semantic", v: es.semanticSimilarity, w: "0.35" },
    { label: "Entity", v: es.entityAlignment, w: "0.30" },
    { label: "Temporal", v: es.temporalConsistency, w: "0.20" },
    { label: "Directional", v: es.directionalCorrectness, w: "0.15" },
  ];
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">{record.title}</p>
        <p className="mt-1 text-xs text-ink-soft">{record.proposal}</p>
        <div className="mt-2 flex items-center gap-2">
          <RiskBadge level={record.impactLevel === "High" ? "High" : record.impactLevel === "Medium" ? "Medium" : "Low"} />
          <Badge tone="neutral">{record.category}</Badge>
          <Badge tone="neutral">{formatDate(record.dateProposed)}</Badge>
        </div>
      </div>

      <Card className="p-3">
        <p className="mb-2 text-xs font-semibold text-ink">Four-Signal Evidence Breakdown</p>
        <div className="space-y-1.5">
          {signals.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-20 text-[11px] text-ink-soft">{s.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.v * 100}%` }} />
              </div>
              <span className="w-9 text-right text-[11px] font-medium">{Math.round(s.v * 100)}%</span>
              <span className="w-8 text-right text-[10px] text-ink-faint">×{s.w}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11px]">
          <span className="text-ink-soft">S<sub>final</sub> {Math.round(es.sFinal * 100)}% · rank {es.rank}</span>
          <span className="font-semibold">Confidence {Math.round(es.confidence * 100)}%</span>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink">Who Was Right?</p>
        <div className="space-y-2">
          {record.objections.map((o, i) => (
            <div key={i} className="rounded-md border border-line p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">{o.raisedBy} · {o.role}</p>
                <Badge tone={o.result === "validated" ? "warn" : o.result === "recommendation-proven" ? "good" : o.result === "not-validated" ? "bad" : "brand"}>
                  {o.result}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] italic text-ink-soft">“{o.objection}”</p>
              <p className="mt-1 text-[11px] text-ink">{o.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-ink">Outcome</p>
        <p className="text-xs text-ink-soft">{record.outcome.summary}</p>
      </div>
    </div>
  );
}

function NewDetail({ decision }: { decision: StoredDecision }) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">{decision.proposal}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {decision.proposer} · {formatDate(decision.createdAt)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <RiskBadge level={decision.risk?.overall ?? "Low"} />
          <Badge tone={decision.approvalStatus === "approved" ? "good" : "warn"}>
            {decision.approvalStatus}
          </Badge>
        </div>
      </div>
      {decision.rationale && (
        <Card className="p-3">
          <p className="text-xs font-semibold text-ink">Approval Rationale</p>
          <p className="mt-1 text-xs text-ink-soft">{decision.rationale}</p>
        </Card>
      )}
      <div>
        <p className="mb-1 text-xs font-semibold text-ink">Confidence</p>
        <ConfidenceBar value={decision.confidence.confidence} />
        <p className="mt-1 text-[11px] text-ink-soft">{decision.confidence.explanation}</p>
      </div>
    </div>
  );
}

function NewDecisionModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DecisionAnalysis | null>(null);

  async function analyze() {
    if (text.trim().length < 8 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      setResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New Decision — Analyze" onClose={onClose} width={560}>
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">
          Describe a decision or paste a meeting snippet. DecisionDNA will detect it
          and analyze it against organizational memory.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. We're considering reducing customer support staffing by 20% to cut costs."
          className="w-full rounded-md border border-line bg-surface-2 p-3 text-sm outline-none focus:border-brand-400"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-surface-2">Cancel</button>
          <button onClick={analyze} disabled={text.trim().length < 8 || busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {busy && <Loader2 size={13} className="animate-spin" />} Analyze
          </button>
        </div>

        {result && (
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            {result.type === "insufficient-evidence" ? (
              <>
                <p className="text-xs font-semibold text-risk-med">Insufficient Historical Data</p>
                <p className="mt-1 text-[11px] text-ink-soft">{result.message}</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink">Closest precedent</p>
                  <RiskBadge level={result.risk?.overall ?? "Low"} />
                </div>
                <p className="mt-1 text-sm text-ink">
                  {result.matches[0]?.title}{" "}
                  <span className="text-brand-400">{result.matches[0]?.matchPct}% match</span>
                </p>
                <p className="mt-1 text-[11px] text-ink-soft">{result.matches[0]?.outcomeSummary}</p>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[11px]">
                  <span className="text-ink-soft">Confidence {Math.round(result.confidence.confidence * 100)}%</span>
                  <a href="/decision-guard" className="font-medium text-brand-400 hover:text-brand-300">Open in Decision Guard →</a>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <DecisionsInner />
    </Suspense>
  );
}
