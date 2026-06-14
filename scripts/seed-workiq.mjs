#!/usr/bin/env node
/**
 * Work IQ synthetic seed generator.
 *
 * Produces a month (2026-05-15 → 2026-06-14) of realistic organizational
 * activity — people, meetings (with transcripts), emails, chats, documents, and
 * a decision log — so the Work IQ layer can build memory from emails, meetings,
 * chats, and documents and reason about work context, people, and relationships.
 *
 * Deterministic (seeded PRNG) → reproducible. Run:  node scripts/seed-workiq.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "workiq");
mkdirSync(OUT, { recursive: true });

// ---- seeded PRNG -----------------------------------------------------------
let seed = 20260614;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pickN = (a, n) => {
  const c = [...a];
  const out = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
  return out;
};
const chance = (p) => rnd() < p;

// ---- people ----------------------------------------------------------------
const PEOPLE = [
  { id: "laura-mitchell", name: "Laura Mitchell", role: "Senior Product Manager", dept: "Product", manager: "Carlos Mendes" },
  { id: "daniel-reyes", name: "Daniel Reyes", role: "Finance Lead", dept: "Finance", manager: "Carlos Mendes" },
  { id: "jane-smith", name: "Jane Smith", role: "SRE Lead", dept: "Engineering", manager: "Tom Becker" },
  { id: "ravi-patel", name: "Ravi Patel", role: "Customer Success Lead", dept: "Customer Success", manager: "Laura Mitchell" },
  { id: "michael-lee", name: "Michael Lee", role: "Operations Manager", dept: "Operations", manager: "Carlos Mendes" },
  { id: "sarah-johnson", name: "Sarah Johnson", role: "Finance Analyst", dept: "Finance", manager: "Daniel Reyes" },
  { id: "priya-nair", name: "Priya Nair", role: "Product Manager", dept: "Product", manager: "Laura Mitchell" },
  { id: "tom-becker", name: "Tom Becker", role: "Engineering Manager", dept: "Engineering", manager: "Carlos Mendes" },
  { id: "aisha-khan", name: "Aisha Khan", role: "Marketing Lead", dept: "Marketing", manager: "Carlos Mendes" },
  { id: "carlos-mendes", name: "Carlos Mendes", role: "VP Operations", dept: "Executive", manager: null },
];
const names = PEOPLE.map((p) => p.name);

const TOPICS = [
  "Cost Optimization", "Support Coverage", "Pricing", "Hiring", "Automation",
  "Marketing Spend", "Team Restructure", "Infrastructure", "Vendor Management", "Process Change",
];

// ---- date helpers ----------------------------------------------------------
const START = new Date("2026-05-15T09:00:00Z");
const dayMs = 86400000;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const isoTime = (d) => new Date(d).toISOString();
const addDays = (base, n) => new Date(base.getTime() + n * dayMs);

// ---- meetings (recurring + ad-hoc) ----------------------------------------
const meetings = [];
let mid = 1;
const recurring = [
  { title: "Leadership Sync", day: 1, topic: "Cost Optimization", who: ["Laura Mitchell", "Daniel Reyes", "Michael Lee", "Carlos Mendes"] },
  { title: "Support Ops Review", day: 3, topic: "Support Coverage", who: ["Ravi Patel", "Jane Smith", "Michael Lee"] },
  { title: "Product Sync", day: 2, topic: "Automation", who: ["Laura Mitchell", "Priya Nair", "Tom Becker"] },
  { title: "Finance Review", day: 4, topic: "Pricing", who: ["Daniel Reyes", "Sarah Johnson", "Carlos Mendes"] },
];
for (let d = 0; d < 31; d++) {
  const date = addDays(START, d);
  const dow = date.getUTCDay();
  for (const r of recurring) {
    if (dow === r.day) {
      meetings.push({
        id: `mtg-${mid++}`,
        title: `${r.title} — ${isoDay(date)}`,
        topic: r.topic,
        date: isoTime(date),
        participants: r.who.map((n) => ({ name: n, role: PEOPLE.find((p) => p.name === n)?.role ?? "" })),
        hasTranscript: chance(0.7),
        decisionDetected: chance(0.4),
        durationMin: pick([30, 45, 60]),
      });
    }
  }
  // occasional ad-hoc meeting
  if (chance(0.35)) {
    const topic = pick(TOPICS);
    const who = pickN(names, 3 + Math.floor(rnd() * 3));
    meetings.push({
      id: `mtg-${mid++}`,
      title: `${topic} Working Session`,
      topic,
      date: isoTime(new Date(date.getTime() + 3 * 3600000)),
      participants: who.map((n) => ({ name: n, role: PEOPLE.find((p) => p.name === n)?.role ?? "" })),
      hasTranscript: chance(0.5),
      decisionDetected: chance(0.5),
      durationMin: pick([30, 45]),
    });
  }
}
// Flag the live + upcoming hero meetings (today = 2026-06-14)
meetings.push({
  id: "meeting-leadership-sync-support-coverage",
  title: "Leadership Sync — Support Coverage Proposal",
  topic: "Support Coverage",
  date: "2026-06-14T09:00:00Z",
  participants: [
    { name: "Laura Mitchell", role: "Senior Product Manager" },
    { name: "Ravi Patel", role: "Customer Success Lead" },
    { name: "Jane Smith", role: "SRE Lead" },
    { name: "Michael Lee", role: "Operations Manager" },
  ],
  hasTranscript: true,
  decisionDetected: true,
  durationMin: 30,
  status: "live",
  transcriptRef: "hero-support-staffing",
});

// ---- emails ----------------------------------------------------------------
const emails = [];
const emailTemplates = [
  { subj: "Re: {topic} proposal — concerns", signal: true, body: "Flagging a few risks before we commit on {topic}. We saw issues last time." },
  { subj: "{topic} cost analysis attached", signal: true, body: "Numbers for the {topic} decision are in the attached model." },
  { subj: "Re: {topic} rollout plan", signal: true, body: "Proposing a phased rollout for {topic} with a pilot first." },
  { subj: "FYI: {topic} update", signal: false, body: "Quick status update on {topic}, no action needed." },
  { subj: "Question about {topic}", signal: false, body: "Can you clarify the timeline on {topic}?" },
  { subj: "{topic} — outcome review", signal: true, body: "Reviewing how the {topic} decision played out vs expectations." },
];
let eid = 1;
for (let d = 0; d < 31; d++) {
  const n = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const t = pick(emailTemplates);
    const topic = pick(TOPICS);
    const from = pick(names);
    const to = pickN(names.filter((x) => x !== from), 1 + Math.floor(rnd() * 3));
    emails.push({
      id: `email-${eid++}`,
      from,
      to,
      subject: t.subj.replace("{topic}", topic),
      excerpt: t.body.replace("{topic}", topic),
      topic,
      date: isoTime(addDays(START, d)),
      importance: chance(0.25) ? "high" : "normal",
      decisionSignal: t.signal,
    });
  }
}

// ---- chats (Teams channels) -----------------------------------------------
const chats = [];
const channels = ["#leadership", "#support-ops", "#product", "#finance", "#general"];
const chatLines = [
  "anyone have the latest numbers on {topic}?",
  "we should loop in {person} on {topic}",
  "+1 on the {topic} pilot idea",
  "{topic} decision is going to approval today",
  "heads up: {topic} outcome looks {sentiment}",
  "can we revisit the {topic} risks tomorrow?",
];
let cid = 1;
for (let d = 0; d < 31; d++) {
  const n = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const topic = pick(TOPICS);
    chats.push({
      id: `chat-${cid++}`,
      channel: pick(channels),
      from: pick(names),
      text: pick(chatLines)
        .replace("{topic}", topic)
        .replace("{person}", pick(names))
        .replace("{sentiment}", pick(["positive", "concerning", "mixed"])),
      topic,
      date: isoTime(addDays(START, d)),
    });
  }
}

// ---- documents -------------------------------------------------------------
const documents = [];
const docTypes = [
  { ext: "xlsx", kind: "model" },
  { ext: "pdf", kind: "analysis" },
  { ext: "docx", kind: "brief" },
  { ext: "pptx", kind: "deck" },
];
let did = 1;
for (let i = 0; i < 16; i++) {
  const topic = pick(TOPICS);
  const dt = pick(docTypes);
  documents.push({
    id: `doc-${did++}`,
    title: `${topic.replace(/\s+/g, "-").toLowerCase()}-${dt.kind}.${dt.ext}`,
    kind: dt.kind,
    topic,
    author: pick(names),
    date: isoTime(addDays(START, Math.floor(rnd() * 31))),
    source: "SharePoint",
  });
}

// ---- decision log ----------------------------------------------------------
const decisionLog = [];
const statuses = ["approved", "pending", "rejected", "review"];
let lid = 1;
const logTitles = [
  "Reduce weekend support coverage", "Q2 marketing budget reallocation",
  "Engineering hiring freeze", "Standardize vendor contracts",
  "Pilot chatbot deflection", "Office space consolidation",
  "Tier-1 support outsourcing review", "Pricing experiment — emerging markets",
  "Process change: approval routing", "Data platform migration phase 2",
];
for (let i = 0; i < logTitles.length; i++) {
  const owner = pick(names);
  decisionLog.push({
    id: `log-${lid++}`,
    title: logTitles[i],
    owner,
    topic: pick(TOPICS),
    date: isoTime(addDays(START, Math.floor(rnd() * 31))),
    status: pick(statuses),
    confidence: Math.round((0.5 + rnd() * 0.45) * 100) / 100,
    risk: pick(["High", "Medium", "Low"]),
  });
}

// ---- write -----------------------------------------------------------------
const write = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
  console.log(`${name.padEnd(20)} ${Array.isArray(data) ? data.length : Object.keys(data).length} records`);
};
write("people.json", PEOPLE);
write("meetings.json", meetings);
write("emails.json", emails);
write("chats.json", chats);
write("documents.json", documents);
write("decision-log.json", decisionLog);
console.log("\nWork IQ month seeded (2026-05-15 → 2026-06-14).");
