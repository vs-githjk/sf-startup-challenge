import { useEffect, useMemo, useState } from "react";
import { DEMO, load, type Snapshot } from "./api";
import { findConflicts, graphData } from "./derive";
import MemoryGraph from "./components/MemoryGraph";
import { Drafts, Feed, LedBoard, MemoryRows, Panel, Usage } from "./components/Panels";
import { BandCard, CogneeCard, FlexpriceCard, SnykCard, computeStats } from "./components/Tools";

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

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="bar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 29 27H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M16 3v24" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></svg>
          <span className="word">PrismKeep</span>
          <span className="tag">{DEMO ? "Sample data, demo mode" : "Synthetic data"}</span>
        </div>
        <div className="status" role="status" aria-live="polite">
          <span className={`live ${snap ? (error ? "off" : "on") : ""}`} aria-hidden="true" />
          <span>{error ? `Memory offline: ${error}` : snap ? (DEMO ? "Demo" : "Memory connected") : "Connecting"}</span>
        </div>
      </header>

      <main id="main">
        <LedBoard items={d.conflicts} promises={d.promises.length} />

        <section className="layout" aria-label="What the founder sees">
          <Panel id="drafts" className="queue" title="Approval queue" count={`${st.waiting} waiting`} hint="Nothing leaves until you approve in Band. The hash proves what was approved.">
            <Drafts drafts={s.drafts} />
          </Panel>
          <Panel id="promises" title="Promises" count={String(d.promises.length)} hint="Every promise made to investors and customers, from memory.">
            <MemoryRows mems={d.promises} empty={snap ? "No promises yet. Paste a conversation into Band and the Listener will log them here." : "Waiting for keep-api. Start it with: KEEP_BACKEND=local python -m keep.api"} />
          </Panel>
          <Panel id="graph" className="wide" title="Memory graph" count={`${d.nodes.length} facts and hubs`} hint="Each hub groups the memories about one customer, investor or team area. A dashed red line joins a waiting draft to the memory it contradicts.">
            <MemoryGraph nodes={d.nodes} links={d.links} />
          </Panel>
          <Panel id="cost" title="Cost per agent" count={`${Math.round(s.balance)} credits left`}>
            <Usage agents={s.agents} balance={s.balance} start={s.start} gate={s.gate} />
          </Panel>
          <Panel id="events" title="Activity" count={String(s.events.length)}>
            <Feed events={s.events.slice(-12)} />
          </Panel>
        </section>

        <section className="tools" aria-label="The four integrations">
          <BandCard s={s} st={st} />
          <CogneeCard s={s} st={st} />
          <FlexpriceCard s={s} st={st} />
          <SnykCard s={s} st={st} />
        </section>
      </main>
    </>
  );
}
