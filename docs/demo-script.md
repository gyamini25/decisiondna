# DecisionDNA — 5-minute Demo Script

> Target: ≤ 5 min YouTube video for the Microsoft Agents League submission.
> App runs offline (`npm run dev`); no narration of setup needed.

## 0:00–0:45 — The problem
> "Every organization makes thousands of decisions a year — and repeats the same
> mistakes. Objections vanish after the meeting. The people who correctly
> predicted the risk are forgotten. New leaders re-run failed plays. DecisionDNA
> is the organization's decision memory — it remembers what happened, why, and
> *who was right*."

Show the **Home** dashboard: KPIs, recent decisions, the AI agent active pill.

## 0:45–2:00 — Live detection + retrieval
Open **Decision Guard**. Scenario: *Support staffing cut*.
> "In a live leadership meeting, Laura proposes reducing customer support
> staffing by 20%."

- The left panel shows the transcript; DecisionDNA fires a **Decision Detected**
  banner.
- The center panel shows **Similar Decisions Found** — expand a card to reveal the
  **four-signal breakdown** (semantic / entity / temporal / directional, each
  weighted).
> "This isn't cosine similarity guessing — it's a weighted composite of four
> independent, auditable signals."

## 2:00–3:00 — Who Was Right?
Scroll to the **Who Was Right?** card.
> "Two years ago, Jane Smith warned wait times would spike, and Ravi Patel
> warned CSAT would drop. Both were proven right — wait times rose 28%, CSAT fell
> 6 points. DecisionDNA resurfaces their validated foresight automatically."

## 3:00–3:45 — Risk + recommendation
Right panel: **HIGH RISK**, four risk dimensions, recommended actions.
> "The closest precedent went negative and was reversed — so this scores HIGH
> risk. DecisionDNA recommends what actually worked last time: deploy chatbot
> deflection *before* cutting staffing, add overflow coverage, define rollback
> criteria."

Click **Request Review** → confirmation: *Decision added to Organizational
Memory*. (Mock Power Automate Teams Adaptive Card.)

## 3:45–4:30 — Reliability: abstention
Switch scenario to **F1 sponsorship**.
> "What happens when there's no precedent? DecisionDNA doesn't bluff. Confidence
> is below threshold, so it abstains — showing the closest weak matches and which
> signals disagree, and refusing to fabricate a risk score. That's the safety
> behavior enterprises need."

## 4:30–5:00 — Memory & close
Open **Memory Graph** (decisions ↔ stakeholders ↔ risks ↔ outcomes) and
**Reports** (who-was-right accuracy, risk distribution).
> "Every decision becomes queryable organizational memory. DecisionDNA turns
> your company's history into evidence-based foresight — built end-to-end on the
> Microsoft Agent Framework, Semantic Kernel, Azure OpenAI, AI Search, Cosmos DB,
> Graph, and Power Automate."

## Talking points to land
- Four-signal evidence model (not cosine alone) — **accuracy**.
- 7-step Agent Framework pipeline with telemetry — **reasoning**.
- Confidence + abstention — **reliability & responsible AI**.
- "Who Was Right?" — **creativity**.
- Polished 9-screen dashboard — **UX**.
