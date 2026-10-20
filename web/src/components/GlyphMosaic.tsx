import { useEffect, useRef } from "react";
import { STILL } from "../api";
import type { GLink, GNode } from "../derive";
import type { Hud } from "./AsciiField";

// Glyph mosaic hero. One letter repeated on a grid is the only pixel, painted tone on tone over a light to dark gradient.
// A glass prism takes a red beam of promises and splits it into a spectrum. It leans against the pointer, a glint follows the pointer,
// and the spectrum fans with the pointer's height.
// The pointer leaves a stepped trail of red letters (the promise beam) that fades. A band of brighter letters sweeps the grid.
// With no pointer, a virtual one wanders so the field keeps moving. Memories are small colored clusters.

const LETTER = "P", CW = 10, CH = 13, REACH = 130, TRAIL_MS = 1500;
const INK = [239, 231, 214], BRASS = [224, 169, 59], RED = [238, 109, 87];
const BANDS = [RED, BRASS, [134, 191, 141], [143, 180, 217], [180, 155, 214]];
const KIND: Record<string, number[]> = { promise: BRASS, risk: RED, draft: [250, 247, 240], claim: [143, 180, 217], finding: [180, 155, 214], decision: [134, 191, 141], correction: [134, 191, 141] };
// Must match the .hero background gradient in styles.css.
const STOPS: [number, number[]][] = [[0, [232, 227, 214]], [0.22, [189, 184, 171]], [0.45, [110, 106, 96]], [0.72, [26, 24, 21]], [0.92, [13, 12, 10]], [1, [13, 12, 10]]];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const h2 = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const noise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
};
const bgAt = (t: number) => {
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) return mix(STOPS[i - 1][1], STOPS[i][1], (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0] || 1));
  return STOPS[STOPS.length - 1][1];
};

export default function GlyphMosaic({ nodes, onHud }: { nodes: GNode[]; links: GLink[]; onHud: (h: Hud) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ nodes, onHud });
  live.current = { nodes, onHud };

  useEffect(() => {
    const cv = ref.current!, hero = cv.parentElement!, ctx = cv.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || STILL;
    const bg = document.createElement("canvas");
    let W = 0, H = 0, cols = 0, rows = 0, zone = 300, dpr = 1;
    let keep: { x0: number; y0: number; x1: number; y1: number }[] = [];
    let heat = new Float32Array(0), trail: { c: number; r: number; t: number }[] = [];
    let mx = -1e4, my = -1e4, sx = 0, sy = 0, lastCell: [number, number] | null = null;
    let running = false, last = 0, hudAt = 0, raf = 0, dwell = 0;
    const font = () => `600 ${CH - 2}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    const blocked = (x: number, y: number) => keep.some((k) => x + CW > k.x0 && x < k.x1 && y + CH > k.y0 && y < k.y1);

    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight; cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      heat = new Float32Array(cols * rows); trail = []; lastCell = null;
      const hr = hero.getBoundingClientRect();
      keep = [...hero.querySelectorAll("[data-keepout]")].map((el) => { const r = el.getBoundingClientRect(); return { x0: r.left - hr.left - 14, y0: r.top - hr.top - 14, x1: r.right - hr.left + 14, y1: r.bottom - hr.top + 14 }; });
      const copy = hero.querySelector("[data-keepout=copy]")?.getBoundingClientRect();
      zone = Math.max(220, (copy ? copy.top - hr.top : H) - 20);
      if (!sx) { sx = W * 0.5; sy = zone * 0.5; }
      // The faint grid is drawn once, tone on tone: a little lighter than the ground on dark rows, a little darker on light rows.
      bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0); b.font = font(); b.textBaseline = "top";
      for (let r = 0; r < rows; r++) {
        const t = (r * CH) / H, base = bgAt(t);
        b.fillStyle = rgba(mix(base, t < 0.5 ? [40, 38, 34] : [150, 145, 134], 0.2), 0.9);
        for (let c = 0; c < cols; c++) if (!blocked(c * CW, r * CH)) b.fillText(LETTER, c * CW, r * CH);
      }
      frame(performance.now());
    };

    const stepTrail = (cx: number, cy: number, now: number) => {
      const c = Math.floor(cx / CW), r = Math.floor(cy / CH);
      if (c < 0 || r < 0 || c >= cols || r >= rows) { lastCell = null; return; }
      if (lastCell) { // fill the gap between frames so the trail is one stepped line
        let [x0, y0] = lastCell; const dx = Math.abs(c - x0), dy = -Math.abs(r - y0), sxn = x0 < c ? 1 : -1, syn = y0 < r ? 1 : -1;
        let err = dx + dy;
        for (let i = 0; i < 80; i++) {
          trail.push({ c: x0, r: y0, t: now });
          if (x0 === c && y0 === r) break;
          const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sxn; } if (e2 <= dx) { err += dx; y0 += syn; }
        }
      } else trail.push({ c, r, t: now });
      lastCell = [c, r];
      if (trail.length > 600) trail.splice(0, trail.length - 600);
    };

    const frame = (now: number) => {
      const { nodes: ns, onHud: hud } = live.current;
      const t = reduced ? 2.3 : now / 1000;
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(bg, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = font(); ctx.textBaseline = "top";

      // virtual pointer: the real one if present, otherwise a slow wander so the scene never sits still
      const idle = mx < -1000;
      const px = idle ? W * (0.5 + 0.3 * Math.sin(t * 0.55)) : mx, py = idle ? zone * (0.5 + 0.28 * Math.sin(t * 0.41 + 1)) : my;
      sx += (px - sx) * (reduced ? 1 : 0.12); sy += (py - sy) * (reduced ? 1 : 0.12);
      if (!reduced) stepTrail(sx, sy, now);

      // ambient sweep: a diagonal band of slightly stronger letters crosses the grid
      if (!reduced) {
        const pos = ((t * 90) % (W + H)) - H * 0.5;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const d = Math.abs(c * CW + r * CH * 0.8 - pos);
          if (d > 46) continue;
          const x = c * CW, y = r * CH;
          if (blocked(x, y)) continue;
          const base = bgAt(y / H), a = (1 - d / 46) * 0.55;
          ctx.fillStyle = rgba(mix(base, y / H < 0.5 ? [30, 28, 26] : [190, 184, 170], 0.55), a); ctx.fillText(LETTER, x, y);
        }
      }

      // the prism: a glass triangle takes the red beam of promises on its left face and splits it into a spectrum
      const S = Math.min(zone * 0.43, W * 0.17), pcx = W * 0.58 - (sx - W / 2) * 0.1, pcy = zone * 0.55 - (sy - zone / 2) * 0.06;
      const A = [pcx, pcy - S], B = [pcx - S * 0.92, pcy + S * 0.66], C = [pcx + S * 0.92, pcy + S * 0.66];
      const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      const glintX = lerp(B[0], C[0], idle ? 0.5 + 0.5 * Math.sin(t * 0.7) : Math.max(0, Math.min(1, (sx - B[0]) / (C[0] - B[0]))));
      for (let r = Math.floor((A[1] - 6) / CH); r <= Math.ceil((B[1] + 6) / CH); r++) for (let c = Math.floor((B[0] - 6) / CW); c <= Math.ceil((C[0] + 6) / CW); c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const x = c * CW, y = r * CH, qx = x + CW / 2, qy = y + CH / 2;
        const l1 = ((B[1] - C[1]) * (qx - C[0]) + (C[0] - B[0]) * (qy - C[1])) / den, l2 = ((C[1] - A[1]) * (qx - C[0]) + (A[0] - C[0]) * (qy - C[1])) / den, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0 || blocked(x, y)) continue;
        const edge = Math.min(l1, l2, l3), rim = 1 - Math.min(1, edge / 0.09);               // bright edges, like cut glass
        const face = 0.35 + 0.4 * (l3 > l2 ? 1 : 0), glint = Math.exp(-(((qx - glintX) / (S * 0.28)) ** 2));
        const k = Math.min(1, 0.18 + face * 0.35 + rim * 0.55 + glint * 0.5 + 0.12 * noise(qx * 0.05 + t * 0.4, qy * 0.05));
        let col = mix([6, 6, 8], [74, 70, 64], Math.min(1, k * 0.8)); col = mix(col, [226, 221, 206], rim * 0.85); if (glint > 0.45) col = mix(col, BRASS, Math.min(0.8, glint * 0.7));
        ctx.fillStyle = rgba(col, 0.97); ctx.fillText(LETTER, x, y);
      }
      const at = (p: number[], q: number[], u: number) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
      const E1 = at(A, B, 0.5), E2 = at(A, C, 0.5);
      const ray = (x0: number, y0: number, x1: number, y1: number, color: (u: number, i: number) => [number[], number]) => {
        let c0 = Math.floor(x0 / CW), r0 = Math.floor(y0 / CH); const c1 = Math.floor(x1 / CW), r1 = Math.floor(y1 / CH);
        const dx = Math.abs(c1 - c0), dy = -Math.abs(r1 - r0), sxn = c0 < c1 ? 1 : -1, syn = r0 < r1 ? 1 : -1, total = Math.max(1, dx + Math.abs(dy));
        let err = dx + dy;
        for (let i = 0; i < 400; i++) {
          if (c0 >= 0 && r0 >= 0 && c0 < cols && r0 < rows && !blocked(c0 * CW, r0 * CH)) { const [col, a] = color(i / total, i); ctx.fillStyle = rgba(col, a); ctx.fillText(LETTER, c0 * CW, r0 * CH); }
          if (c0 === c1 && r0 === r1) break;
          const e2 = 2 * err; if (e2 >= dy) { err += dy; c0 += sxn; } if (e2 <= dx) { err += dx; r0 += syn; }
        }
      };
      // incoming beam (aim shifts with the pointer) and its path through the glass
      ray(0, E1[1] - zone * 0.16 + (sy - zone / 2) * 0.12, E1[0], E1[1], (u, i) => [RED, 0.5 + 0.5 * Math.sin(i * 0.45 - t * 4.2)]);
      ray(E1[0], E1[1], E2[0], E2[1], (u, i) => [mix(RED, BRASS, u), 0.6 + 0.4 * Math.sin(i * 0.5 - t * 4.2)]);
      // the spectrum: five rays, fanned by the pointer's height
      const theta = 0.12 + ((sy - pcy) / zone) * 0.22;
      BANDS.forEach((col, k) => {
        const ang = theta + (k - 2) * 0.085, len = W - E2[0] + 20;
        ray(E2[0], E2[1], E2[0] + Math.cos(ang) * len, E2[1] + Math.sin(ang) * len, (u, i) => [col, (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(i * 0.4 - t * 3 + k))) * (1 - u * 0.35)]);
      });

      // memories: small colored clusters, brighter when the pointer is near
      const stars = ns.filter((n) => n.type !== "hub").map((n) => ({ n, x: Math.floor((0.04 + 0.92 * hash(n.id)) * cols) * CW, y: Math.floor((0.1 + 0.8 * hash(`${n.id}#`)) * (zone / CH)) * CH }));
      for (const s of stars) {
        const near = Math.hypot(s.x - sx, s.y - sy) < REACH, col = KIND[s.n.type] ?? INK;
        ctx.fillStyle = rgba(col, near ? 1 : 0.8);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (!blocked(s.x + dx * CW, s.y + dy * CH)) ctx.fillText(LETTER, s.x + dx * CW, s.y + dy * CH);
      }

      // red trail of promise letters, stepped, fading
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i], age = (now - p.t) / TRAIL_MS;
        if (age >= 1 && !reduced) { trail.splice(i, 1); continue; }
        const x = p.c * CW, y = p.r * CH;
        if (blocked(x, y)) continue;
        ctx.fillStyle = rgba(RED, (1 - age) * (0.65 + 0.35 * h2(p.c + Math.floor(now / 90), p.r))); ctx.fillText(LETTER, x, y);
      }

      // pointer glow: letters near the real pointer push away and light up, then cool down
      if (!idle && !reduced) for (let r = Math.max(0, Math.floor((my - REACH) / CH)); r < Math.min(rows, Math.ceil((my + REACH) / CH)); r++) for (let c = Math.max(0, Math.floor((mx - REACH) / CW)); c < Math.min(cols, Math.ceil((mx + REACH) / CW)); c++) {
        const x = c * CW, y = r * CH, d = Math.hypot(x + CW / 2 - mx, y + CH / 2 - my), f = d < REACH ? 1 - d / REACH : 0, i = r * cols + c;
        if (f > heat[i]) heat[i] = f;
      }
      if (!reduced) for (let i = 0; i < heat.length; i++) {
        const h = heat[i]; if (h < 0.04) { heat[i] = 0; continue; }
        heat[i] = h * 0.94;
        const c = i % cols, r = (i / cols) | 0, x = c * CW, y = r * CH;
        if (blocked(x, y)) continue;
        const dx = x + CW / 2 - mx, dy = y + CH / 2 - my, d = Math.hypot(dx, dy) || 1, push = h * h * 10;
        ctx.fillStyle = rgba(y / H < 0.5 ? [120, 78, 10] : BRASS, h * 0.95); ctx.fillText(LETTER, x + (dx / d) * push, y + (dy / d) * push);
      }

      if (now - hudAt > 90) {
        hudAt = now;
        const hit = stars.map((s) => ({ s, d: Math.hypot(s.x - sx, s.y - sy) })).filter((q) => q.d < REACH).sort((a, b) => a.d - b.d);
        dwell = hit.length ? Math.min(dwell + 90, 1000) : 0;
        const locked = dwell >= 300 && hit.length > 0;
        hud({ state: !stars.length ? "idle" : locked ? "locked" : "scanning", tracked: hit.length, top: locked ? `${hit[0].s.n.type}: ${hit[0].s.n.text.slice(0, 40)}` : "none" });
      }
    };

    const loop = (now: number) => { if (!running) return; if (now - last >= 33) frame(now); raf = requestAnimationFrame(loop); };
    const setRunning = (on: boolean) => { if (reduced || on === running) return; running = on; if (on) raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; };
    const onLeave = () => { mx = my = -1e4; lastCell = null; };
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
