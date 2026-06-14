# DecisionDNA — Agents League submission checklist

**Deadline: June 14, 2026 · Winners: June 30 · Track: 💼 Enterprise Agents · Aiming: 🏆 Best Overall Agent**

## Mandatory (a submission is invalid without these)
- [x] **Public GitHub repo** with README → https://github.com/gyamini25/decisiondna
- [x] **≥1 Microsoft IQ layer integrated** → Foundry IQ (`lib/foundryiq/`) + Work IQ (`lib/workiq/`)
- [ ] **Demo video** (record from [docs/demo-script.md](demo-script.md) — keep ≤5 min, upload to YouTube)
- [ ] **Project description** (paste [docs/project-description.md](project-description.md) into the submission form)
- [ ] Read the **Disclaimer** — confirm no confidential info in the repo (✅ all data is synthetic)
- [ ] Submit via the **Projects** button on the hackathon site

## Scoring levers (maximize before submitting)
- [x] Accuracy & Relevance (20%) — four-signal scoring, corpus-verified
- [x] Reasoning & Multi-step (20%) — 7-step agent pipeline + telemetry
- [x] Reliability & Safety (20%) — confidence + abstention; grounding check
- [x] Creativity & Originality (15%) — "Who Was Right?" ledger
- [x] UX & Presentation (15%) — 9 screens, Decision Guard hero, Memory Graph
- [ ] **Community vote (10%)** — post [docs/discord-post.md](discord-post.md) in the Agents League Discord, rally votes

## Strongly recommended (lifts Best Overall + Best Use of IQ)
- [ ] Record the video showing BOTH the strong-precedent flow AND the abstention flow
- [ ] In the description, name the IQ layers explicitly (Foundry IQ + Work IQ)
- [ ] Optional: deploy live (Vercel/Azure) and put the URL in the README + submission
- [ ] Optional: go live with real Azure OpenAI (`MOCK_LLM=0`) for the recording so match %s hit ~90

## Nice-to-have
- [ ] Add `architecture.png` (export the diagram) — referenced by docs
- [ ] Pin the repo; add topics: `microsoft-agents-league`, `foundry-iq`, `semantic-kernel`
