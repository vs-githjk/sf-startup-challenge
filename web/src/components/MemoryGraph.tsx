import { useState } from "react";
import type { GLink, GNode } from "../derive";

// A readable relationship map, not a physics blob: datasets on the left, the memories they hold in the middle,
// pending drafts on the right. A red line joins a draft to the memory that contradicts it. Fixed layout, no animation loop.
const W = 1000, ROW = 46, TOP = 26, HUB_X = 20, MEM_X = 250, MEM_W = 470, DRAFT_X = 790, DRAFT_W = 190;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function MemoryGraph({ nodes, links }: { nodes: GNode[]; links: GLink[] }) {
  const [tip, setTip] = useState<string | null>(null);
  const hubs = nodes.filter((n) => n.type === "hub");
  const mems = nodes.filter((n) => n.type !== "hub" && n.type !== "draft");
  const drafts = nodes.filter((n) => n.type === "draft");

  // Rows: memories grouped under their dataset, in hub order.
  const rows: { m: GNode; y: number }[] = [];
  const hubY = new Map<string, number>();
  let y = TOP;
  for (const h of hubs) {
    const group = mems.filter((m) => m.ds && `ds:${m.ds}` === h.id);
    const start = y;
    for (const m of group) { rows.push({ m, y }); y += ROW; }
    hubY.set(h.id, group.length ? start + ((group.length - 1) * ROW) / 2 : start);
    if (!group.length) y += ROW;
    y += 10; // gap between datasets
  }
  const memY = new Map(rows.map((r) => [r.m.id, r.y]));
  const draftY = new Map(drafts.map((d, i) => [d.id, TOP + i * ROW * 1.6]));
  const H = Math.max(y + 10, TOP + drafts.length * ROW * 1.6 + 20, 120);
  const conflicts = links.filter((l) => l.type === "conflict");

  if (!nodes.length) return <div className="stage"><p className="empty" style={{ padding: 20 }}>Nothing in memory yet. Paste a conversation into Band and this map fills in.</p></div>;

  return (
    <div className="stage">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of datasets, the memories they hold and pending drafts" id="graph">
        <text className="col" x={HUB_X} y={14}>DATASET</text>
        <text className="col" x={MEM_X} y={14}>WHAT MEMORY HOLDS</text>
        {drafts.length > 0 && <text className="col" x={DRAFT_X} y={14}>PENDING DRAFT</text>}
        {rows.map(({ m, y: yy }) => {
          const hy = hubY.get(`ds:${m.ds}`) ?? yy;
          return <path key={`o-${m.id}`} className="edge own" d={`M ${HUB_X + 150} ${hy + 14} C ${HUB_X + 200} ${hy + 14}, ${MEM_X - 50} ${yy + 14}, ${MEM_X} ${yy + 14}`} />;
        })}
        {conflicts.map((l) => {
          const dy = draftY.get(l.a), my = memY.get(l.b);
          if (dy === undefined || my === undefined) return null;
          return <path key={`c-${l.a}-${l.b}`} className="edge conflict" d={`M ${DRAFT_X} ${dy + 18} C ${DRAFT_X - 40} ${dy + 18}, ${MEM_X + MEM_W + 40} ${my + 14}, ${MEM_X + MEM_W} ${my + 14}`} />;
        })}
        {hubs.map((h) => (
          <g key={h.id} transform={`translate(${HUB_X} ${hubY.get(h.id) ?? 0})`}>
            <rect className="hubbox" width="150" height="28" rx="14" />
            <text className="hubtext" x="75" y="18">{cut(h.label ?? "", 18)}</text>
          </g>
        ))}
        {rows.map(({ m, y: yy }) => (
          <g key={m.id} transform={`translate(${MEM_X} ${yy})`} tabIndex={0} aria-label={m.text} className="memnode"
            onPointerEnter={() => setTip(m.text)} onFocus={() => setTip(m.text)} onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
            <rect className="membox" width={MEM_W} height="28" rx="8" />
            <circle className={`dot ${m.type}`} cx="14" cy="14" r="5" />
            <text x="28" y="18.5">{cut(m.text, 62)}</text>
            <text className="kind" x={MEM_W - 10} y="18.5" textAnchor="end">{m.type}</text>
          </g>
        ))}
        {drafts.map((d) => (
          <g key={d.id} transform={`translate(${DRAFT_X} ${draftY.get(d.id) ?? 0})`} tabIndex={0} aria-label={d.text}
            onPointerEnter={() => setTip(d.text)} onFocus={() => setTip(d.text)} onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
            <rect className="draftbox" width={DRAFT_W} height="36" rx="8" />
            <text x="12" y="22.5">{cut(d.text.replace(/^Draft to /, ""), 26)}</text>
          </g>
        ))}
      </svg>
      <ul className="legend" aria-hidden="true">
        <li><i className="k promise" />promise</li><li><i className="k risk" />risk</li><li><i className="k claim" />claim</li>
        <li><i className="k finding" />security finding</li><li><i className="k line" />red line: draft contradicts memory</li>
      </ul>
      {tip && <div className="readout">{tip}</div>}
    </div>
  );
}
