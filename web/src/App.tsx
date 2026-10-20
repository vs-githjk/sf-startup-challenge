import { useEffect, useMemo, useState } from "react";
import { DEMO, load, type Snapshot } from "./api";
import { findConflicts, graphData } from "./derive";
import PrismWave from "./components/PrismWave";
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

  const links = useMemo(() => connections(s, st), [s, st]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="bar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 29 27H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M16 3v24" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></svg>
          <span className="word">PrismKeep</span>
          <span className="tag">{DEMO ? "demo preview, synthetic data" : "synthetic data"}</span>
        </div>
        <div className="status" role="status" aria-live="polite">
          <span className={`live ${snap ? (error ? "off" : "on") : ""}`} aria-hidden="true" />
          <span>{error ? `keep-api offline (${error})` : snap ? (DEMO ? "demo" : "keep-api live") : "connecting"}</span>
        </div>
      </header>

      <section className="hero" aria-label="Overview">
        <PrismWave />
        <div className="copy" data-keepout="copy">
          <h1>Promises kept. Stories straight.</h1>
          <p className="sub">Agents on Band remember every promise in Cognee, check each message before it goes out, meter their work in Flexprice and have every fix scanned by Snyk.</p>
        </div>
      </section>

      <main id="main">
        <section className="layout" aria-label="What the founder sees">
          <Panel id="connections" className="wide" title="Connections" count={`${links.filter((l) => l.ok).length} of 4 live`} hint="Each tool the demo depends on, and whether it is answering right now.">
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
          <Panel id="events" title="Live activity" className="feed wide" count={String(s.events.length)}>
            <Feed events={s.events} />
          </Panel>
        </section>
      </main>
    </>
  );
}
