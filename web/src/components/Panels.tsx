import { useState, type CSSProperties, type ReactNode } from "react";
import type { Agent, Draft, Ev, Gate, Memory } from "../api";
import { clock, pretty, summarize, type Conflict } from "../derive";

// Rows mount with an entrance animation on first paint and a flash afterwards. All text is rendered as React text.
let booted = false;
setTimeout(() => { booted = true; }, 1800);
// The entrance class is chosen once, at mount, so a later re-render never restarts the animation.
function Row({ cls = "", i, children }: { cls?: string; i?: number; children: ReactNode }) {
  const [anim] = useState(() => (booted ? "fresh" : "enter"));
  return <li className={`${cls} ${anim}`.trim()} style={i === undefined ? undefined : ({ "--i": i } as CSSProperties)}>{children}</li>;
}

export function Panel({ id, title, count, hint, className, children }: { id: string; title: string; count?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`panel ${className ?? ""}`.trim()} aria-labelledby={`h-${id}`}>
      <header><h2 id={`h-${id}`}>{title}</h2>{count !== undefined && <span className="count">{count}</span>}</header>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  );
}

const Rows = ({ empty, children, items }: { empty: string; children: ReactNode; items: number }) =>
  <ol className="rows">{items ? children : <li className="empty">{empty}</li>}</ol>;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const Chip = ({ kind, label }: { kind: string; label?: string }) => <span className={`chip ${kind}`}>{label ?? kind}</span>;

export function MemoryRows({ mems, empty }: { mems: Memory[]; empty: string }) {
  return (
    <Rows items={mems.length} empty={empty}>
      {mems.map((m, i) => (
        <Row key={m.id} i={i}>
          <div className="quote">{m.text}</div>
          <div className="meta"><Chip kind={m.kind} /><span>{pretty(m.dataset)}</span>{m.source && <span>{m.source}</span>}</div>
        </Row>
      ))}
    </Rows>
  );
}

export function Conflicts({ items }: { items: Conflict[] }) {
  return (
    <Rows items={items.length} empty="No conflicts. Every pending claim agrees with memory.">
      {items.map((c) => (
        <Row key={c.key} cls="pair">
          <div className="side said"><small>{c.to ? `Draft to ${c.to} says` : "Draft says"}</small><div className="quote">{c.said}</div></div>
          <div className="side mem">
            <small>{c.ds ? `Memory, ${cap(pretty(c.ds))}` : "Memory"}</small>
            <div className="quote">{c.mem}</div>
            <div className="note">{c.note}</div>
          </div>
        </Row>
      ))}
    </Rows>
  );
}

// The sign shows one contradiction, preferring a real Brain block over the browser's word match.
// Keyed by that conflict so it lights up again only when the conflict changes.
export function LedBoard({ items, promises }: { items: Conflict[]; promises: number }) {
  const c = items.find((x) => !x.draftId) ?? items[0];
  const blocked = c !== undefined && !c.draftId;
  return (
    <section className="sign" aria-labelledby="h-sign">
      <h2 id="h-sign" className="sr">Contradiction check</h2>
      <div className="led" role="status" aria-live="polite" key={c?.key ?? "clear"}>
        {c ? (
          <>
            <p className="l1 red lit">{blocked ? "Blocked by Brain" : "Check before sending"}</p>
            <p className="l2 lit">{c.said}</p>
            <p className="l3 lit">{`Memory says: ${c.mem}`}</p>
          </>
        ) : (
          <>
            <p className="l1 lit">All clear</p>
            <p className="l2 lit">{`${promises} ${promises === 1 ? "promise" : "promises"} on record`}</p>
            <p className="l3 lit">No draft contradicts what customers or investors were told</p>
          </>
        )}
      </div>
      {items.length > 0 && <Conflicts items={items} />}
    </section>
  );
}

export function Drafts({ drafts }: { drafts: Draft[] }) {
  return (
    <Rows items={drafts.length} empty="Nothing waiting for approval.">
      {drafts.map((d, i) => (
        <Row key={d.id} i={i}>
          <div className="meta"><Chip kind={d.status} /><span>{d.to_name}</span></div>
          <div className="subject">{d.subject}</div>
          <p className="body">{d.body}</p>
          {d.approved_sha256 && <code className="hash" title="Hash of the approved text">{`sha256 ${d.approved_sha256}`}</code>}
        </Row>
      ))}
    </Rows>
  );
}

export function Usage({ agents, balance, start, gate }: { agents: Agent[]; balance: number; start: number; gate: Gate }) {
  const max = Math.max(0, ...agents.map((a) => a.tokens_in + a.tokens_out));
  const frac = Math.max(0, Math.min(1, balance / (start || 1)));
  return (
    <>
      <div className="meter" aria-hidden="true"><i style={{ transform: `scaleX(${frac})` }} /></div>
      <p className="hint">{`${Math.round(balance)} of ${Math.round(start)} credits left`}</p>
      <Rows items={agents.length} empty="No agent usage metered yet.">
        {agents.map((a) => {
          const tok = a.tokens_in + a.tokens_out;
          return (
            <Row key={a.agent} cls="bar-row">
              <span className="name">{a.agent}{a.harness ? ` (${a.harness})` : ""}</span>
              <span className="num">{`${tok.toLocaleString()} tok, ${a.tasks} tasks${a.usd != null ? `, $${Number(a.usd).toFixed(2)}` : ""}`}</span>
              <div className="spark"><i style={{ transform: `scaleX(${max ? tok / max : 0})` }} /></div>
            </Row>
          );
        })}
      </Rows>
      <div className="gate">
        <Chip kind={gate.allow ? "allowed" : "denied"} />
        <span>{`Deep investor research costs ${gate.cost ?? "?"} credits`}</span>
        {!gate.allow && <span className="meta">Not enough credits. Top up in Flexprice.</span>}
      </div>
    </>
  );
}

export function Feed({ events }: { events: Ev[] }) {
  const rows = events.slice(-40).reverse();
  return (
    <Rows items={rows.length} empty="Waiting for activity.">
      {rows.map((e) => (
        <Row key={e.id} cls="ev">
          <time>{clock(e.ts)}</time>
          <span className={`t ${e.type}`}>{e.type}</span>
          <span>{`${e.agent ? `${e.agent}: ` : ""}${summarize(e)}`}</span>
        </Row>
      ))}
    </Rows>
  );
}
