import { useEffect, useMemo, useState, type FC } from "react";
import { DEMO, load, type Snapshot } from "./api";
import { conversations, findConflicts, graphData } from "./derive";
import { steps } from "./components/Pipeline";
import { computeStats, connections } from "./components/Tools";
import { Agents, Contradictions, Conversations, MemoryMap, NeedsYou, Promises, type Data } from "./Screens";

function useKeep() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      try { const s = await load(); if (alive) { setSnap(s); setError(null); } }
      catch (e) { if (alive) setError((e as Error).message); } // keep the last good data on a transient error
    };
    tick();
    const t = setInterval(tick, 2000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return { snap, error };
}

// Hash routes keep the screen on refresh and make back/forward work, without a router dependency.
const SCREENS: { id: string; name: string; C: FC<{ d: Data }> }[] = [
  { id: "needs-you", name: "Needs you", C: NeedsYou },
  { id: "contradictions", name: "Contradictions", C: Contradictions },
  { id: "promises", name: "Promises", C: Promises },
  { id: "conversations", name: "Conversations", C: Conversations },
  { id: "memory", name: "Memory map", C: MemoryMap },
  { id: "agents", name: "Agents and cost", C: Agents },
];
const route = () => { const h = location.hash.replace(/^#\/?/, ""); return SCREENS.some((x) => x.id === h) ? h : "needs-you"; };
function useRoute() {
  const [r, setR] = useState(route);
  useEffect(() => { const on = () => setR(route()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  return r;
}

const EMPTY: Snapshot = { mems: [], drafts: [], agents: [], events: [], balance: 0, start: 1000, gate: { feature: "deep_research", allow: false }, backend: "not connected" };

export default function App() {
  const { snap, error } = useKeep();
  // Specular highlight that follows the pointer across a glass panel, as on the reference page.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = (e.target as HTMLElement | null)?.closest?.(".panel") as HTMLElement | null;
      if (!p) return;
      const r = p.getBoundingClientRect();
      p.style.setProperty("--mx", `${e.clientX - r.left}px`); p.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);
  const s = snap ?? EMPTY;
  const st = useMemo(() => computeStats(s), [s]);
  const d = useMemo(() => {
    const conflicts = findConflicts(s.drafts, s.mems, s.events);
    const g = graphData(s.mems, s.drafts, conflicts);
    return {
      conflicts, nodes: g.nodes.map((n) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 })), links: g.links,
      promises: s.mems.filter((m) => m.kind === "promise"),
    };
  }, [s]);

  const convos = useMemo(() => conversations(s.mems), [s.mems]);
  const links = useMemo(() => connections(s, st, convos.filter((c) => c.origin === "prism").length), [s, st, convos]);
  const flow = useMemo(() => steps(s, st, convos, d.conflicts.length), [s, st, convos, d.conflicts]);

  const data: Data = { s, st, live: !!snap && !error, conflicts: d.conflicts, promises: d.promises, convos, links, flow, nodes: d.nodes, glinks: d.links };
  const counts: Record<string, number> = { "needs-you": st.waiting, contradictions: d.conflicts.length, promises: d.promises.length, conversations: convos.length };
  const r = useRoute();
  const cur = SCREENS.find((x) => x.id === r)!;
  useEffect(() => { document.title = `${cur.name} - PrismKeep`; }, [cur]);

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="side">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 29 27H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M16 3v24" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></svg>
          <span className="word">PrismKeep</span>
        </div>
        <nav aria-label="Screens">
          <ul>
            {SCREENS.map((x) => (
              <li key={x.id}>
                <a href={`#/${x.id}`} aria-current={x.id === r ? "page" : undefined}>
                  <span>{x.name}</span>
                  {counts[x.id] ? <b className={x.id === "contradictions" || x.id === "needs-you" ? "hot" : ""}>{counts[x.id]}</b> : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-foot">
          <div className="status" role="status" aria-live="polite">
            <span className={`live ${snap ? (error ? "off" : "on") : ""}`} aria-hidden="true" />
            <span>{error ? "Memory offline" : snap ? (DEMO ? "Demo data" : "Memory connected") : "Connecting"}</span>
          </div>
          <p>{`${Math.round(s.balance)} of ${Math.round(s.start)} credits left`}</p>
          <p className="tag">{DEMO ? "Sample data" : "Synthetic data"}</p>
        </div>
      </aside>
      <main id="main" className="page">
        <header className="page-h"><h1>{cur.name}</h1></header>
        <cur.C d={data} />
      </main>
    </div>
  );
}
