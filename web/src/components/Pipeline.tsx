import type { Snapshot } from "../api";
import type { Convo } from "../derive";
import type { Stats } from "./Tools";

// The path one conversation takes, with a live count at every stop. A count of zero means nothing has passed that stop yet.
// Counts come from keep-api only (memories, events, drafts, usage); Band and Prism are shown through what they leave behind.
type Step = { id: string; tool: string; who: string; does: string; n: number; unit: string };

export function steps(s: Snapshot, st: Stats, convos: Convo[], conflicts: number): Step[] {
  const prism = convos.filter((c) => c.origin === "prism").length;
  const sent = s.events.filter((e) => e.type === "send").length;
  return [
    { id: "prism", tool: "Prism", who: "Recall.ai bot", does: "records the call", n: prism, unit: "recordings" },
    { id: "cos", tool: "Band", who: "Chief of Staff", does: "pulls it, hands off by @mention", n: convos.length, unit: "conversations" },
    { id: "listener", tool: "Listener", who: "LangGraph", does: "extracts promises, claims, risks", n: s.mems.filter((m) => m.dataset !== "eng_security").length, unit: "items extracted" },
    { id: "cognee", tool: "Cognee", who: "memory", does: "stores and recalls", n: st.memories, unit: "memories" },
    { id: "brain", tool: "Brain", who: "LangGraph", does: "checks drafts against memory", n: conflicts, unit: "conflicts found" },
    { id: "approve", tool: "Band", who: "founder", does: "approves, hash recorded", n: st.approvals, unit: "approved" },
    { id: "send", tool: "Outbox", who: "keep-api", does: "sends the approved text", n: sent, unit: "sent" },
  ];
}

export function Pipeline({ items, s, st }: { items: Step[]; s: Snapshot; st: Stats }) {
  return (
    <div className="pipe">
      <ol className="steps">
        {items.map((x, i) => (
          <li key={x.id} className={x.n > 0 ? "on" : ""}>
            <span className="num">{i + 1}</span>
            <b>{x.tool}</b>
            <em>{x.who}</em>
            <p>{x.does}</p>
            <strong>{x.n}<small>{x.unit}</small></strong>
          </li>
        ))}
      </ol>
      <div className="rails">
        <div className="rail-row"><span className="tag-s">Flexprice</span><span>meters every agent action: {st.metered} usage events, {Math.round(s.balance)} credits left</span></div>
        <div className="rail-row"><span className="tag-s">Snyk</span><span>scans each fix and stores findings in Cognee: {st.findings} {st.findings === 1 ? "finding" : "findings"} so far</span></div>
      </div>
    </div>
  );
}
