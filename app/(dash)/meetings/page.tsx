"use client";

import { useState } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import { Card, Avatar, Badge, Skeleton } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";
import { formatDate } from "@/lib/ui";
import type { Meeting } from "@/lib/types";

const TABS = ["all", "upcoming", "live", "past"] as const;

export default function MeetingsPage() {
  const { data, loading } = useJson<{ meetings: Meeting[] }>("/api/meetings");
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const meetings = (data?.meetings ?? []).filter(
    (m) => tab === "all" || m.status === tab,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Meetings</h1>
          <p className="text-xs text-ink-soft">All meetings and transcripts across the organization (Work IQ).</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              tab === t ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:bg-surface-2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {meetings.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <Video size={16} className="text-brand-600" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{m.title}</p>
                    <p className="text-[11px] text-ink-soft">{formatDate(m.date)}</p>
                  </div>
                </div>
                {m.status === "live" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-semibold text-risk-high">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-risk-high" /> Live
                  </span>
                ) : (
                  <Badge tone="neutral">{m.status}</Badge>
                )}
              </div>
              <div className="mt-3 flex -space-x-2">
                {m.participants.map((p) => (
                  <Avatar key={p.name} name={p.name} size={26} />
                ))}
              </div>
              <Link
                href="/decision-guard"
                className="mt-3 inline-block rounded-md border border-line px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-surface-2"
              >
                {m.status === "live" ? "Join & Monitor" : "Analyze"}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
