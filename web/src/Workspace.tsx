import { useState, type DragEvent } from "react";
import type { Snapshot } from "./api";
import { findConflicts } from "./derive";
import { CONVOS, type Convo } from "./transcripts";

// The founder's desk: pick a conversation, drop an agent on it. The app never runs the agent itself; it hands the
// exact @mention to Band (clipboard) and watches keep-api for that agent's results. Band stays where the work happens.
const TOOLS = {
  listener: { name: "Listener", does: "Pulls out promises, claims and risks and saves them to memory.",
    ask: (c: Convo) => `@listener Extract the promises, claims and risks from this conversation and save each one with source ${c.source}.` },
  brain: { name: "Brain", does: "Checks what was said against memory and flags contradictions.",
    ask: (_c: Convo) => "@brain Check every claim in this conversation against memory and flag anything that contradicts it." },
  drafter: { name: "Drafter", does: "Drafts the follow-up, citing open promises from memory.",
    ask: (c: Convo) => `@drafter Draft the follow-up to ${c.counterparty} for this conversation. Recall the open promises first and cite them.` },
};
type ToolId = keyof typeof TOOLS;
type Run = { key: number; tool: ToolId; convo: Convo; text: string; copied: boolean | null; mems: Set<string>; drafts: Set<string>; ev: number };

// A run is done when something new shows up in memory after the drop: memories (Listener), a draft (Drafter), memory reads or edits (Brain).
function status(r: Run, s: Snapshot): { done: boolean; label: string } {
  if (r.tool === "listener") { const n = s.mems.filter((m) => !r.mems.has(m.id)).length; if (n) return { done: true, label: `Done: ${n} saved to memory` }; }
  if (r.tool === "drafter" && s.drafts.some((d) => !r.drafts.has(d.id))) return { done: true, label: "Done: draft waiting for your approval" };
  if (r.tool === "brain" && s.events.some((e) => e.id > r.ev && ["recall", "forget", "improve", "block"].includes(e.type))) return { done: true, label: "Done: checked against memory" };
  if (r.copied === false) return { done: false, label: "Copy blocked. Copy the message below and paste it into Band HQ." };
  return { done: false, label: r.copied ? "Copied. Paste it into the Band HQ room." : "Copying..." };
}

export default function Workspace({ s, live }: { s: Snapshot; live: boolean }) {
  const [sel, setSel] = useState(CONVOS[0]?.id ?? "");
  const [runs, setRuns] = useState<Run[]>([]);
  const [over, setOver] = useState(false);
  const c = CONVOS.find((x) => x.id === sel);

  const start = (tool: ToolId) => {
    if (!c) return;
    const key = Date.now();
    const text = `${TOOLS[tool].ask(c)}\n\n${c.raw.trim()}`;
    const run: Run = { key, tool, convo: c, text, copied: null, mems: new Set(s.mems.map((m) => m.id)), drafts: new Set(s.drafts.map((d) => d.id)), ev: Math.max(0, ...s.events.map((e) => e.id)) };
    setRuns((rs) => [run, ...rs]);
    const mark = (ok: boolean) => setRuns((rs) => rs.map((r) => (r.key === key ? { ...r, copied: ok } : r)));
    navigator.clipboard?.writeText(text).then(() => mark(true), () => mark(false)) ?? mark(false);
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const t = e.dataTransfer.getData("text/plain"); if (t in TOOLS) start(t as ToolId); };

  const saved = c ? s.mems.filter((m) => m.source && (m.source === c.source || c.id.startsWith(m.source))) : [];
  const conflicts = findConflicts(s.drafts, s.mems, s.events);
  const pending = s.drafts.filter((d) => d.status === "pending");

  return (
    <div className="ws">
      <nav className="ws-list" aria-label="Conversations">
        <h2>Conversations</h2>
        <ul>
          {CONVOS.map((x) => (
            <li key={x.id}>
              <button className={x.id === sel ? "on" : ""} aria-current={x.id === sel} onClick={() => setSel(x.id)}>
                <b>{x.title}</b><span>{`${x.kind}, ${x.date}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className={`ws-doc ${over ? "over" : ""}`} aria-label="Transcript" onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        {c ? (
          <>
            <header><h2>{c.title}</h2><p>{[c.date, c.people].filter(Boolean).join(". ")}</p></header>
            <ol className="lines">
              {c.lines.map((l, i) => (
                <li key={i} className={l.role === "us" ? "us" : ""}>
                  {l.who && <b>{l.who}<span>{l.role}</span></b>}<p>{l.text}</p>
                </li>
              ))}
            </ol>
            <footer>
              <h3>{`Saved from this conversation: ${saved.length}`}</h3>
              {saved.length ? (
                <ul>{saved.map((m) => <li key={m.id}><span className={`chip ${m.kind}`}>{m.kind}</span> {m.text}</li>)}</ul>
              ) : <p className="empty">Nothing saved yet. Drop the Listener here to pull out the promises.</p>}
            </footer>
            <div className="drop-hint" aria-hidden="true">Drop to send this conversation to the agent</div>
          </>
        ) : <p className="empty">No conversations found in data/seed.</p>}
      </section>

      <aside className="ws-side" aria-label="Agents and runs">
        <h2>Agents</h2>
        <p className="hint">Drag one onto the conversation.</p>
        <ul className="tools-list">
          {(Object.keys(TOOLS) as ToolId[]).map((t) => (
            <li key={t} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t); e.dataTransfer.effectAllowed = "copy"; }}>
              <span className="grip" aria-hidden="true" />
              <div><b>{TOOLS[t].name}</b><p>{TOOLS[t].does}</p></div>
              <button onClick={() => start(t)} disabled={!c} aria-label={`Send ${c?.title ?? "conversation"} to ${TOOLS[t].name}`}>Send</button>
            </li>
          ))}
        </ul>

        <h2>Runs</h2>
        {runs.length === 0 && <p className="empty">No runs yet.</p>}
        <ul className="runs">
          {runs.map((r) => {
            const st = status(r, s);
            return (
              <li key={r.key} className={st.done ? "done" : ""}>
                <b>{`${TOOLS[r.tool].name} on ${r.convo.title}`}</b>
                <p role="status">{st.label}</p>
                {!st.done && (
                  <details open={r.copied === false}>
                    <summary>Message for Band</summary>
                    <textarea readOnly value={r.text} rows={5} onFocus={(e) => e.currentTarget.select()} />
                  </details>
                )}
              </li>
            );
          })}
        </ul>

        <h2>Waiting for approval</h2>
        {!live && <p className="empty">Memory offline. Drafts show up here once keep-api is running.</p>}
        {live && pending.length === 0 && <p className="empty">Nothing waiting. Approve drafts in Band.</p>}
        <ul className="runs">
          {pending.map((d) => {
            const hit = conflicts.find((x) => x.draftId === d.id);
            return (
              <li key={d.id} className={hit ? "warn" : ""}>
                <b>{`To ${d.to_name}: ${d.subject}`}</b>
                {hit ? <p>{`Contradicts memory: ${hit.mem}`}</p> : <p>No contradictions found.</p>}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
