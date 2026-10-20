import { useEffect, useMemo, useState } from "react";
import { DEMO, load, type Snapshot } from "./api";
import { conversations, findConflicts, graphData } from "./derive";
import { Pipeline, steps } from "./components/Pipeline";
import MemoryGraph from "./components/MemoryGraph";
import { Conflicts, Drafts, Feed, MemoryRows, Panel } from "./components/Panels";
import { Connections, CostPanel, computeStats, connections } from "./components/Tools";

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
  const [view, setView] = useState<"work" | "overview">("work");
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

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="bar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 29 27H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M16 3v24" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></svg>
          <span className="word">PrismKeep</span>
          <span className="tag">{DEMO ? "Sample data, demo mode" : "Synthetic data"}</span>
        </div>
        <div className="views" role="group" aria-label="View">
          <button aria-pressed={view === "work"} onClick={() => setView("work")}>Workspace</button>
          <button aria-pressed={view === "overview"} onClick={() => setView("overview")}>Overview</button>
        </div>
        <div className="status" role="status" aria-live="polite">
          <span className={`live ${snap ? (error ? "off" : "on") : ""}`} aria-hidden="true" />
          <span>{error ? `Memory offline: ${error}` : snap ? (DEMO ? "Demo" : "Memory connected") : "Connecting"}</span>
        </div>
      </header>

      <section className="hero" aria-label="Overview">
        <div className="copy" data-keepout="copy">
          <p className="eyebrow">Live pipeline</p>
          <h1>Promises kept.<br />Stories straight.</h1>
          <p className="sub">Live view of the pipeline: recorded call in, checked and approved message out.</p>
        </div>
      </section>

      <main id="main">
        <section className="layout" aria-label="What the founder sees">
          <Panel id="flow" className="wide" title="How the data moves" count={`${flow.filter((x) => x.n > 0).length} of ${flow.length} stops active`} hint="One conversation, left to right. Each number is what has passed that stop so far.">
            <Pipeline items={flow} s={s} st={st} />
          </Panel>
          <Panel id="convos" className="wide" title="Recorded and pasted conversations" count={String(convos.length)} hint="Where each memory came from, and what was extracted from it.">
            <ul className="convos">
              {convos.length === 0 && <li className="empty">No conversation yet. In Band, ask the Chief of Staff: pull my latest meeting, or paste a transcript.</li>}
              {convos.map((c) => (
                <li key={c.source}>
                  <span className={`origin ${c.origin}`}>{c.origin === "prism" ? "Prism recording" : "Pasted"}</span>
                  <span className="what">{c.source.replace(/^(prism|pasted):\s*/i, "")}</span>
                  <span className="got">{[c.promises && `${c.promises} promise${c.promises > 1 ? "s" : ""}`, c.risks && `${c.risks} risk${c.risks > 1 ? "s" : ""}`, c.claims && `${c.claims} claim${c.claims > 1 ? "s" : ""}`, c.other && `${c.other} other`].filter(Boolean).join(", ")}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel id="connections" className="wide" title="Connections" count={`${links.filter((l) => l.ok).length} of ${links.length} live`} hint="Each tool the demo uses and whether it is answering.">
            <Connections links={links} />
          </Panel>
          <Panel id="promises" title="Promise ledger" count={String(d.promises.length)} hint="Every promise made to investors and customers, from Cognee memory.">
            <MemoryRows mems={d.promises} empty={snap ? "No promises yet. Paste a conversation into Band and the Listener will log them here." : "Waiting for keep-api. Start it with: KEEP_BACKEND=local python -m keep.api"} />
          </Panel>
          <Panel id="drafts" title="Approval queue" count={`${st.waiting} pending`} hint="Nothing leaves until you approve in Band. The hash proves what was approved.">
            <Drafts drafts={s.drafts} />
          </Panel>
          <Panel id="cost" title="Agent cost and credits" count={`${s.agents.length} agents`}>
            <CostPanel s={s} st={st} />
          </Panel>
          <Panel id="security" title="Security" count={st.findings ? `${st.findings} stored` : "no scan yet"} hint="Snyk findings the Security Reviewer stored. Repeat findings are remembered.">
            <MemoryRows mems={s.mems.filter((m) => m.dataset === "eng_security")} empty="No findings stored yet. The first Snyk scan will appear here." />
          </Panel>
          <Panel id="conflict" className="conflict wide" title="Contradiction check" count={d.conflicts.length ? `${d.conflicts.length} to review` : "clear"} hint="What a draft says, set against what your other conversations say.">
            <Conflicts items={d.conflicts} />
          </Panel>
          <Panel id="graph" className="graph wide" title="Memory graph" count={`${d.nodes.length} nodes, ${d.links.length} links`} hint="Each hub is a Cognee dataset. Links join a pending draft to the memory that contradicts it.">
            <MemoryGraph nodes={d.nodes} links={d.links} />
          </Panel>
          <Panel id="events" title="Handoffs and activity" className="feed wide" count={String(s.events.length)}>
            <Feed events={s.events} />
          </Panel>
        </section>
      </main>
    </>
  );
}
