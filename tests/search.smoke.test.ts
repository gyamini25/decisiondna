import { describe, it, expect } from "vitest";
import { retrieveSimilar } from "@/lib/search";
import { MockLLMClient } from "@/lib/llm/mock-llm";

const llm = new MockLLMClient();

describe("hybrid retrieval (mock LLM) — hero scenario", () => {
  it("ranks support-related precedents highest for a support-staffing cut", async () => {
    const ranked = await retrieveSimilar(
      { text: "Reduce customer support staffing by 20% to optimize costs. This could impact APAC customers, we saw issues with weekend coverage. Incident response capacity affected during APAC hours. Run a pilot for 4 weeks before full rollout.", direction: "down", referenceDate: "2026-06-13" },
      llm,
    );
    const top3 = ranked.slice(0, 3).map((c) => c.record.id);
    expect(ranked[0].record.id).toBe("dec-2023-0312-support-staffing");
    expect(top3.filter((id) => id.includes("support")).length).toBeGreaterThanOrEqual(2);
    // Hero surfaces above the abstention threshold.
    expect(ranked[0].confidence.confidence).toBeGreaterThan(0.6);
  });
});

describe("hybrid retrieval (mock LLM) — low-confidence scenario", () => {
  it("returns only weak matches for an unrelated motorsport sponsorship", async () => {
    const ranked = await retrieveSimilar(
      { text: "Sponsor a Formula 1 motorsport team for brand awareness in new markets", direction: "up", referenceDate: "2026-06-13" },
      llm,
    );
    // No precedent clears the abstention threshold → the pipeline will abstain.
    expect(ranked[0].confidence.confidence).toBeLessThan(0.6);
  });
});
