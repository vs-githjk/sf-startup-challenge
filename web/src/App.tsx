import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO, load, type Snapshot } from "./api";
import { findConflicts, graphData, type GNode } from "./derive";
import AsciiField, { type Hud } from "./components/AsciiField";
import MemoryGraph from "./components/MemoryGraph";
import { Conflicts, Drafts, Feed, MemoryRows, Panel, Usage } from "./components/Panels";

const PROBE = (n: Omit<GNode, "x" | "y" | "vx" | "vy">): GNode => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 });

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

function useClock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString([], { hour12: false }));
  useEffect(() => { const i = setInterval(() => setT(new Date().toLocaleTimeString([], { hour12: false })), 1000); return () => clearInterval(i); }, []);
  return t;
}

export default function App() {
  const { snap, error } = useKeep();
  const clock = useClock();
  const hudRef = useRef<{ state: HTMLElement | null; track: HTMLElement | null; top: HTMLElement | null }>({ state: null, track: null, top: null });

  const derived = useMemo(() => {
    if (!snap) return null;
    const conflicts = findConflicts(snap.drafts, snap.mems, snap.events);
    const g = graphData(snap.mems, snap.drafts, conflicts);
    return {
      conflicts, nodes: g.nodes.map(PROBE), links: g.links,
      promises: snap.mems.filter((m) => m.kind === "promise"),
      risks: snap.mems.filter((m) => m.kind === "risk" || m.kind === "claim"),
      finds: snap.mems.filter((m) => m.dataset === "eng_security"),
      pending: snap.drafts.filter((d) => d.status === "pending").length,
    };
  }, [snap]);

  const stars = useMemo(() => (derived?.nodes ?? []).filter((n) => n.type !== "hub"), [derived]);
  const conflictLinks = useMemo(() => (derived?.links ?? []).filter((l) => l.type === "conflict"), [derived]);

  // The readout ticks at about 11 Hz, so it is written to the DOM instead of through React state.
  const onHud = (h: Hud) => {
    const r = hudRef.current;
    if (r.state) { r.state.textContent = h.state; r.state.parentElement!.className = h.state === "locked" ? "state on" : "state"; }
    if (r.track) r.track.textContent = String(h.tracked);
    if (r.top) r.top.textContent = h.top;
  };

  const ok = !error;
  const d = derived;
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
          <span className={`live ${snap ? (ok ? "on" : "off") : ""}`} aria-hidden="true" />
          <span>{error ? `keep-api offline (${error})` : snap ? (DEMO ? "demo" : "keep-api live") : "connecting"}</span>
          <span className="credits">{snap ? `${Math.round(snap.balance)} credits` : error ? "Credits unavailable" : "Credits …"}</span>
        </div>
      </header>
      <div className="prism-line" aria-hidden="true"><span /></div>

      <section className="hero" aria-label="Overview">
        <AsciiField nodes={stars} links={conflictLinks} onHud={onHud} />
        <div className="copy" data-keepout="copy">
          <h1>Promises kept. Stories straight.</h1>
        </div>
        <div className="telemetry" data-keepout aria-hidden="true">
          <span>Workspace <b>Lumen Analytics</b></span>
          <span className="state">Recall <b ref={(e) => { hudRef.current.state = e; }}>idle</b></span>
          <span>Tracked <b ref={(e) => { hudRef.current.track = e; }}>0</b></span>
          <span className="top">Top match <b ref={(e) => { hudRef.current.top = e; }}>none</b></span>
          <span>Promises <b>{d?.promises.length ?? 0}</b></span>
          <span>Conflicts <b>{d?.conflicts.length ?? 0}</b></span>
          <span><i className="rec" /> <b>{clock}</b></span>
        </div>
        <p className="hint-tag" data-keepout aria-hidden="true">Move the cursor to scan. Hold still to recall.</p>
      </section>

      <section className="stats" aria-label="Summary">
        <div className="stat"><b>{d?.promises.length ?? 0}</b><span>open promises</span></div>
        <div className="stat"><b>{d?.risks.length ?? 0}</b><span>risks on record</span></div>
        <div className="stat warn"><b>{d?.conflicts.length ?? 0}</b><span>claims in conflict</span></div>
        <div className="stat"><b>{d?.pending ?? 0}</b><span>awaiting you</span></div>
      </section>

      <main className="layout" id="main">
        <div className="col">
          <Panel id="promises" title="Promise ledger" count={String(d?.promises.length ?? 0)} hint="Every promise made to investors and customers, from Cognee memory.">
            <MemoryRows mems={d?.promises ?? []} empty={snap ? "No promises yet. Paste a conversation into Band and the Listener will log them here." : "Waiting for keep-api. Start it with: KEEP_BACKEND=local uv run python -m keep.api"} />
          </Panel>
          <Panel id="conflict" className="conflict" title="Contradiction check" count={d?.conflicts.length ? `${d.conflicts.length} to review` : "clear"} hint="What a draft says, set against what your other conversations say.">
            <Conflicts items={d?.conflicts ?? []} />
          </Panel>
          <Panel id="risks" title="Risks and claims" count={String(d?.risks.length ?? 0)} hint="Facts that could contradict an outbound message.">
            <MemoryRows mems={d?.risks ?? []} empty="No risks on record." />
          </Panel>
        </div>
        <div className="col">
          <Panel id="drafts" title="Approval queue" count={`${d?.pending ?? 0} pending`} hint="Nothing leaves until you approve in Band. The hash proves what was approved.">
            <Drafts drafts={snap?.drafts ?? []} />
          </Panel>
          <Panel id="usage" title="Agent cost and credits" count={`${snap?.agents.length ?? 0} agents`}>
            {snap ? <Usage agents={snap.agents} balance={snap.balance} start={snap.start} gate={snap.gate} /> : <p className="hint">Waiting for keep-api.</p>}
          </Panel>
          <Panel id="sec" title="Security" count={d?.finds.length ? `${d.finds.length} stored` : "no scan yet"} hint="Snyk findings the Security Reviewer stored. Repeat findings are remembered.">
            <MemoryRows mems={d?.finds ?? []} empty="No findings stored yet. Run the first Snyk scan." />
          </Panel>
        </div>
        <Panel id="graph" className="graph" title="Memory graph" count={d ? `${d.nodes.length} nodes, ${d.links.length} links` : ""} hint="Each hub is a Cognee dataset. Red links join a pending draft to the memory that contradicts it.">
          <MemoryGraph nodes={d?.nodes ?? []} links={d?.links ?? []} />
          <ul className="legend" aria-hidden="true">
            <li><i className="k hub" />dataset</li><li><i className="k promise" />promise</li><li><i className="k risk" />risk</li>
            <li><i className="k claim" />claim</li><li><i className="k finding" />finding</li><li><i className="k draft" />pending draft</li>
          </ul>
        </Panel>
        <Panel id="events" title="Live activity" className="feed" count={String(snap?.events.length ?? 0)}>
          <Feed events={snap?.events ?? []} />
        </Panel>
      </main>
    </>
  );
}
