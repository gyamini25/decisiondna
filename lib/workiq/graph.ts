/**
 * Work IQ — Microsoft Graph surface (meetings + people graph).
 *
 * In production this reads emails, calendar meetings, transcripts, and the
 * people graph via Microsoft Graph (delegated Mail.Read, Calendars.Read,
 * Chat.Read, User.Read.All). Here it is backed by the seeded month of work
 * signal (data/workiq/*) and the Work IQ memory derived in ./memory.
 */

import type { Meeting, Person } from "@/lib/types";
import { buildWorkMemory, workMeetings } from "@/lib/workiq/memory";

const TODAY = "2026-06-14";

/** A few forward-looking meetings so the Upcoming tab is populated. */
const UPCOMING: Meeting[] = [
  {
    id: "meeting-brand-sync-sponsorship",
    title: "Brand Sync — Motorsport Sponsorship Proposal",
    date: "2026-06-15",
    status: "upcoming",
    participants: [
      { name: "Laura Mitchell", role: "Senior Product Manager" },
      { name: "Priya Nair", role: "Product Manager" },
      { name: "Sarah Johnson", role: "Finance Analyst" },
    ],
    transcriptRef: "lowconf-sponsorship",
  },
  {
    id: "meeting-revenue-strategy",
    title: "Revenue Strategy — Pricing Review",
    date: "2026-06-16",
    status: "upcoming",
    participants: [
      { name: "Daniel Reyes", role: "Finance Lead" },
      { name: "Sarah Johnson", role: "Finance Analyst" },
      { name: "Carlos Mendes", role: "VP Operations" },
    ],
  },
  {
    id: "meeting-people-council",
    title: "People Council — Four-Day Week Trial",
    date: "2026-06-17",
    status: "upcoming",
    participants: [
      { name: "Priya Nair", role: "Product Manager" },
      { name: "Michael Lee", role: "Operations Manager" },
    ],
  },
];

function statusFor(date: string, flagged?: string): Meeting["status"] {
  if (flagged === "live") return "live";
  const day = date.slice(0, 10);
  if (day < TODAY) return "past";
  if (day === TODAY) return "live";
  return "upcoming";
}

export function listMeetings(): Meeting[] {
  const month: Meeting[] = workMeetings.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.date,
    status: statusFor(m.date, m.status),
    participants: m.participants,
    transcriptRef: m.transcriptRef,
  }));
  // Featured upcoming first, then the month (newest first).
  return [
    ...UPCOMING,
    ...month.sort((a, b) => b.date.localeCompare(a.date)),
  ];
}

export function listPeople(): Person[] {
  return buildWorkMemory().people.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    influence: p.influence,
    validationRate: p.validationRate,
  }));
}
