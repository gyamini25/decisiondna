#!/usr/bin/env node
/**
 * Regenerate the derived evidence signals (sFinal, confidence, rank) for every
 * corpus record from its four raw signals, using the SAME formulas as
 * lib/scoring.ts + lib/confidence.ts. Run after changing the scoring model:
 *
 *   node scripts/recompute-signals.mjs
 *
 * Keep these constants in sync with lib/confidence.ts (SUFFICIENCY_X0 / _K).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, "..", "data", "corpus", "decisions.json");

const W = { sem: 0.35, ent: 0.3, time: 0.2, dir: 0.15 };

const variance = (a) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length;
};
const r2 = (x) => Math.round(x * 100) / 100;

const data = JSON.parse(readFileSync(CORPUS, "utf8"));
for (const r of data.records) {
  const es = r.evidenceSignals;
  const sem = es.semanticSimilarity;
  const ent = es.entityAlignment;
  const time = es.temporalConsistency;
  const dir = es.directionalCorrectness;

  const sFinal = W.sem * sem + W.ent * ent + W.time * time + W.dir * dir;
  // C = 1 − Var(signals), with the semantic-bluff guard halving it.
  let c = 1 - variance([sem, ent, time, dir]);
  const disagreement = sem > 0.7 && ent < 0.3 && time < 0.3;
  if (disagreement) c *= 0.5;
  const confidence = Math.max(0, Math.min(1, c));
  const rank = sFinal * confidence;

  es.sFinal = r2(sFinal);
  es.confidence = r2(confidence);
  es.rank = r2(rank);
}

writeFileSync(CORPUS, JSON.stringify(data, null, 2) + "\n");
console.log(`Recomputed signals for ${data.records.length} records.`);
