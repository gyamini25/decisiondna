/**
 * Demo transcript registry. Bundles the authored meeting transcripts so the
 * Decision Guard screen can replay them and the analyze API can run on them by id.
 */

import hero from "@/data/transcripts/hero-support-staffing.json";
import lowconf from "@/data/transcripts/lowconf-sponsorship.json";

export interface TranscriptLineRecord {
  speaker: string;
  role: string;
  time: string;
  text: string;
}

export interface TranscriptDoc {
  id: string;
  title: string;
  date: string;
  scenario: string;
  participants: { name: string; role: string }[];
  lines: TranscriptLineRecord[];
  transcript: string;
}

const REGISTRY: Record<string, TranscriptDoc> = {
  "hero-support-staffing": hero as TranscriptDoc,
  "lowconf-sponsorship": lowconf as TranscriptDoc,
  // also addressable by meeting id
  "meeting-leadership-sync-support-coverage": hero as TranscriptDoc,
  "meeting-brand-sync-sponsorship": lowconf as TranscriptDoc,
};

export function getTranscript(id?: string): TranscriptDoc {
  if (id && REGISTRY[id]) return REGISTRY[id];
  return hero as TranscriptDoc;
}

export function listTranscripts(): TranscriptDoc[] {
  return [hero as TranscriptDoc, lowconf as TranscriptDoc];
}
