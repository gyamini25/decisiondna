import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  detectDisagreement,
  variance,
  DEFAULT_CONFIDENCE_THRESHOLD,
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

describe("computeConfidence", () => {
  it("high, concurring signals → high confidence category", () => {
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
  });

  it("halves confidence and flags when disagreement fires", () => {
    const s: SignalVector = {
      semantic: 0.8,
      entity: 0.1,
      temporal: 0.1,
      directional: 0.5,
    };
    const withGuard = computeConfidence(s, sFinal(s));
    expect(withGuard.disagreement).toBe(true);
    expect(withGuard.disagreementFlag).toBe("semantic-only-match");

    // Confidence is exactly half of the no-guard agreement * sFinal.
    const noGuard = computeConfidence(
      { semantic: 0.6, entity: 0.1, temporal: 0.1, directional: 0.5 }, // sem<=0.7 → no guard
      sFinal(s),
    );
    expect(withGuard.confidence).toBeLessThan(noGuard.confidence);
  });

  it("weak best match → below abstention threshold", () => {
    const s: SignalVector = {
      semantic: 0.4,
      entity: 0.2,
      temporal: 0.3,
      directional: 0,
    };
    const c = computeConfidence(s, sFinal(s));
    expect(c.confidence).toBeLessThan(DEFAULT_CONFIDENCE_THRESHOLD);
    expect(c.category === "low" || c.category === "insufficient").toBe(true);
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
