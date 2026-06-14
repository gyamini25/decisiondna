/**
 * Agent 1 — DetectDecisionAgent.
 *
 * SK plugin: extracts the proposed decision from a meeting transcript — the
 * proposal text, who proposed it, the intended trend direction, and salient
 * entities — with a detection confidence. Mock uses verb/keyword heuristics;
 * Azure uses GPT function-calling (llm.detectDirection / extractEntities).
 */

import type { DecisionDetection, Trend } from "@/lib/types";
import type { LLMClient } from "@/lib/llm";

const DECISION_VERBS =
  /\b(reduce|cut|lower|decrease|increase|raise|grow|expand|launch|deploy|consolidat|outsourc|freeze|migrat|sponsor|trial|hire|acquire|invest|downsize|restructure)/i;

export interface TranscriptLine {
  speaker: string;
  role?: string;
  text: string;
}

export interface DetectInput {
  /** Raw transcript text, e.g. "Laura Mitchell (00:12): Let's reduce …". */
  text: string;
  /** Optional structured lines (preferred when available). */
  lines?: TranscriptLine[];
  timestamp?: string;
}

/** Parse "Name (00:12): text" lines from a flat transcript. */
function parseLines(text: string): TranscriptLine[] {
  const re = /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s*\([^)]*\):\s*([^]*?)(?=(?:[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?\s*\([^)]*\):)|$)/g;
  const out: TranscriptLine[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ speaker: m[1].trim(), text: m[2].trim() });
  }
  return out;
}

export async function detectDecision(
  input: DetectInput,
  llm: LLMClient,
): Promise<DecisionDetection> {
  const lines = input.lines?.length ? input.lines : parseLines(input.text);

  // The proposal is the first line containing a decision verb (fallback: first).
  const proposalLine =
    lines.find((l) => DECISION_VERBS.test(l.text)) ?? lines[0];

  const proposal = proposalLine?.text ?? input.text.slice(0, 200);
  const proposer = proposalLine?.speaker ?? "Unknown";

  const [direction, entities] = await Promise.all([
    llm.detectDirection(proposal),
    llm.extractEntities(proposal),
  ]);

  const hasVerb = DECISION_VERBS.test(proposal);
  const confidence = hasVerb ? 0.92 : 0.55;

  return {
    isDecision: hasVerb || lines.length > 0,
    proposal,
    proposer,
    timestamp: input.timestamp ?? new Date().toISOString(),
    confidence,
    direction: direction as Trend,
    entities,
  };
}

/** Context text used to enrich retrieval: proposal + all transcript lines. */
export function buildContextText(input: DetectInput): string {
  const lines = input.lines?.length ? input.lines : parseLines(input.text);
  return lines.map((l) => l.text).join(" ") || input.text;
}
