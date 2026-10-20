import { useState } from "react";
import type { GLink, GNode } from "../derive";

// A readable relationship map, not a physics blob: datasets on the left, the memories they hold in the middle,
// pending drafts on the right. A red line joins a draft to the memory that contradicts it. Fixed layout, no animation loop.
const W = 1000, ROW = 54, TOP = 26, HUB_X = 20, MEM_X = 230, MEM_W = 500, DRAFT_X = 780, DRAFT_W = 200;
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
  const hit = new Set(conflicts.map((l) => l.b.replace(/^m:/, "")));
  const conflictDrafts = new Set(conflicts.map((l) => l.a));

  if (!nodes.length) return <div className="stage"><p className="empty" style={{ padding: 20 }}>Nothing in memory yet. Paste a conversation into Band and this map fills in.</p></div>;

  return (
    <div className="stage">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of datasets, the memories they hold and pending drafts" id="graph">
        <text className="col" x={HUB_X} y={14}>DATASET</text>
        <text className="col" x={MEM_X} y={14}>WHAT MEMORY HOLDS</text>
        {drafts.length > 0 && <text className="col" x={DRAFT_X} y={14}>PENDING DRAFT</text>}
        {rows.map(({ m, y: yy }) => {
          const hy = hubY.get(`ds:${m.ds}`) ?? yy;
          return <path key={`o-${m.id}`} className="edge own" d={`M ${HUB_X + 150} ${hy + 18} C ${HUB_X + 190} ${hy + 18}, ${MEM_X - 40} ${yy + 18}, ${MEM_X} ${yy + 18}`} />;
        })}
        {conflicts.map((l) => {
          const dy = draftY.get(l.a), my = memY.get(l.b);
          if (dy === undefined || my === undefined) return null;
          return <path key={`c-${l.a}-${l.b}`} className="edge conflict" d={`M ${DRAFT_X} ${dy + 22} C ${DRAFT_X - 30} ${dy + 22}, ${MEM_X + MEM_W + 30} ${my + 18}, ${MEM_X + MEM_W} ${my + 18}`} />;
        })}
        {hubs.map((h) => (
          <g key={h.id} transform={`translate(${HUB_X} ${hubY.get(h.id) ?? 0})`}>
            <rect className="hubbox" width="150" height="36" rx="18" />
            <text className="hubtext" x="75" y="22.5">{cut(h.label ?? "", 16)} · {mems.filter((m) => `ds:${m.ds}` === h.id).length}</text>
          </g>
        ))}
        {rows.map(({ m, y: yy }) => (
          <g key={m.id} transform={`translate(${MEM_X} ${yy})`} tabIndex={0} aria-label={m.text} className="memnode"
            onPointerEnter={() => setTip(m.text)} onFocus={() => setTip(m.text)} onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
            <rect className={`membox${hit.has(m.id) ? " hit" : ""}`} width={MEM_W} height="36" rx="12" />
            <circle className={`dot ${m.type}`} cx="18" cy="18" r="5" />
            <text x="34" y="22.5">{cut(m.text, 56)}</text>
            <rect className={`pill ${m.type}`} x={MEM_W - 78} y="8" width="68" height="20" rx="10" /><text className={`pilltext ${m.type}`} x={MEM_W - 44} y="22" textAnchor="middle">{m.type}</text>
          </g>
        ))}
        {drafts.map((d) => (
          <g key={d.id} transform={`translate(${DRAFT_X} ${draftY.get(d.id) ?? 0})`} tabIndex={0} aria-label={d.text}
            onPointerEnter={() => setTip(d.text)} onFocus={() => setTip(d.text)} onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
            <rect className={`draftbox${conflictDrafts.has(d.id) ? " hit" : ""}`} width={DRAFT_W} height="44" rx="12" />
            <text x="14" y="27">{cut(d.text.replace(/^Draft to /, ""), 24)}</text>
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
