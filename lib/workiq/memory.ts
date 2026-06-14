/**
 * Work IQ — builds organizational memory from a month of emails, meetings,
 * chats, documents and a decision log (data/workiq/*). It derives the work
 * context the rest of DecisionDNA reasons over: people profiles, the
 * collaboration/relationship graph, topic trends, and an activity timeline.
 *
 * This is the Microsoft Work IQ pattern: memory from work signal → understanding
 * of people and relationships.
 */

import type {
  DecisionLogEntry,
  Relationship,
  WorkChat,
  WorkDocument,
  WorkEmail,
  WorkMemory,
  WorkPersonProfile,
} from "@/lib/types";
import { getCorpus } from "@/lib/search";

import peopleJson from "@/data/workiq/people.json";
import meetingsJson from "@/data/workiq/meetings.json";
import emailsJson from "@/data/workiq/emails.json";
import chatsJson from "@/data/workiq/chats.json";
import documentsJson from "@/data/workiq/documents.json";
import decisionLogJson from "@/data/workiq/decision-log.json";

interface RawPerson {
  id: string;
  name: string;
  role: string;
  dept: string;
  manager: string | null;
}
interface RawMeeting {
  id: string;
  title: string;
  topic: string;
  date: string;
  participants: { name: string; role: string }[];
  hasTranscript: boolean;
  decisionDetected: boolean;
  durationMin: number;
  status?: string;
  transcriptRef?: string;
}

export const workPeople = peopleJson as RawPerson[];
export const workMeetings = meetingsJson as RawMeeting[];
export const workEmails = emailsJson as WorkEmail[];
export const workChats = chatsJson as WorkChat[];
export const workDocuments = documentsJson as WorkDocument[];
export const workDecisionLog = decisionLogJson as DecisionLogEntry[];

/** Validation rate per person from the corpus "who was right" ledger. */
function validationRates(): Map<string, number> {
  const stats = new Map<string, { right: number; total: number }>();
  for (const r of getCorpus()) {
    for (const o of r.objections) {
      const s = stats.get(o.raisedBy) ?? { right: 0, total: 0 };
      s.total += 1;
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
  const out = new Map<string, number>();
  for (const [name, s] of stats) out.set(name, s.total ? s.right / s.total : 0);
  return out;
}

let cached: WorkMemory | null = null;

export function buildWorkMemory(): WorkMemory {
  if (cached) return cached;

  const vrates = validationRates();

  // Relationship strengths from shared meetings + email correspondence.
  const relKey = (a: string, b: string) => [a, b].sort().join("||");
  const rel = new Map<string, number>();
  const bump = (a: string, b: string, w: number) => {
    if (a === b) return;
    const k = relKey(a, b);
    rel.set(k, (rel.get(k) ?? 0) + w);
  };
  for (const m of workMeetings) {
    const ps = m.participants.map((p) => p.name);
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) bump(ps[i], ps[j], 1);
  }
  for (const e of workEmails) for (const t of e.to) bump(e.from, t, 0.5);

  const relationships: Relationship[] = [...rel.entries()]
    .map(([k, strength]) => {
      const [a, b] = k.split("||");
      return { a, b, strength: Math.round(strength * 10) / 10 };
    })
    .sort((x, y) => y.strength - x.strength);

  // Per-person profiles.
  const people: WorkPersonProfile[] = workPeople.map((p) => {
    const meetings = workMeetings.filter((m) =>
      m.participants.some((x) => x.name === p.name),
    ).length;
    const emails = workEmails.filter((e) => e.from === p.name).length;
    const chats = workChats.filter((c) => c.from === p.name).length;
    const decisions = workDecisionLog.filter((d) => d.owner === p.name).length;
    const topConnections = relationships
      .filter((r) => r.a === p.name || r.b === p.name)
      .slice(0, 3)
      .map((r) => (r.a === p.name ? r.b : r.a));
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      dept: p.dept,
      meetings,
      emails,
      chats,
      decisions,
      influence: meetings + emails * 0.5 + chats * 0.25,
      validationRate: Math.round((vrates.get(p.name) ?? 0) * 100) / 100,
      topConnections,
    };
  });
  // Normalise influence to 0..1.
  const maxInfluence = Math.max(1, ...people.map((p) => p.influence));
  for (const p of people)
    p.influence = Math.round((p.influence / maxInfluence) * 100) / 100;
  people.sort((a, b) => b.influence - a.influence);

  // Topic trends.
  const topicCount = new Map<string, number>();
  const addTopic = (t: string) =>
    topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  workMeetings.forEach((m) => addTopic(m.topic));
  workEmails.forEach((e) => addTopic(e.topic));
  workChats.forEach((c) => addTopic(c.topic));
  workDocuments.forEach((d) => addTopic(d.topic));
  const topics = [...topicCount.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  // Daily activity (for sparkline).
  const byDay = new Map<string, { meetings: number; emails: number; chats: number }>();
  const day = (iso: string) => iso.slice(0, 10);
  const ensure = (d: string) => {
    if (!byDay.has(d)) byDay.set(d, { meetings: 0, emails: 0, chats: 0 });
    return byDay.get(d)!;
  };
  workMeetings.forEach((m) => (ensure(day(m.date)).meetings += 1));
  workEmails.forEach((e) => (ensure(day(e.date)).emails += 1));
  workChats.forEach((c) => (ensure(day(c.date)).chats += 1));
  const activity = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  cached = {
    counts: {
      people: workPeople.length,
      meetings: workMeetings.length,
      emails: workEmails.length,
      chats: workChats.length,
      documents: workDocuments.length,
      decisions: workDecisionLog.length,
    },
    people,
    relationships: relationships.slice(0, 12),
    topics,
    activity,
    recentDecisions: [...workDecisionLog].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    decisionSignals: workEmails.filter((e) => e.decisionSignal).length,
  };
  return cached;
}
