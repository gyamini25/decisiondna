/**
 * Work IQ — mock Microsoft Graph integration.
 *
 * In production this reads emails, calendar meetings, transcripts, and the
 * people graph via Microsoft Graph (delegated Mail.Read, Calendars.Read,
 * Chat.Read, User.Read.All) with MSAL auth + backoff. Here it returns
 * deterministic fixtures (the demo meetings + a stakeholder graph whose
 * validation rates are computed from the corpus "who was right" ledger).
 */

import type { Meeting, Person } from "@/lib/types";
import { getCorpus } from "@/lib/search";

export function listMeetings(): Meeting[] {
  return [
    {
      id: "meeting-leadership-sync-support-coverage",
      title: "Leadership Sync — Support Coverage Proposal",
      date: "2026-06-13",
      status: "live",
      participants: [
        { name: "Laura Mitchell", role: "Senior Product Manager" },
        { name: "Ravi Patel", role: "Customer Success" },
        { name: "Jane Smith", role: "SRE Lead" },
        { name: "Michael Lee", role: "Operations" },
      ],
      transcriptRef: "hero-support-staffing",
    },
    {
      id: "meeting-revenue-strategy",
      title: "Revenue Strategy — Pricing Review",
      date: "2026-06-14",
      status: "upcoming",
      participants: [
        { name: "Daniel Reyes", role: "Finance Lead" },
        { name: "Sarah Johnson", role: "Finance" },
        { name: "Priya Nair", role: "Product" },
      ],
    },
    {
      id: "meeting-people-council",
      title: "People Council — Policy Review",
      date: "2026-06-10",
      status: "past",
      participants: [
        { name: "Priya Nair", role: "Product" },
        { name: "Michael Lee", role: "Operations" },
      ],
    },
    {
      id: "meeting-brand-sync-sponsorship",
      title: "Brand Sync — Motorsport Sponsorship Proposal",
      date: "2026-06-13",
      status: "upcoming",
      participants: [
        { name: "Laura Mitchell", role: "Senior Product Manager" },
        { name: "Priya Nair", role: "Product" },
        { name: "Sarah Johnson", role: "Finance" },
      ],
      transcriptRef: "lowconf-sponsorship",
    },
  ];
}

/**
 * Build the stakeholder people-graph from the corpus: each person's validation
 * rate is the share of their predictions that proved correct.
 */
export function listPeople(): Person[] {
  const stats = new Map<
    string,
    { role: string; total: number; right: number; appearances: number }
  >();

  for (const r of getCorpus()) {
    for (const o of r.objections) {
      const s = stats.get(o.raisedBy) ?? {
        role: o.role,
        total: 0,
        right: 0,
        appearances: 0,
      };
      s.total += 1;
      s.appearances += 1;
      if (
        o.result === "validated" ||
        o.result === "partially-validated" ||
        o.result === "recommendation-proven"
      ) {
        s.right += 1;
      }
      stats.set(o.raisedBy, s);
    }
  }

  const maxAppearances = Math.max(
    1,
    ...[...stats.values()].map((s) => s.appearances),
  );

  return [...stats.entries()].map(([name, s]) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    role: s.role,
    influence: Math.round((s.appearances / maxAppearances) * 100) / 100,
    validationRate: s.total ? Math.round((s.right / s.total) * 100) / 100 : 0,
  }));
}
