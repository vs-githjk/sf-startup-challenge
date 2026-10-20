import { useEffect, useMemo, useRef, useState } from "react";
import type { GLink, GNode } from "../derive";

// Dependency-free force layout. Positions persist across polls; the simulation cools and stops on its own.
const W = 1000, H = 380;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MemoryGraph({ nodes, links }: { nodes: GNode[]; links: GLink[] }) {
  const pos = useRef(new Map<string, GNode>());
  const nodeEls = useRef<(SVGGElement | null)[]>([]);
  const linkEls = useRef<(SVGLineElement | null)[]>([]);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Carry positions over from the previous layout so the graph does not jump on every poll.
  const sim = useMemo(() => {
    const ns = nodes.map((n, i) => {
      const old = pos.current.get(n.id), ang = i * 2.399963;
      const out: GNode = { ...n, x: old?.x ?? W / 2 + Math.cos(ang) * 90 * (1 + (i % 5) / 4), y: old?.y ?? H / 2 + Math.sin(ang) * 70 * (1 + (i % 5) / 4), vx: 0, vy: 0 };
      pos.current.set(n.id, out);
      return out;
    });
    const byId = new Map(ns.map((n) => [n.id, n]));
    const ls = links.flatMap((l) => { const s = byId.get(l.a), t = byId.get(l.b); return s && t ? [{ ...l, s, t }] : []; });
    return { ns, ls };
  }, [nodes, links]);

  useEffect(() => {
    const { ns, ls } = sim;
    const draw = () => {
      ns.forEach((n, i) => nodeEls.current[i]?.setAttribute("transform", `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`));
      ls.forEach((l, i) => { const e = linkEls.current[i]; if (!e) return; e.setAttribute("x1", l.s.x.toFixed(1)); e.setAttribute("y1", l.s.y.toFixed(1)); e.setAttribute("x2", l.t.x.toFixed(1)); e.setAttribute("y2", l.t.y.toFixed(1)); });
    };
    const step = (alpha: number) => {
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        let dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2);
        const f = ((a.type === "hub" || b.type === "hub" ? 18000 : 6500) / d2) * alpha;
        dx = (dx / d) * f; dy = (dy / d) * f;
        a.vx -= dx; a.vy -= dy; b.vx += dx; b.vy += dy;
      }
      for (const l of ls) {
        const rest = l.type === "conflict" ? 230 : 95;
        const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.hypot(dx, dy) || 1, k = (d - rest) * 0.04 * alpha;
        l.s.vx += (dx / d) * k; l.s.vy += (dy / d) * k; l.t.vx -= (dx / d) * k; l.t.vy -= (dy / d) * k;
      }
      for (const n of ns) {
        n.vx += (W / 2 - n.x) * 0.0012 * alpha; n.vy += (H / 2 - n.y) * 0.002 * alpha;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x = Math.max(30, Math.min(W - 30, n.x + n.vx)); n.y = Math.max(24, Math.min(H - 34, n.y + n.vy));
      }
    };
    if (reduced()) { for (let i = 0; i < 300; i++) step(1 - i / 300); draw(); return; }
    let alpha = 1, raf = 0;
    const loop = () => {
      step(alpha); draw(); alpha *= 0.975;
      if (alpha > 0.02 && !document.hidden) raf = requestAnimationFrame(loop); // cools and stops
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  return (
    <div className="stage">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Knowledge graph of memories, datasets and drafts" id="graph">
        {sim.ls.map((l, i) => <line key={`${l.a}>${l.b}`} ref={(e) => { linkEls.current[i] = e; }} className={`edge ${l.type}`} />)}
        {sim.ns.map((n, i) => (
          <g key={n.id} ref={(e) => { nodeEls.current[i] = e; }} tabIndex={0} aria-label={n.text}
            onPointerEnter={() => setTip({ text: n.text, x: n.x / W, y: n.y / H })} onFocus={() => setTip({ text: n.text, x: n.x / W, y: n.y / H })}
            onPointerLeave={() => setTip(null)} onBlur={() => setTip(null)}>
            <circle r={n.r} className={`dot ${n.type}`} style={{ animationDelay: `${Math.min(i, 30) * 30}ms` }} />
            {n.label && <text y={n.r + 15}>{n.label}</text>}
          </g>
        ))}
      </svg>
      {tip && <div className="tip" style={{ left: `${tip.x * 100}%`, top: `${tip.y * 100}%` }}>{tip.text}</div>}
    </div>
  );
}
