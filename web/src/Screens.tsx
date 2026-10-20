import { useMemo, useState } from "react";
import type { Draft, Memory, Snapshot } from "./api";
import { pretty, type Conflict, type Convo } from "./derive";
import { Pipeline, type steps } from "./components/Pipeline";
import MemoryGraph from "./components/MemoryGraph";
import { Conflicts, Feed, MemoryRows, Panel } from "./components/Panels";
import { Connections, CostPanel, type Link, type Stats } from "./components/Tools";
import type { GLink, GNode } from "./derive";

// One screen per job. The web app never acts for an agent: actions copy the exact @mention for the Band HQ room,
// so the work (and the approval) still happens in Band.
export type Data = {
  s: Snapshot; st: Stats; live: boolean; conflicts: Conflict[]; promises: Memory[]; convos: Convo[];
  links: Link[]; flow: ReturnType<typeof steps>; nodes: GNode[]; glinks: GLink[];
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const copy = () => {
    const done = (ok: boolean) => { setState(ok ? "ok" : "fail"); setTimeout(() => setState("idle"), 2500); };
    navigator.clipboard ? navigator.clipboard.writeText(text).then(() => done(true), () => done(false)) : done(false);
  };
  return (
    <span className="copy">
      <button className="btn" onClick={copy}>{label}</button>
      <span role="status">{state === "ok" ? "Copied. Paste it into Band HQ." : state === "fail" ? "Copy blocked. Message below." : ""}</span>
      {state === "fail" && <textarea readOnly value={text} rows={3} onFocus={(e) => e.currentTarget.select()} />}
    </span>
  );
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const Empty = ({ children }: { children: string }) => <p className="empty">{children}</p>;
const sentences = (body: string) => (body.match(/[^.!?]+[.!?]?/g) ?? []).map((x) => x.trim()).filter(Boolean);

export function NeedsYou({ d }: { d: Data }) {
  const pending = d.s.drafts.filter((x) => x.status === "pending");
  const done = d.s.drafts.filter((x) => x.status !== "pending");
  const [sel, setSel] = useState<string | null>(null);
  const cur: Draft | undefined = pending.find((x) => x.id === sel) ?? pending[0];
  return (
    <div className="split">
      <Panel id="queue" title="Waiting for you" count={`${pending.length}`}>
        {pending.length === 0 && <Empty>Nothing needs you. New drafts land here when the Drafter writes one.</Empty>}
        <ul className="pick">
          {pending.map((x) => {
            const n = d.conflicts.filter((c) => c.draftId === x.id).length;
            return (
              <li key={x.id}><button className={x.id === cur?.id ? "on" : ""} onClick={() => setSel(x.id)}>
                <b>{`To ${x.to_name}`}</b><span>{x.subject}</span>
                <em className={n ? "bad" : "ok"}>{n ? `${n} conflict${n > 1 ? "s" : ""} with memory` : "Agrees with memory"}</em>
              </button></li>
            );
          })}
        </ul>
        {done.length > 0 && <>
          <h3 className="sub-h">Already decided</h3>
          <ul className="pick">{done.map((x) => <li key={x.id}><div className="static"><b>{`To ${x.to_name}`}</b><span>{`${x.subject}, ${x.status}`}</span>{x.approved_sha256 && <code className="hash">{`sha256 ${x.approved_sha256.slice(0, 16)}...`}</code>}</div></li>)}</ul>
        </>}
      </Panel>
      <Panel id="draft" title={cur ? cur.subject : "Draft"} count={cur ? `To ${cur.to_name}` : ""} hint={cur ? "Each sentence, checked against what customers and investors told you." : undefined}>
        {!cur ? <Empty>Pick a draft to review it.</Empty> : <>
          <ol className="claims">
            {sentences(cur.body).map((line, i) => {
              const hit = d.conflicts.find((c) => c.draftId === cur.id && c.said === line);
              return (
                <li key={i} className={hit ? "bad" : ""}>
                  <p>{line}</p>
                  {hit ? <div className="why"><b>{`Contradicts ${pretty(hit.ds)}:`}</b> {hit.mem}</div> : <div className="why ok">No conflict found in memory</div>}
                </li>
              );
            })}
          </ol>
          <div className="actions">
            <CopyButton label="Ask for approval in Band" text={`@chief_of_staff Ask me to approve draft ${cur.id} to ${cur.to_name} ("${cur.subject}") with band ask.`} />
            <p className="note">Approve, Edit or Reject happens in Band. The hash of the approved text is recorded.</p>
          </div>
        </>}
      </Panel>
    </div>
  );
}

export function Contradictions({ d }: { d: Data }) {
  const [sel, setSel] = useState(0);
  const cur = d.conflicts[sel] ?? d.conflicts[0];
  return (
    <div className="split">
      <Panel id="clist" title="Open contradictions" count={`${d.conflicts.length}`}>
        {d.conflicts.length === 0 && <Empty>No contradictions. Every waiting draft agrees with memory.</Empty>}
        <ul className="pick">
          {d.conflicts.map((c, i) => (
            <li key={c.key}><button className={c === cur ? "on" : ""} onClick={() => setSel(i)}>
              <b>{c.to ? `Draft to ${c.to}` : "Blocked draft"}</b><span>{c.said}</span><em className="bad">{`vs ${pretty(c.ds) || "memory"}`}</em>
            </button></li>
          ))}
        </ul>
      </Panel>
      <Panel id="cdetail" className="conflict" title="What the draft said, and what memory says" hint="The memory side comes from your own conversations.">
        {cur ? <Conflicts items={[cur]} /> : <Empty>Nothing to compare.</Empty>}
      </Panel>
    </div>
  );
}

// Owner and due date are read out of the promise sentence; the Listener does not store them as fields yet.
const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
export function promiseFields(text: string, now = new Date()) {
  const owner = text.match(/([A-Z][a-z]+ [A-Z][a-z]+|[Ff]ounder)(?: \([^)]*\))? promised/)?.[1] ?? "";
  const due = text.match(/by (?:[A-Z][a-z]+day )?([A-Z][a-z]{2}) (\d{1,2})\b/);
  const date = due && due[1] in MON ? new Date(now.getFullYear(), MON[due[1]], Number(due[2]), 23, 59) : null;
  return { owner: owner ? owner[0].toUpperCase() + owner.slice(1) : "", due: date ? `${due![1]} ${due![2]}` : (text.match(/by (Friday|Monday|Tuesday|Wednesday|Thursday|today|tomorrow)/i)?.[1] ?? ""), overdue: !!date && date < now };
}

export function Promises({ d }: { d: Data }) {
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const groups = [...new Set(d.promises.map((m) => m.dataset))];
  const rows = d.promises.filter((m) => (who === "all" || m.dataset === who) && m.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel id="ledger" className="wide" title="Every promise, to every customer and investor" count={`${rows.length} of ${d.promises.length}`}>
      <div className="filters">
        <div role="group" aria-label="Filter by relationship" className="chips-row">
          {["all", ...groups].map((g) => <button key={g} aria-pressed={who === g} onClick={() => setWho(g)}>{g === "all" ? "All" : pretty(g)}</button>)}
        </div>
        <input type="search" placeholder="Search promises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search promises" maxLength={100} />
      </div>
      {rows.length === 0 ? <Empty>No promises match. The Listener adds them as conversations come in.</Empty> : (
        <table className="ledger">
          <thead><tr><th>Promise</th><th>To</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((m) => {
              const f = promiseFields(m.text);
              return (
                <tr key={m.id}>
                  <td>{m.text}{m.source && <small>{m.source}</small>}</td>
                  <td>{pretty(m.dataset)}</td><td>{f.owner || "Not stated"}</td><td>{f.due || "No date"}</td>
                  <td><span className={`chip ${f.overdue ? "risk" : "promise"}`}>{f.overdue ? "overdue" : "open"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

const PULL = "@chief_of_staff Pull my latest meeting from Prism and send the transcript to @listener to extract the promises, claims and risks. Use source \"prism: <meeting title>\".";

export function Conversations({ d }: { d: Data }) {
  const [sel, setSel] = useState<string | null>(null);
  const cur = d.convos.find((c) => c.source === sel) ?? d.convos[0];
  const mems = useMemo(() => d.s.mems.filter((m) => (m.source ?? "") === cur?.source), [d.s.mems, cur]);
  const name = cur?.source.replace(/^(prism|pasted):\s*/i, "") ?? "";
  return (
    <div className="split">
      <Panel id="convlist" title="Meetings and tickets" count={`${d.convos.length}`}>
        <div className="actions top"><CopyButton label="Pull latest meeting from Prism" text={PULL} /></div>
        {d.convos.length === 0 && <Empty>No conversations yet. Pull your latest Prism recording, or paste a transcript into Band.</Empty>}
        <ul className="pick">
          {d.convos.map((c) => (
            <li key={c.source}><button className={c === cur ? "on" : ""} onClick={() => setSel(c.source)}>
              <b>{c.source.replace(/^(prism|pasted):\s*/i, "")}</b>
              <span className={`origin ${c.origin}`}>{c.origin === "prism" ? "Prism recording" : "Pasted"}</span>
              <em>{[c.promises && plural(c.promises, "promise"), c.risks && plural(c.risks, "risk"), c.claims && plural(c.claims, "claim")].filter(Boolean).join(", ") || "nothing extracted"}</em>
            </button></li>
          ))}
        </ul>
      </Panel>
      <Panel id="convdetail" title={name || "Conversation"} count={cur ? `${mems.length} extracted` : ""} hint={cur ? "What the Listener pulled out of this conversation." : undefined}>
        {!cur ? <Empty>Pick a conversation.</Empty> : <>
          <MemoryRows mems={mems} empty="Nothing extracted yet." />
          <div className="actions">
            <CopyButton label="Draft the follow-up" text={`@drafter Draft the follow-up for "${name}". Recall the open promises first and cite them.`} />
            <CopyButton label="Check with the Brain" text={`@brain Check what was said in "${name}" against memory and flag anything that contradicts it.`} />
          </div>
        </>}
      </Panel>
    </div>
  );
}

export function MemoryMap({ d }: { d: Data }) {
  return (
    <div className="stack">
      <Panel id="graph" className="graph wide" title="What the agents know" count={`${d.nodes.length} nodes, ${d.glinks.length} links`} hint="Each hub is a customer, investor or team area. A link from a waiting draft marks the memory it contradicts.">
        <MemoryGraph nodes={d.nodes} links={d.glinks} />
      </Panel>
      {/* ponytail: a still capture of the Neo4j graph; a live view needs a keep-api /graph endpoint */}
      <Panel id="neo4j" className="wide" title="Cognee's knowledge graph in Neo4j" count="54 entities, 98 relationships" hint="The graph Cognee builds from every stored fact: customers, investors, people, products and how they connect. Captured from the Neo4j browser.">
        <img className="neo4j-shot" src="/neo4j-graph.png" alt="Neo4j graph of 54 entities joined by 98 relationships, built by Cognee from company memory" />
        <div className="actions"><a className="btn" href="http://localhost:7474" target="_blank" rel="noopener noreferrer">Open the live graph in Neo4j</a></div>
      </Panel>
    </div>
  );
}

export function Agents({ d }: { d: Data }) {
  return (
    <div className="stack">
      <Panel id="flow" className="wide" title="How the data moves" count={`${d.flow.filter((x) => x.n > 0).length} of ${d.flow.length} stops active`} hint="One conversation, left to right.">
        <Pipeline items={d.flow} s={d.s} st={d.st} />
      </Panel>
      <div className="split even">
        <Panel id="cost" title="Cost per agent and credits" count={`${d.s.agents.length} agents`}><CostPanel s={d.s} st={d.st} /></Panel>
        <Panel id="security" title="Security" count={d.st.findings ? `${d.st.findings} stored` : "no scan yet"} hint="Snyk findings the Security Reviewer stored.">
          <MemoryRows mems={d.s.mems.filter((m) => m.dataset === "eng_security")} empty="No findings stored yet." />
        </Panel>
      </div>
      <Panel id="connections" className="wide" title="Connections" count={`${d.links.filter((l) => l.ok).length} of ${d.links.length} live`}><Connections links={d.links} /></Panel>
      <Panel id="events" className="feed wide" title="Handoffs and activity" count={String(d.s.events.length)}><Feed events={d.s.events} /></Panel>
    </div>
  );
}
