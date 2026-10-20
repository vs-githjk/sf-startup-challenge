import type { ReactNode } from "react";
import type { Snapshot } from "../api";

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

export type Link = { id: keyof typeof TOOL_COLORS; name: string; ok: boolean | null; state: string; fact: string };

// One honest line per tool: connected, not connected, or nothing to show yet. Built only from keep-api data.
export function connections(s: Snapshot, st: Stats): Link[] {
  const real = s.backend.startsWith("CogneeBackend");
  return [
    { id: "band", name: "Band", ok: st.agents > 0 ? true : null, state: st.agents > 0 ? "agents reporting" : "waiting for agents",
      fact: st.agents > 0 ? `${st.agents} agents on ${st.harnesses} harnesses, ${st.approvals} approvals` : "Open a Band room and @mention an agent" },
    { id: "cognee", name: "Cognee", ok: real, state: real ? "connected" : "offline store",
      fact: real ? `${st.memories} memories in ${st.datasets.length} datasets` : `${s.backend}. Start memory with scripts/start-memory.sh` },
    { id: "flexprice", name: "Flexprice", ok: s.gate.source === "flexprice", state: s.gate.source === "flexprice" ? "connected" : "local wallet",
      fact: `${Math.round(s.balance)} credits left, deep research ${s.gate.allow ? "allowed" : "gated"}` },
    { id: "snyk", name: "Snyk", ok: st.findings > 0 ? true : null, state: st.findings > 0 ? "findings stored" : "no scan yet",
      fact: st.findings > 0 ? `${st.findings} findings remembered` : "The Security Reviewer stores findings after a scan" },
  ];
}

export function Connections({ links }: { links: Link[] }) {
  return (
    <ul className="links">
      {links.map((l) => (
        <li key={l.id}>
          <span className={`dot ${l.ok === true ? "ok" : l.ok === false ? "off" : "idle"}`} aria-hidden="true" />
          <b>{l.name}</b><em>{l.state}</em><span className="fact">{l.fact}</span>
        </li>
      ))}
    </ul>
  );
}

export function CostPanel({ s, st }: { s: Snapshot; st: Stats }) {
  const frac = Math.max(0, Math.min(1, s.balance / (s.start || 1)));
  const max = Math.max(1, ...s.agents.map((a) => a.tokens_in + a.tokens_out));
  return (
    <>
      <div className="meter" aria-hidden="true"><i style={{ transform: `scaleX(${frac})` }} /></div>
      <p className="hint">{Math.round(s.balance)} of {Math.round(s.start)} credits left. Deep research {s.gate.allow ? "is allowed" : `is gated and needs ${s.gate.cost ?? "?"} credits`}.{st.flexPending ? " Flexprice sync pending." : ""}</p>
      <ul className="agents">
        {s.agents.length === 0 && <li className="none">No agent has reported usage yet.</li>}
        {s.agents.map((a) => (
          <li key={a.agent}><span>{a.agent}{a.harness ? ` (${a.harness})` : ""}</span><em>{(a.tokens_in + a.tokens_out).toLocaleString()} tokens</em><i style={{ transform: `scaleX(${(a.tokens_in + a.tokens_out) / max})` }} /></li>
        ))}
      </ul>
    </>
  );
}
