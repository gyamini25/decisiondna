import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  detectDisagreement,
  variance,
  surfaces,
} from "@/lib/confidence";
import { sFinal } from "@/lib/scoring";
import type { SignalVector } from "@/lib/types";

describe("variance", () => {
  it("zero for identical values", () => {
    expect(variance([0.5, 0.5, 0.5, 0.5])).toBe(0);
  });
  it("positive for spread values", () => {
    expect(variance([0, 1])).toBeCloseTo(0.25, 6);
  });
});

describe("disagreement detector (semantic-only-match)", () => {
  it("fires when semantic high but entity & temporal low", () => {
    expect(
      detectDisagreement({
        semantic: 0.8,
        entity: 0.1,
        temporal: 0.1,
        directional: 0.5,
      }),
    ).toBe(true);
  });
  it("does not fire when entity support exists", () => {
    expect(
      detectDisagreement({
        semantic: 0.8,
        entity: 0.6,
        temporal: 0.6,
        directional: 1,
      }),
    ).toBe(false);
  });
});

describe("computeConfidence — C = 1 − Var(signals)", () => {
  it("strong concurring signals → high confidence; surfaces", () => {
    const s: SignalVector = {
      semantic: 0.9,
      entity: 0.85,
      temporal: 0.88,
      directional: 1,
    };
    const c = computeConfidence(s, sFinal(s));
    expect(c.category).toBe("high");
    expect(c.confidence).toBeGreaterThan(0.8);
    expect(c.disagreement).toBe(false);
    expect(surfaces(c.confidence, sFinal(s))).toBe(true);
  });

  it("halves confidence and flags on a semantic-only bluff → does NOT surface", () => {
    const s: SignalVector = {
      semantic: 0.8,
      entity: 0.1,
      temporal: 0.1,
      directional: 0.5,
    };
    const c = computeConfidence(s, sFinal(s));
    expect(c.disagreement).toBe(true);
    expect(c.disagreementFlag).toBe("semantic-only-match");
    // Guard halves C below 0.6 → abstains.
    expect(c.confidence).toBeLessThan(0.6);
    expect(surfaces(c.confidence, sFinal(s))).toBe(false);
  });

  it("uniformly weak but concurring signals → HIGH C, but abstains on evidence floor", () => {
    const s: SignalVector = {
      semantic: 0.4,
      entity: 0.2,
      temporal: 0.3,
      directional: 0,
    };
    const c = computeConfidence(s, sFinal(s));
    // Signals agree, so C is high — this is exactly why C alone can't abstain...
    expect(c.confidence).toBeGreaterThan(0.6);
    // ...but S_final is below the relevance floor, so the protocol abstains.
    expect(sFinal(s)).toBeLessThan(0.5);
    expect(surfaces(c.confidence, sFinal(s))).toBe(false);
  });

  it("reports diverging signals for the UI", () => {
    const s: SignalVector = {
      semantic: 0.95,
      entity: 0.2,
      temporal: 0.9,
      directional: 1,
    };
    const c = computeConfidence(s, sFinal(s));
    expect(c.divergingSignals).toContain("Entity alignment");
  });
});
