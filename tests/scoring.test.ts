import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  jaccard,
  temporalConsistency,
  directionalCorrectness,
  normalizeDirection,
  dayDelta,
  sFinal,
  scoreCandidate,
  rankCandidates,
  SIGNAL_WEIGHTS,
} from "@/lib/scoring";
import type { DecisionRecord, SignalVector } from "@/lib/types";
import corpus from "@/data/corpus/decisions.json";

const records = corpus.records as unknown as DecisionRecord[];

describe("signal weights", () => {
  it("sum to 1.0", () => {
    const sum =
      SIGNAL_WEIGHTS.semantic +
      SIGNAL_WEIGHTS.entity +
      SIGNAL_WEIGHTS.temporal +
      SIGNAL_WEIGHTS.directional;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe("Signal 1 — cosine similarity", () => {
  it("identical vectors → 1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });
  it("orthogonal vectors → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });
  it("clamps negatives to 0", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
  });
});

describe("Signal 2 — entity Jaccard", () => {
  it("full overlap → 1", () => {
    expect(jaccard(["APAC", "CSAT"], ["csat", "apac"])).toBe(1);
  });
  it("no overlap → 0", () => {
    expect(jaccard(["APAC"], ["EMEA"])).toBe(0);
  });
  it("half overlap → 1/3 (|∩|=1,|∪|=3)", () => {
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3, 6);
  });
  it("two empty sets → 0", () => {
    expect(jaccard([], [])).toBe(0);
  });
});

describe("Signal 3 — temporal consistency", () => {
  it("zero delta → 1", () => {
    expect(temporalConsistency(0)).toBe(1);
  });
  it("monotonically decreasing with delta", () => {
    expect(temporalConsistency(30)).toBeGreaterThan(temporalConsistency(365));
  });
  it("dayDelta computes absolute day difference", () => {
    expect(dayDelta("2024-01-01", "2024-01-31")).toBeCloseTo(30, 6);
  });
});

describe("Signal 4 — directional correctness", () => {
  it("same trend → 1", () => {
    expect(directionalCorrectness("down", "down")).toBe(1);
  });
  it("opposite trend → 0", () => {
    expect(directionalCorrectness("up", "down")).toBe(0);
  });
  it("flat involved → 0.5", () => {
    expect(directionalCorrectness("flat", "down")).toBe(0.5);
  });
  it("normalizes vocab", () => {
    expect(normalizeDirection("decline")).toBe("down");
    expect(normalizeDirection("improvement")).toBe("up");
    expect(normalizeDirection("neutral")).toBe("flat");
  });
});

describe("Composite S_final", () => {
  it("equals the documented weighted sum", () => {
    const s: SignalVector = {
      semantic: 0.91,
      entity: 0.78,
      temporal: 0.86,
      directional: 1.0,
    };
    const expected = 0.35 * 0.91 + 0.3 * 0.78 + 0.2 * 0.86 + 0.15 * 1.0;
    expect(sFinal(s)).toBeCloseTo(expected, 10);
  });
});

describe("Engine reproduces the corpus evidenceSignals (auditability)", () => {
  for (const r of records) {
    it(`${r.id}: sFinal / confidence / rank match stored ±0.02`, () => {
      const signals: SignalVector = {
        semantic: r.evidenceSignals.semanticSimilarity,
        entity: r.evidenceSignals.entityAlignment,
        temporal: r.evidenceSignals.temporalConsistency,
        directional: r.evidenceSignals.directionalCorrectness,
      };
      const scored = scoreCandidate(signals, r);
      expect(scored.sFinal).toBeCloseTo(r.evidenceSignals.sFinal, 1);
      expect(scored.confidence.confidence).toBeCloseTo(
        r.evidenceSignals.confidence,
        1,
      );
      expect(scored.rank).toBeCloseTo(r.evidenceSignals.rank, 1);
    });
  }
});

describe("Ranking", () => {
  it("orders candidates by R = S_final · confidence descending", () => {
    const scored = records.map((r) =>
      scoreCandidate(
        {
          semantic: r.evidenceSignals.semanticSimilarity,
          entity: r.evidenceSignals.entityAlignment,
          temporal: r.evidenceSignals.temporalConsistency,
          directional: r.evidenceSignals.directionalCorrectness,
        },
        r,
      ),
    );
    const ranked = rankCandidates(scored);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].rank).toBeGreaterThanOrEqual(ranked[i].rank);
    }
    // The chatbot-deflection record is the strongest in the corpus.
    expect(ranked[0].record.id).toBe("dec-2023-0921-chatbot-deflection");
  });
});
