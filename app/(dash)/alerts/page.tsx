"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Search, Clock, CheckCircle2, Info } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { formatDate } from "@/lib/ui";
import type { Alert } from "@/lib/types";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "high-risk-pending": AlertTriangle,
  "similar-decision-found": Search,
  "approval-overdue": Clock,
  "outcome-recorded": CheckCircle2,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts));
  }, []);

  async function markRead(id: string) {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlerts((a) => a?.map((x) => (x.id === id ? { ...x, read: true } : x)) ?? null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Alerts</h1>
        <p className="text-xs text-ink-soft">Decision intelligence notifications, by severity.</p>
      </div>

      {!alerts ? (
        <Skeleton className="h-64" />
      ) : alerts.length === 0 ? (
        <EmptyState title="No active alerts" description="All decisions are within normal parameters." />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = ICONS[a.type] ?? Info;
            return (
              <Card key={a.id} className={`flex items-start gap-3 p-4 ${a.read ? "opacity-60" : ""}`}>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    a.severity === "High" ? "bg-risk-high-bg text-risk-high" : a.severity === "Medium" ? "bg-risk-med-bg text-risk-med" : "bg-risk-low-bg text-risk-low"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{a.title}</p>
                    <Badge tone={a.severity === "High" ? "bad" : a.severity === "Medium" ? "warn" : "neutral"}>
                      {a.severity}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">{a.description}</p>
                  <p className="mt-1 text-[10px] text-ink-faint">{formatDate(a.timestamp)}</p>
                </div>
                {!a.read && (
                  <button
                    onClick={() => markRead(a.id)}
                    className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                  >
                    Mark read
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
