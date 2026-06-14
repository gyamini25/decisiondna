import { describe, it, expect } from "vitest";
import { analyzeDecision } from "@/lib/agents/orchestrator";
import { MockLLMClient } from "@/lib/llm/mock-llm";
import hero from "@/data/transcripts/hero-support-staffing.json";
import lowconf from "@/data/transcripts/lowconf-sponsorship.json";

const llm = new MockLLMClient();
const REF = "2026-06-13";

describe("Scenario 1 — happy path (hero support-staffing)", () => {
  it("detects the decision, surfaces precedent, risk and Who-Was-Right", async () => {
    const result = await analyzeDecision(
      { text: hero.transcript, timestamp: REF },
      { llm, referenceDate: REF },
    );

    expect(result.type).toBe("analysis");
    expect(result.detection.proposal.toLowerCase()).toContain("support");
    expect(result.detection.direction).toBe("down");

    // Closest precedent is the support-staffing decision.
    expect(result.matches[0].decisionId).toBe("dec-2023-0312-support-staffing");

    // Risk is elevated (the precedent went negative).
    expect(result.risk?.overall).toBe("High");

    // Who Was Right surfaces validated objectors.
    const names = result.whoWasRight.map((w) => w.stakeholder);
    expect(names).toContain("Jane Smith");
    expect(
      result.whoWasRight.some((w) => w.verdict === "Concern Validated"),
    ).toBe(true);

    // Recommendations cite precedent and are prioritized.
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].priority).toBe("High");

    // Citations are auditable back to sources.
    expect(result.citations.length).toBeGreaterThan(0);

    // Foundry IQ grounding is present and grounded.
    expect(result.grounding?.passed).toBe(true);
    expect(result.grounding?.groundedSources).toBeGreaterThan(0);
  });
});

describe("Scenario 2 — low-confidence fallback (abstention)", () => {
  it("abstains with no fabricated risk/objections for an unrelated proposal", async () => {
    const result = await analyzeDecision(
      { text: lowconf.transcript, timestamp: REF },
      { llm, referenceDate: REF },
    );

    expect(result.type).toBe("insufficient-evidence");
    expect(result.confidence.confidence).toBeLessThan(0.6);
    expect(result.risk).toBeNull();
    expect(result.whoWasRight).toHaveLength(0);
    expect(result.weakMatches?.length).toBeGreaterThan(0);
    expect(result.message).toMatch(/below the .* threshold/i);
  });
});

describe("Scenario 3 — disagreement / threshold sensitivity", () => {
  it("raising the threshold forces abstention even on the hero", async () => {
    const result = await analyzeDecision(
      { text: hero.transcript, timestamp: REF },
      { llm, referenceDate: REF, threshold: 0.95 },
    );
    expect(result.type).toBe("insufficient-evidence");
  });
});

describe("Scenario 4 — telemetry (observability)", () => {
  it("emits a telemetry step per agent in the pipeline", async () => {
    const result = await analyzeDecision(
      { text: hero.transcript, timestamp: REF },
      { llm, referenceDate: REF },
    );
    const steps = result.telemetry.map((t) => t.step);
    expect(steps).toContain("detect");
    expect(steps).toContain("retrieve");
    expect(steps).toContain("score-evidence");
    expect(steps).toContain("risk");
    expect(steps).toContain("recommend");
  });
});

describe("Scenario 5 — deterministic (reliability)", () => {
  it("produces identical output across runs with the mock backend", async () => {
    const a = await analyzeDecision(
      { text: hero.transcript, timestamp: REF },
      { llm, referenceDate: REF },
    );
    const b = await analyzeDecision(
      { text: hero.transcript, timestamp: REF },
      { llm, referenceDate: REF },
    );
    expect(a.confidence.confidence).toBe(b.confidence.confidence);
    expect(a.matches[0].matchPct).toBe(b.matches[0].matchPct);
  });
});
