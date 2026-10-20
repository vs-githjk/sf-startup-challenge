# Ideas: SF Startup Challenge, Oct 20, 2026 (5-hour sprint, team of 3)

Written 2026-10-20 10:50 PDT by master-planner. Rubric source: `plan/challenge.md` (Band 25, Cognee 25, viability 20, execution and demo 20, innovation 10, Flexprice +10, Snyk +10; total 130).
Assumptions (not confirmed, change if wrong): sprint runs 11:00 to 16:00 PDT; pre-built code is allowed ("reuse allowed" in challenge.md); Vidyut is Person A; B is the strongest Python person; C takes integrations and the video.

## 1. Senior critique of the idea as written (judged blind, exactly as stated)

Idea as written: Track 6 + Track 8 + Track 3 as a "Prism version": every founder conversation (investor meeting, customer call, support ticket) flows into a Band room, specialist agents process and hand off, Cognee holds relationship and company memory, promises are tracked, founder approves outbound actions in Band. Plus BetterBill for billing.

Verdict: the instinct is right (Prism's "conversation in, accountable actions out" is exactly what Band rooms and Cognee memory reward), but as written it is three products and will lose on execution.

What is wrong with it:
1. **Three input types means three pipelines, three seeded datasets and three demo stories.** In 5 hours with 3 people you get one flow that works well or three that half work. Judges score the one they watch (execution 20).
2. **"Knowledge OS / wiki" is not a flow, it is a by-product.** A wiki has no live moment and no human approval. It should be what Cognee holds, not a track you build.
3. **"Memory changes behavior" is not designed in.** The idea says Cognee "holds" memory. The rubric pays for memory that makes an agent do something different, across a restart and across agents. That moment has to be scripted first and everything else built around it, or Cognee reads as a bolted-on store (disqualification risk).
4. **BetterBill's billing angle pulls toward a fourth product** (invoice audit). Its real value here is a pattern, not a feature: evidence tiers on every claim and an approval saved with a hash of the exact text.
5. **No clear "one sentence a judge repeats".** "AI founder OS" is what every other team will say today (the theme literally is "AI-native startup run by agents").
6. **Viability is vague.** "Founders" is a market, not a buyer. A crisp buyer: seed and Series A founders running a raise while also doing customer success themselves.

Blind score as written (1 to 5): Band 4, Cognee 4, viability 3, execution 2, innovation 3, Flexprice 3, Snyk 2. Weighted 76 / 130.

The fix: **one product, one hero flow (the investor follow-up), with customer calls and support tickets as the memory that changes what the investor agents do.** The cross-context link is the innovation: your agents never tell an investor something your customers contradict, and never forget a promise you made to either.

## 2. Gates (applied to all variants)
- Whose mother does this: founders juggle investor follow-ups and customer promises by hand (spreadsheets, Notion CRMs, monthly investor updates). Status: REPORTED, not verified in this pass. Pull named evidence from `plan/research.md` (master-finder) into the README before submission; if research finds none, say "founder interviews pending" rather than invent.
- Live demo test: pass for V1 and V2 (a transcript goes in, the Band board moves, a human approves in the room, the draft changes because of memory). V3 weak (a wiki update is not watchable).
- Company plus consumer pain: V1 buyer = the founder (pays per seat or per credit); person who feels it = founder and the investor who gets inconsistent updates. V2 buyer = head of support. V3 buyer = ops lead, crowded market (Glean, Notion AI).

## 3. Ranked variants

| # | Name | Band 25 | Cognee 25 | Viab 20 | Exec 20 | Innov 10 | Flexprice 10 | Snyk 10 | Weighted /130 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **PrismKeep** | 5 | 5 | 4 | 4 | 4 | 4 | 3 | **104** |
| 2 | Prism Case Room | 5 | 4 | 4 | 4 | 2 | 5 | 3 | 97 |
| 3 | Prism Company Brain | 3 | 5 | 3 | 3 | 2 | 2 | 3 | 78 |
| - | As written (3 tracks) | 4 | 4 | 3 | 2 | 3 | 3 | 2 | 76 |
(Weighted = sum of score x weight / 5.)

### V1 (recommended): PrismKeep
**Pitch:** PrismKeep remembers every promise you make to investors and customers, and never lets your agents send something your other conversations contradict.

Update after Vidyut's correction (11:05): ONE integrated product that weaves all three tracks, build split by layer, not by track. PrismKeep already is that weave:
- Track 3 (customer success) is the **input and action** on the customer side: support tickets and customer calls are triaged, fixed and answered by the squad.
- Track 6 (investor and fundraise) is the **input and action** on the investor side: meetings become promises and truthful follow-ups.
- Track 8 (knowledge OS) is the **spine**: one Cognee company brain that both sides write to and read from, plus a Brain agent that answers "what did we promise X and who owns it?" and routes to the owner.
The weave is the product: a customer truth constrains an investor claim, an investor promise shows up on the customer side's board, and a security finding on a customer fix becomes company memory.

#### Sell it (hypotheses to say out loud, not verified)
- Buyer: founder or COO of a seed to Series A B2B company (about 3 to 30 people) where the founders still run sales, support and the raise themselves.
- Price: $99 per workspace per month with 1,000 credits; a processed conversation 10 credits, an approved outbound action 5, a security-gated fix 20; overage $0.02 per credit; agent compute passed through in credits. Metered in Flexprice, which is also how the demo enforces the credit gate.
- Why now: (1) founders now send AI-drafted outbound to investors and customers at volume, so inconsistent claims are a real fundraising and churn risk; (2) agent rooms with a human in the loop (Band) make agent outbound approvable and auditable; (3) graph memory with correction (Cognee 1.x remember, recall, improve, forget) makes "fix what the agent believes" a one-line action instead of a re-index.
- Wedge: start with the founder's raise (urgent, time-boxed, high stakes), expand to customer success once the brain holds the customer history.
- Hero flow: investor meeting transcript drops into a Band fundraise room; Chief of Staff (Claude Code) writes the plan to the board; Extractor (LangGraph) logs promises to Cognee; Drafter (Codex) writes the follow-up; Truth Checker (LangGraph) checks every claim against company memory from customer calls and blocks the draft when a customer call contradicts it; founder corrects and approves in Band; cost card plus Flexprice credits.
- Why it wins: Band is the product surface (rooms per relationship, board, handoffs, approvals, cost). Cognee is the product's brain, and the demo turns on two recall moments (across restart, across agents) plus a forget/improve correction. Removing either breaks the story by construction. Innovation: cross-context consistency (customer truth constrains investor messaging) is a sentence a judge repeats.
- Feasibility: yellow. Risky parts: Band setup and mixed-harness wiring in hour 1; Cognee recall quality on a live query; `forget` needing a data id.
- Wow in first 30 s: the Drafter's first draft says "no churn this quarter"; the Truth Checker blocks it citing the Acme call from last week, in the Band room, without anyone copy-pasting.
- Maturity: Band Desktop and its agent API: Experimental (docs mark Chat Tasks "beta", VERIFIED docs.band.ai). Cognee 1.x remember/recall/improve/forget: Emerging (v1.6.5 on PyPI per research.md; README VERIFIED). LangGraph: Proven. Neo4j: Proven. Flexprice: Emerging (open source, SDKs for Python/JS/Go, VERIFIED docs.flexprice.io). Snyk CLI: Proven.

### V2: Prism Case Room (Track 3 hero)
**Pitch:** One Band room per support case; triage, billing and technical agents hand off, the billing agent reads the customer's real Flexprice usage and invoice, and refunds wait for a human.
- Why it could win: best Flexprice fit (billing agent reads usage and invoice context, refunds become wallet credits), natural human approval (refund), BetterBill's audit rules map cleanly to invoice disputes.
- Why it ranks second: customer-success agent squads will be the most common build today, so innovation is low; Cognee "known fixes" memory is solid but less surprising.
- Keep it as the fallback if the investor angle tests badly with teammates in the first 15 minutes.

### V3: Prism Company Brain (Track 8 hero)
**Pitch:** Cognee builds a living company wiki from every conversation; curator and Q&A agents route questions to the right owner.
- Avoid: no live moment, no natural human approval, weak Flexprice, and a crowded category. Its good part (Cognee as company memory) is already inside V1.

## 4. What I would avoid
Building three input pipelines. Building a web UI before the Band flow works (Band is the UI; judges want to see rooms, board and cost there). Running Cognee in several processes against file-based stores (lock contention); one memory service owns Cognee.
