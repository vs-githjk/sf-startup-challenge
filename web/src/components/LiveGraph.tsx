import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panels";

// Cognee's knowledge graph, read live from Neo4j through keep-api's /graph. Refreshes every 15 s;
// if Neo4j is unreachable it shows the last capture instead.
type N = { id: string; type: string; name: string; x: number; y: number; vx: number; vy: number };
type L = { a: string; b: string; type: string };
const W = 1000, H = 560;
const COLORS: Record<string, string> = { Entity: "#0891B2", EntityType: "#7C3AED", TextDocument: "#D97706", DocumentChunk: "#64748B", TextSummary: "#059669", Timestamp: "#A50F36" };
const color = (t: string) => COLORS[t] ?? "#94A3B8";

export default function LiveGraph() {
  const [data, setData] = useState<{ nodes: N[]; links: L[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<N | null>(null);
  const pos = useRef(new Map<string, N>());
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/graph", { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(String(r.status));
        const g = (await r.json()) as { nodes: Omit<N, "x" | "y" | "vx" | "vy">[]; links: L[] };
        if (!alive) return;
        // keep positions across refreshes so the layout does not jump
        const nodes = g.nodes.map((n, i) => pos.current.get(n.id) ?? { ...n, x: W / 2 + Math.cos(i * 2.4) * (60 + i * 3), y: H / 2 + Math.sin(i * 2.4) * (40 + i * 2), vx: 0, vy: 0 });
        pos.current = new Map(nodes.map((n) => [n.id, n]));
        setData({ nodes, links: g.links }); setFailed(false);
      } catch { if (alive) setFailed(true); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // ponytail: O(n^2) repulsion, fine for the 200-node cap from /graph; use a quadtree past ~1000 nodes
  useEffect(() => {
    if (!data) return;
    const { nodes, links } = data;
    const by = new Map(nodes.map((n) => [n.id, n]));
    let alpha = 1, raf = 0;
    const step = () => {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2), f = (2200 / d2) * alpha;
        a.vx -= (dx / d) * f; a.vy -= (dy / d) * f; b.vx += (dx / d) * f; b.vy += (dy / d) * f;
      }
      for (const l of links) {
        const s = by.get(l.a), t = by.get(l.b); if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 1, k = (d - 60) * 0.03 * alpha;
        s.vx += (dx / d) * k; s.vy += (dy / d) * k; t.vx -= (dx / d) * k; t.vy -= (dy / d) * k;
      }
      for (const n of nodes) {
        n.vx = (n.vx + (W / 2 - n.x) * 0.002 * alpha) * 0.8; n.vy = (n.vy + (H / 2 - n.y) * 0.003 * alpha) * 0.8;
        n.x = Math.max(16, Math.min(W - 16, n.x + n.vx)); n.y = Math.max(16, Math.min(H - 16, n.y + n.vy));
      }
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { for (let i = 0; i < 300; i++) step(); tick((x) => x + 1); return; }
    const loop = () => { step(); tick((x) => x + 1); alpha *= 0.97; if (alpha > 0.02) raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const types = data ? [...new Set(data.nodes.map((n) => n.type))] : [];
  const by = new Map(data?.nodes.map((n) => [n.id, n]) ?? []);
  return (
    <Panel id="neo4j" className="wide" title="Cognee's knowledge graph in Neo4j" count={data ? `${data.nodes.length} nodes, ${data.links.length} relationships, live` : failed ? "last capture" : "loading"} hint="The graph Cognee builds from every stored fact: customers, investors, people, promises and how they connect. Read live from Neo4j.">
      {data && !failed ? (
        <div className="live-graph">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Knowledge graph with ${data.nodes.length} nodes`}>
            {data.links.map((l, i) => { const s = by.get(l.a), t = by.get(l.b); return s && t ? <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className="lg-edge" /> : null; })}
            {data.nodes.map((n) => (
              <g key={n.id} transform={`translate(${n.x} ${n.y})`} tabIndex={0} onPointerEnter={() => setHover(n)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(n)} onBlur={() => setHover(null)}>
                <circle r={n.type === "Entity" ? 8 : 6} fill={color(n.type)} />
                {n.type === "Entity" && <text y={-12}>{n.name.slice(0, 24)}</text>}
              </g>
            ))}
          </svg>
          {hover && <p className="lg-tip">{`${hover.type}: ${hover.name || "(no name)"}`}</p>}
          <ul className="legend">{types.map((t) => <li key={t}><span className="k" style={{ background: color(t) }} />{t}</li>)}</ul>
        </div>
      ) : failed ? (
        <img className="neo4j-shot" src="/neo4j-graph.png" alt="Last capture of the Neo4j graph built by Cognee" />
      ) : <p className="empty">Loading the graph from Neo4j.</p>}
      <div className="actions"><a className="btn" href="http://localhost:7474" target="_blank" rel="noopener noreferrer">Open in the Neo4j browser</a></div>
    </Panel>
  );
}
