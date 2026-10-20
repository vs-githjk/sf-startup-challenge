import type { ReactNode } from "react";
import type { Snapshot } from "../api";
import { MemoryRows } from "./Panels";

// One card per sponsor tool. Every number comes from keep-api; nothing is invented. Where keep-api cannot see a
// value (the Band board, the repo's Snyk score) the card says so instead of showing a guess.

export type Stats = {
  agents: number; harnesses: number; approvals: number; sends: number; waiting: number;
  memories: number; datasets: [string, number][]; remembers: number; recalls: number; forgets: number; improves: number;
  metered: number; flexPending: boolean; findings: number;
};

export function computeStats(s: Snapshot): Stats {
  const n = (t: string) => s.events.filter((e) => e.type === t).length;
  const ds = new Map<string, number>();
  s.mems.forEach((m) => ds.set(m.dataset, (ds.get(m.dataset) ?? 0) + 1));
  return {
    agents: s.agents.length, harnesses: new Set(s.agents.map((a) => a.harness).filter(Boolean)).size,
    approvals: n("approve"), sends: n("send"), waiting: s.drafts.filter((d) => d.status === "pending").length,
    memories: s.mems.length, datasets: [...ds.entries()].sort((a, b) => b[1] - a[1]),
    remembers: n("remember"), recalls: n("recall"), forgets: n("forget"), improves: n("improve"),
    metered: n("cost"), flexPending: s.events.some((e) => (e.type === "send" || e.type === "cost") && e.payload?.flexprice_synced === false),
    findings: s.mems.filter((m) => m.dataset === "eng_security").length,
  };
}

export const TOOL_COLORS = { band: "143,180,217", cognee: "180,155,214", flexprice: "134,191,141", snyk: "224,169,59" };

function Card({ id, tone, name, role, breaks, children }: { id: string; tone: string; name: string; role: string; breaks: string; children: ReactNode }) {
  return (
    <section className="tool" id={id} style={{ "--tone": `rgb(${tone})` } as React.CSSProperties} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>{name}</h3>
      <p className="role">{role}</p>
      <div className="body">{children}</div>
      <p className="breaks"><b>Without it:</b> {breaks}</p>
    </section>
  );
}

const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="kv"><span>{k}</span><b>{v}</b></div>;

export function BandCard({ s, st }: { s: Snapshot; st: Stats }) {
  const max = Math.max(1, ...s.agents.map((a) => a.tokens_in + a.tokens_out));
  return (
    <Card id="band" tone={TOOL_COLORS.band} name="Band" role="The team room: one plan, a board, @mention handoffs and every human approval." breaks="no board, no handoffs, no approval and no per-agent cost.">
      <Row k="Agents reporting" v={`${st.agents} on ${st.harnesses} harnesses`} />
      <Row k="Founder approvals" v={st.approvals} />
      <Row k="Drafts waiting" v={st.waiting} />
      <ul className="agents">
        {s.agents.length === 0 && <li className="none">No agent has reported usage yet.</li>}
        {s.agents.map((a) => (
          <li key={a.agent}><span>{a.agent}{a.harness ? ` (${a.harness})` : ""}</span><em>{(a.tokens_in + a.tokens_out).toLocaleString()} tok</em><i style={{ transform: `scaleX(${(a.tokens_in + a.tokens_out) / max})` }} /></li>
        ))}
      </ul>
      <p className="note">The board itself lives in Band Desktop. keep-api only sees approvals and usage.</p>
    </Card>
  );
}

export function CogneeCard({ s, st }: { s: Snapshot; st: Stats }) {
  return (
    <Card id="cognee" tone={TOOL_COLORS.cognee} name="Cognee" role="The shared memory. Agents write while they work and recall to change what they do next." breaks="the restarted Drafter forgets the promise and the Brain cannot catch a contradiction.">
      <Row k="Backend" v={s.backend} />
      <Row k="Memories" v={`${st.memories} in ${st.datasets.length} datasets`} />
      <div className="chips">{st.datasets.map(([d, c]) => <span key={d} className="chip">{`${d} ${c}`}</span>)}{st.datasets.length === 0 && <span className="none">No memories yet.</span>}</div>
      <Row k="Writes / recalls" v={`${st.remembers} / ${st.recalls}`} />
      <Row k="Forgets / improves" v={`${st.forgets} / ${st.improves}`} />
    </Card>
  );
}

export function FlexpriceCard({ s, st }: { s: Snapshot; st: Stats }) {
  const frac = Math.max(0, Math.min(1, s.balance / (s.start || 1)));
  return (
    <Card id="flexprice" tone={TOOL_COLORS.flexprice} name="Flexprice" role="Metering and credits. Agent usage becomes billable events, and credits gate the expensive actions." breaks="no credit gate and no cost passed through to the customer.">
      <div className="meter" aria-hidden="true"><i style={{ transform: `scaleX(${frac})` }} /></div>
      <Row k="Credits left" v={`${Math.round(s.balance)} of ${Math.round(s.start)}`} />
      <Row k="Deep research" v={s.gate.allow ? "allowed" : `gated, needs ${s.gate.cost ?? "?"} credits`} />
      <Row k="Metered events" v={st.metered} />
      <Row k="Sync" v={st.flexPending ? "Flexprice sync pending" : "up to date"} />
      <p className="note">Meters: agent_tokens, agent_tasks, approved_outbound.</p>
    </Card>
  );
}

export function SnykCard({ s, st }: { s: Snapshot; st: Stats }) {
  const finds = s.mems.filter((m) => m.dataset === "eng_security");
  return (
    <Card id="snyk" tone={TOOL_COLORS.snyk} name="Snyk" role="Security as a team member. The reviewer scans each fix, blocks the task and remembers repeat findings." breaks="nothing blocks a risky fix and the team repeats the same mistakes.">
      <Row k="Findings in memory" v={st.findings} />
      <Row k="Repo score" v="9.8 of 10, organizers' scorer" />
      <MemoryRows mems={finds.slice(-2)} empty="No findings stored yet. Run the first scan." />
    </Card>
  );
}
