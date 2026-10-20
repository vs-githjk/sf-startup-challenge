import { useEffect, useRef } from "react";
import { STILL } from "../api";
import type { GLink, GNode } from "../derive";
import type { Hud } from "./AsciiField";

// Glyph mosaic hero. One letter repeated on a grid is the only pixel, painted tone on tone over a light to dark gradient.
// A memory orb is lit and shaded per cell, its texture turns, it leans against the pointer, and the light follows the pointer.
// The pointer leaves a stepped trail of red letters (the promise beam) that fades. A band of brighter letters sweeps the grid.
// With no pointer, a virtual one wanders so the field keeps moving. Memories are small colored clusters.

const LETTER = "P", CW = 10, CH = 13, REACH = 130, TRAIL_MS = 1500;
const INK = [239, 231, 214], BRASS = [224, 169, 59], RED = [238, 109, 87];
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

      // the orb: lit sphere, turning texture, leaning against the pointer, light toward the pointer
      const R = Math.min(zone * 0.3, W * 0.12), ocx = W * 0.6 - (sx - W / 2) * 0.16, ocy = zone * 0.6 - (sy - zone / 2) * 0.08;
      let lx = (sx - ocx) / (W * 0.5), ly = (sy - ocy) / (zone * 0.5); const ll = Math.hypot(lx, ly, 0.7); lx /= ll; ly /= ll; const lz = 0.7 / ll;
      for (let r = Math.floor((ocy - R) / CH); r <= Math.ceil((ocy + R) / CH); r++) for (let c = Math.floor((ocx - R) / CW); c <= Math.ceil((ocx + R) / CW); c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const x = c * CW, y = r * CH, nx = (x + CW / 2 - ocx) / R, ny = (y + CH / 2 - ocy) / R, r2 = nx * nx + ny * ny;
        if (r2 > 1 || (r2 > 0.86 && h2(c, r) > 0.62) || blocked(x, y)) continue; // ragged rim
        const nz = Math.sqrt(1 - r2), lon = Math.atan2(nx, nz) + t * 0.32, lat = Math.asin(ny);
        const tex = 0.55 * noise(lon * 2.4, lat * 2.8) + 0.45 * noise(lon * 5.1 + 7, lat * 5.7);
        const b = Math.max(0.04, Math.min(1, (0.16 + 0.84 * Math.max(0, nx * lx + ny * ly + nz * lz)) * (0.5 + 0.7 * tex)));
        const k = Math.pow(b, 1.35); let col = mix([9, 9, 11], [112, 108, 100], k); if (b > 0.82) col = mix(col, BRASS, (b - 0.82) * 1.6);
        ctx.fillStyle = rgba(col, 0.96); ctx.fillText(LETTER, x, y);
      }
      // a thin drip of letters falls from the orb
      for (let k = 0; k < 16; k++) {
        const fall = ((t * 34 + k * 26) % 380), y = Math.round((ocy + R * 0.9 + fall) / CH) * CH;
        const x = Math.round((ocx + Math.sin(k * 1.7 + t * 0.6) * 22) / CW) * CW;
        if (y > zone || h2(k, Math.floor(t * 0.7)) > 0.7 || blocked(x, y)) continue;
        ctx.fillStyle = rgba([40, 40, 42], 0.8 * (1 - fall / 380)); ctx.fillText(LETTER, x, y);
      }

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
