"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Search, Clock, CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader, Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/ui";
import type { Alert } from "@/lib/types";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "high-risk-pending": AlertTriangle,
  "similar-decision-found": Search,
  "approval-overdue": Clock,
  "outcome-recorded": CheckCircle2,
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "High Risk", label: "High Risk" },
  { key: "Approvals", label: "Approvals" },
  { key: "Outcomes", label: "Outcomes" },
  { key: "System", label: "System" },
];

function category(a: Alert): string {
  if (a.severity === "High") return "High Risk";
  if (a.type === "approval-overdue" || a.type === "high-risk-pending") return "Approvals";
  if (a.type === "outcome-recorded") return "Outcomes";
  return "System";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then((d) => setAlerts(d.alerts));
  }, []);

  async function markRead(id: string) {
    await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAlerts((a) => a?.map((x) => (x.id === id ? { ...x, read: true } : x)) ?? null);
  }
  async function markAll() {
    const unread = (alerts ?? []).filter((a) => !a.read);
    await Promise.all(unread.map((a) => fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) })));
    setAlerts((a) => a?.map((x) => ({ ...x, read: true })) ?? null);
  }

  const list = (alerts ?? []).filter((a) => filter === "all" || category(a) === filter);
  const summary = {
    total: alerts?.length ?? 0,
    high: (alerts ?? []).filter((a) => a.severity === "High").length,
    approvals: (alerts ?? []).filter((a) => category(a) === "Approvals").length,
    outcomes: (alerts ?? []).filter((a) => category(a) === "Outcomes").length,
    system: (alerts ?? []).filter((a) => category(a) === "System").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Alerts</h1>
          <p className="text-xs text-ink-soft">Stay informed about important decisions and risks.</p>
        </div>
        <button onClick={markAll} className="text-xs font-medium text-brand-400 hover:text-brand-300">Mark all as read</button>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === f.key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:bg-surface-2"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          {!alerts ? (
            <Skeleton className="h-64" />
          ) : list.length === 0 ? (
            <EmptyState title="No alerts" description="All decisions within normal parameters." />
          ) : (
            list.map((a) => {
              const Icon = ICONS[a.type] ?? Info;
              return (
                <Card key={a.id} className={`flex items-start gap-3 p-4 ${a.read ? "opacity-60" : ""}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.severity === "High" ? "bg-risk-high-bg text-risk-high" : a.severity === "Medium" ? "bg-risk-med-bg text-risk-med" : "bg-risk-low-bg text-risk-low"}`}>
                    <Icon size={16} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{a.title}</p>
                      <Badge tone={a.severity === "High" ? "bad" : a.severity === "Medium" ? "warn" : "neutral"}>{a.severity}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{a.description}</p>
                    <p className="mt-1 text-[10px] text-ink-faint">{formatDate(a.timestamp)}</p>
                  </div>
                  {!a.read && <button onClick={() => markRead(a.id)} className="text-[11px] font-medium text-brand-400 hover:text-brand-300">Mark read</button>}
                </Card>
              );
            })
          )}
        </div>

        {/* Alert Summary sidebar */}
        <Card className="h-fit">
          <CardHeader title="Alert Summary" />
          <div className="p-4">
            <div className="mb-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-ink">{summary.total}</p>
                <p className="text-[11px] text-ink-soft">Total Alerts</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <SummaryRow label="High Risk" value={summary.high} tone="bad" />
              <SummaryRow label="Approvals" value={summary.approvals} tone="warn" />
              <SummaryRow label="Outcomes" value={summary.outcomes} tone="good" />
              <SummaryRow label="System" value={summary.system} tone="neutral" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone: "bad" | "warn" | "good" | "neutral" }) {
  const dot = tone === "bad" ? "bg-risk-high" : tone === "warn" ? "bg-risk-med" : tone === "good" ? "bg-risk-low" : "bg-ink-faint";
  return (
    <div className="flex items-center justify-between rounded-md border border-line px-3 py-1.5 text-[11px]">
      <span className="flex items-center gap-1.5 text-ink-soft"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
