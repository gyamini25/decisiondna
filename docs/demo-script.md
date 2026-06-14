# DecisionDNA — 5-minute Demo Script (run-of-show)

> ≤ 5 min for the Microsoft Agents League submission. Record locally with
> `npm run dev`. For the strongest numbers, run live (`MOCK_LLM=0` + Azure
> OpenAI via `./scripts/provision-azure.sh --openai-only`); keep `MOCK_LLM=1` as
> an instant fallback if anything hiccups — the app is identical either way.

Each beat is tagged with the judging criterion it targets (Accuracy/Reasoning/
Reliability 20% each; Creativity/UX 15% each; Community vote 10%).

## 0:00–0:40 — Problem  · *UX, Creativity*
Open **Home**.
> "Every organization makes thousands of decisions a year and repeats the same
> mistakes — objections vanish after meetings, and the people who correctly
> predicted the risk are forgotten. DecisionDNA is the decision memory layer."

Point at the KPIs and the **Evidence Summary** — "this is built from a month of
real org signal via **Work IQ**: 27 meetings, 57 emails, 58 chats, 16 documents."

## 0:40–2:15 — Live detection + retrieval  · *Accuracy, Reasoning*
Open **Decision Guard** (hero). It's a live **Microsoft Teams** meeting.
> "Laura proposes reducing customer support staffing by 20%."

- DecisionDNA fires **Decision Detected**.
- Center: **Similar Decisions Found** — expand a card to show the **four-signal
  breakdown** (semantic · entity · temporal · directional, each weighted).
> "This isn't cosine similarity guessing — it's a weighted composite of four
> independent, auditable signals."
- Show **Foundry IQ — Grounded Evidence** with citations.
> "Every claim is grounded and cited via Foundry IQ, with a source-diversity
> check to reduce hallucination."

## 2:15–3:00 — Who Was Right?  · *Creativity (the differentiator)*
Scroll to the **Who Was Right?** card. Linger here.
> "Two years ago Jane Smith warned wait times would spike and Ravi Patel warned
> CSAT would drop — both proven right (+28% wait, −6 CSAT). DecisionDNA
> resurfaces their validated foresight automatically."

## 3:00–3:40 — Risk → recommend → approve  · *Reasoning, Enterprise*
Right panel: **HIGH RISK**, four dimensions, recommended actions.
> "The closest precedent went negative and was reversed, so this scores HIGH. It
> recommends what actually worked: deploy chatbot deflection before cutting
> staffing, add overflow coverage, define rollback criteria."

Click **Request Review** → "routes a Teams Adaptive Card via Power Automate and
writes the decision to organizational memory."

## 3:40–4:20 — Reliability: abstention  · *Reliability & Safety (the moment)*
Switch the scenario dropdown to **F1 sponsorship**.
> "No precedent? DecisionDNA doesn't bluff. Confidence is below threshold, so it
> **abstains** — showing the closest weak matches and which signals disagree, and
> refusing to fabricate a risk score. That's the safety behavior enterprises need."

## 4:20–5:00 — Memory & close  · *Enterprise, IQ requirement*
Flash **Memory Graph** (decisions ↔ stakeholders ↔ risks ↔ outcomes; click a node
to show its description) and **Reports** (who-was-right accuracy, trend, risk).
> "Every decision becomes queryable organizational memory. Built end-to-end on
> the **Microsoft Agent Framework + Semantic Kernel**, **Azure OpenAI**, and the
> **Foundry IQ + Work IQ** intelligence layers, surfaced through a **Microsoft 365
> Copilot** agent."

## Don't forget
- Mention the **Microsoft IQ** integration explicitly (Foundry IQ + Work IQ) —
  it's a mandatory requirement and a scored item.
- Close with the GitHub link and a one-line CTA to vote in the Discord poll (10%).
