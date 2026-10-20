import { useEffect, useRef } from "react";
import { STILL } from "../api";
import type { GLink, GNode } from "../derive";

// ASCII recall field. Every star is a memory placed by a hash of its id. The pointer is a prism probe:
// move it and the field scrambles (no answer yet), hold still and it locks, brackets the nearest memories
// and cites them as [memory: dataset / quote]. Conflicting pairs get a red dotted link.
// Mechanic adapted from our own kalmanspace repo. 30 fps cap, paused off screen, static locked frame when reduced.

const CW = 9, CH = 12, RAMP = [".", ":", "+", "*", "o", "O", "@"], SCRAMBLE = "01+*-=/\\|<>#$%&:.";
const INK = "239,231,214", BRASS = "224,169,59", BAD = "238,109,87", COOL = "143,180,217";
const KIND: Record<string, [string, number]> = { promise: [BRASS, 1], risk: [BAD, 0.95], draft: [INK, 0.9], claim: [COOL, 0.8], finding: ["180,155,214", 0.75], decision: ["134,191,141", 0.7], correction: ["134,191,141", 0.7] };
const SPECTRUM = [BAD, BRASS, "134,191,141", COOL];

export type Hud = { state: "idle" | "scanning" | "locked"; tracked: number; top: string };
type Star = { n: GNode; u: number; v: number; b: number };

const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const snap = (v: number, n: number) => Math.round(v / n) * n;

export default function AsciiField({ nodes, links, onHud }: { nodes: GNode[]; links: GLink[]; onHud: (h: Hud) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ nodes, links, onHud });
  live.current = { nodes, links, onHud };

  useEffect(() => {
    const cv = ref.current!, hero = cv.parentElement!, ctx = cv.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || STILL;
    let W = 0, H = 0, cols = 0, rows = 0, dither: { c: number; r: number; p: number }[] = [], sky: { u: number; v: number; b: number; p: number }[] = [];
    type Rect = { x0: number; y0: number; x1: number; y1: number };
    let keep: Rect[] = [], zone = 120;
    const dyn: Rect[] = []; // label rectangles reserved for the current frame
    let sx = 0.5, sy = 0.45, mx: number | null = null, my: number | null = null, energy = 0, lockT = 0, running = false, last = 0, hudAt = 0, raf = 0;

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `500 ${CH - 1}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
      ctx.textBaseline = "top";
      cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
      const r = rng(7); // fixed seed: the sky is the same every visit
      dither = Array.from({ length: Math.floor(cols * rows * 0.05) }, () => ({ c: Math.floor(r() * cols), r: Math.floor(r() * rows), p: r() }));
      sky = Array.from({ length: Math.floor(cols * rows * 0.03) }, () => ({ u: r(), v: r(), b: r() ** 3, p: r() * 40 }));
      measure();
      frame(performance.now());
    };

    // Glyphs never draw over the headline or the readout: those rectangles are kept clear.
    const measure = () => {
      const h = hero.getBoundingClientRect();
      keep = [...hero.querySelectorAll("[data-keepout]")].map((el) => {
        const r = el.getBoundingClientRect(), pad = 14;
        return { x0: r.left - h.left - pad, y0: r.top - h.top - pad, x1: r.right - h.left + pad, y1: r.bottom - h.top + pad };
      });
      const copy = hero.querySelector("[data-keepout=copy]")?.getBoundingClientRect();
      const top = copy ? copy.top - h.top - 14 : H;
      zone = Math.max(90, top - 20); // memories live above the copy
    };
    const hitRect = (k: Rect, x: number, y: number, w: number) => x + w > k.x0 && x < k.x1 && y + CH > k.y0 && y < k.y1;
    const blocked = (x: number, y: number, w = CW) => keep.some((k) => hitRect(k, x, y, w)) || dyn.some((k) => hitRect(k, x, y, w));
    const put = (ch: string, x: number, y: number) => { if (!blocked(x, y)) ctx.fillText(ch, x, y); };

    const dots = (ax: number, ay: number, bx: number, by: number, ch: string) => {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / CW));
      for (let i = 1; i < n; i++) put(ch, snap(ax + ((bx - ax) * i) / n, CW), snap(ay + ((by - ay) * i) / n, CH));
    };

    const frame = (now: number) => {
      const { nodes: ns, links: ls, onHud: hud } = live.current;
      const mem: Star[] = ns.map((n) => ({ n, u: 0.05 + 0.9 * hash(n.id), v: 0.08 + 0.84 * hash(`${n.id}#`), b: (KIND[n.type] ?? [INK, 0.6])[1] }));
      const dt = Math.min(64, now - last || 16); last = now;

      let tx = mx, ty = my; // idle: tour the memories, contradicting ones first, 5 s each
      if (tx === null || ty === null) {
        const linked = new Set(ls.flatMap((l) => [l.a, l.b]));
        const tour = mem.filter((m) => linked.has(m.n.id)).concat(mem.filter((m) => !linked.has(m.n.id)));
        const m = tour.length ? tour[Math.floor(now / 5000) % tour.length] : null;
        tx = m ? m.u : 0.5 + 0.3 * Math.sin(now * 0.00021); ty = m ? (m.v * zone) / H : (zone / H) * (0.5 + 0.3 * Math.sin(now * 0.00033));
      }
      const dx = (tx - sx) * (reduced ? 1 : 0.07), dy = (ty - sy) * (reduced ? 1 : 0.07);
      sx += dx; sy += dy;
      const rate = Math.hypot(dx * W, dy * H) / Math.max(1, dt);
      energy += (Math.min(1, rate * 9) - energy) * 0.18;
      if (reduced || energy < 0.14) lockT += dt; else lockT = 0;
      const lock = reduced ? 1 : Math.max(0, Math.min(1, (lockT - 260) / 620));

      const bx = snap(sx * W, CW), by = snap(sy * H, CH), fov = Math.min(W, H) * 0.26;
      const px = (u: number, depth: number) => u * W - (sx - 0.5) * depth;
      ctx.clearRect(0, 0, W, H);

      for (const d of dither) {
        const x = d.c * CW, y = d.r * CH, inside = Math.hypot(x - bx, y - by) < fov;
        ctx.fillStyle = `rgba(${INK},${(inside ? 0.14 : 0.05) * (0.5 + 0.5 * Math.sin(now * 0.001 + d.p * 40))})`;
        put(".", x, y);
      }
      for (const s of sky) {
        const x = snap(px(s.u, 40), CW), y = snap(s.v * H - (sy - 0.45) * 24, CH);
        const inside = Math.hypot(x - bx, y - by) < fov, a = (0.28 + s.b * 0.6) * (inside ? 1 : 0.6);
        ctx.fillStyle = `rgba(${INK},${a * (0.85 + 0.15 * Math.sin(now * 0.002 + s.p))})`;
        put(RAMP[Math.min(RAMP.length - 1, Math.floor(Math.sqrt(s.b) * RAMP.length))], x, y);
      }

      const seen = mem.map((m) => {
        const x = snap(px(m.u, 90), CW), y = snap(m.v * zone - (sy - 0.3) * 40, CH);
        return { m, x, y, inside: Math.hypot(x - bx, y - by) < fov };
      });
      const byId = new Map(seen.map((s) => [s.m.n.id, s]));
      const hits = seen.filter((s) => s.inside).sort((a, b) => b.m.b - a.m.b).slice(0, 5);
      const shown = lock > 0 ? Math.ceil(lock * hits.length) : 0;

      // Place the citation labels first and reserve their rectangles, so nothing else draws through them.
      dyn.length = 0;
      const labels: { x: number; y: number; text: string }[] = [];
      if (lock > 0.7) {
        for (let i = 0; i < shown; i++) {
          const h = hits[i], n = h.m.n;
          const text = `[memory: ${n.ds ?? (n.type === "draft" ? "draft" : "company")} / ${n.text.replace(/\s+/g, " ").slice(0, 26)}]`;
          const lx = h.x + CW * 3, ly = h.y - CH;
          const r = { x0: lx - 4, y0: ly - 2, x1: lx + text.length * CW + 4, y1: ly + CH + 2 };
          const clash = keep.concat(dyn).some((k) => r.x1 > k.x0 && r.x0 < k.x1 && r.y1 > k.y0 && r.y0 < k.y1);
          if (!clash && r.x1 < W - 8) { dyn.push(r); labels.push({ x: lx, y: ly, text }); }
        }
      }

      for (const s of seen) {
        ctx.fillStyle = `rgba(${(KIND[s.m.n.type] ?? [INK])[0]},${(0.62 + s.m.b * 0.38) * (s.inside ? 1 : 0.7)})`;
        put(s.inside ? "@" : "O", s.x, s.y);
      }
      ctx.fillStyle = `rgba(${BRASS},${0.28 + 0.4 * lock})`;
      for (let i = 0; i < 84; i++) { const t = (i / 84) * Math.PI * 2; put(".", snap(bx + Math.cos(t) * fov, CW), snap(by + Math.sin(t) * fov, CH)); }

      if (energy > 0.06 && !reduced) {
        ctx.fillStyle = `rgba(${COOL},${0.14 + energy * 0.5})`;
        for (let i = 0, n = Math.floor(energy * 170); i < n; i++) {
          const t = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * fov;
          put(SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0], snap(bx + Math.cos(t) * r, CW), snap(by + Math.sin(t) * r, CH));
        }
      }

      if (lock > 0) {
        for (const l of ls) {
          const a = byId.get(l.a), b = byId.get(l.b);
          if (a && b && (a.inside || b.inside)) { ctx.fillStyle = `rgba(${BAD},${0.15 + lock * 0.55})`; dots(a.x, a.y, b.x, b.y, "!"); }
        }
        for (let i = 0; i < shown; i++) {
          const h = hits[i];
          ctx.fillStyle = `rgba(${(KIND[h.m.n.type] ?? [BRASS])[0]},${0.55 + 0.45 * lock})`;
          put("[", h.x - CW * 1.5, h.y); put("]", h.x + CW * 1.5, h.y);
        }
        ctx.fillStyle = `rgba(${BRASS},${0.55 * lock})`;
        for (const l of labels) ctx.fillText(l.text, l.x, l.y);
      }

      ctx.fillStyle = `rgba(${BRASS},${0.7 + 0.3 * lock})`;
      const A: [number, number] = [bx, by - CH * 3], B: [number, number] = [bx - CW * 3, by + CH * 2], C: [number, number] = [bx + CW * 3, by + CH * 2];
      dots(...A, ...B, "."); dots(...B, ...C, "."); dots(...C, ...A, ".");
      put(lock > 0.9 ? "+" : "o", bx, by - CH);
      if (lock > 0.3) SPECTRUM.forEach((rgb, k) => {
        ctx.fillStyle = `rgba(${rgb},${lock * 0.85})`;
        for (let i = 1; i <= 4; i++) put("-", bx + CW * (3 + i * 2), by + CH * (k - 1.5) * (1 + i * 0.25));
      });

      if (now - hudAt > 90) { // readout goes to the parent without re-rendering the canvas
        hudAt = now;
        const top = hits[0];
        const locked = lock > 0.6 && hits.length > 0;
        hud({ state: !mem.length ? "idle" : locked ? "locked" : "scanning", tracked: lock > 0.4 ? hits.length : 0, top: locked && top ? `${top.m.n.type}: ${top.m.n.text.slice(0, 40)}` : "none" });
      }
    };

    const loop = (now: number) => {
      if (!running) return;
      if (now - last >= 33) frame(now);
      raf = requestAnimationFrame(loop);
    };
    const setRunning = (on: boolean) => { if (reduced || on === running) return; running = on; if (on) raf = requestAnimationFrame(loop); };

    const onMove = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width; my = (e.clientY - b.top) / b.height; };
    const onLeave = () => { mx = my = null; };
    const onVis = () => setRunning(!document.hidden);
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(resize); ro.observe(hero);
    const io = new IntersectionObserver((es) => setRunning(es[0].isIntersecting && !document.hidden)); io.observe(hero);
    resize();
    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      hero.removeEventListener("pointermove", onMove); hero.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
