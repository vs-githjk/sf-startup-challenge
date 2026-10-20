import { useEffect, useRef } from "react";
import { STILL } from "../api";
import type { GLink, GNode } from "../derive";
import type { Hud } from "./AsciiField";

// Glyph mosaic. One letter, repeated on a grid, is the only pixel: shapes are drawn into a small offscreen
// canvas (one pixel per cell), read back with getImageData, and each cell paints the letter in that pixel's
// color and strength. The shapes are a prism, a stepped beam of promises and the spectrum it splits into,
// plus a block for every memory. The pointer pushes letters aside and lights them up, and the glow fades behind it.
// This is not ASCII art: there is no brightness ramp of different characters, only one glyph.

const LETTER = "P", CW = 10, CH = 13, REACH = 120;
const INK = [239, 231, 214], BRASS = [224, 169, 59], BAD = [238, 109, 87];
const KIND: Record<string, number[]> = { promise: BRASS, risk: BAD, draft: INK, claim: [143, 180, 217], finding: [180, 155, 214], decision: [134, 191, 141], correction: [134, 191, 141] };
const BANDS = [BAD, BRASS, [134, 191, 141], [143, 180, 217]];

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

export default function GlyphMosaic({ nodes, links, onHud }: { nodes: GNode[]; links: GLink[]; onHud: (h: Hud) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ nodes, links, onHud });
  live.current = { nodes, links, onHud };

  useEffect(() => {
    const cv = ref.current!, hero = cv.parentElement!, ctx = cv.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || STILL;
    const bg = document.createElement("canvas"), src = document.createElement("canvas");
    let W = 0, H = 0, cols = 0, rows = 0, heat = new Float32Array(0), px: Uint8ClampedArray = new Uint8ClampedArray(0);
    let keep: { x0: number; y0: number; x1: number; y1: number }[] = [], stars: { x: number; y: number; n: GNode }[] = [], sig = "";
    let mx = -1e4, my = -1e4, running = false, last = 0, hudAt = 0, raf = 0, near = 0;
    const font = () => `600 ${CH - 2}px "JetBrains Mono", ui-monospace, Consolas, monospace`;

    const blocked = (x: number, y: number) => keep.some((k) => x + CW > k.x0 && x < k.x1 && y + CH > k.y0 && y < k.y1);

    // Paint the source image: one pixel per grid cell.
    const paintSource = () => {
      src.width = cols; src.height = rows;
      const s = src.getContext("2d", { willReadFrequently: true })!;
      s.clearRect(0, 0, cols, rows);
      const zoneRows = Math.max(6, Math.floor(zone() / CH));
      // prism: a filled triangle shaded from shadow to light, with grain
      const ax = cols * 0.7, ay = rows * 0.06, bx = cols * 0.56, by = zoneRows * 0.95, cx = cols * 0.84, cy = zoneRows * 0.95;
      const g = s.createLinearGradient(bx, 0, cx, 0);
      g.addColorStop(0, "rgba(120,114,100,.55)"); g.addColorStop(0.55, "rgba(222,214,196,.95)"); g.addColorStop(1, "rgba(90,86,76,.5)");
      s.fillStyle = g; s.beginPath(); s.moveTo(ax, ay); s.lineTo(bx, by); s.lineTo(cx, cy); s.closePath(); s.fill();
      // stepped beam of promises entering from the left, one cell wide so it climbs in stairs
      s.fillStyle = rgba(BAD, 0.95);
      const x1 = cols * 0.64, y1 = zoneRows * 0.5;
      for (let x = 0; x <= x1; x++) s.fillRect(x, Math.round((y1 * x) / x1) , 1, 1);
      // the spectrum it splits into
      const ox = cols * 0.76, oy = zoneRows * 0.5;
      BANDS.forEach((c, k) => {
        s.fillStyle = rgba(c, 0.9);
        const ey = zoneRows * (0.12 + k * 0.26);
        for (let x = ox; x < cols; x++) s.fillRect(Math.round(x), Math.round(oy + ((ey - oy) * (x - ox)) / (cols - ox)), 1, 1);
      });
      // a block for every memory, placed by a hash of its id and colored by kind
      stars = live.current.nodes.filter((n) => n.type !== "hub").map((n) => ({ n, x: Math.floor((0.04 + 0.92 * hash(n.id)) * cols), y: Math.floor((0.08 + 0.84 * hash(`${n.id}#`)) * zoneRows) }));
      for (const st of stars) { s.fillStyle = rgba(KIND[st.n.type] ?? INK, 0.98); s.fillRect(st.x, st.y, 2, 2); }
      px = s.getImageData(0, 0, cols, rows).data;
    };

    const zone = () => {
      const copy = hero.querySelector("[data-keepout=copy]")?.getBoundingClientRect(), h = hero.getBoundingClientRect();
      return Math.max(90, (copy ? copy.top - h.top : H) - 24);
    };

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
      heat = new Float32Array(cols * rows);
      const hr = hero.getBoundingClientRect();
      keep = [...hero.querySelectorAll("[data-keepout]")].map((el) => { const r = el.getBoundingClientRect(); return { x0: r.left - hr.left - 14, y0: r.top - hr.top - 14, x1: r.right - hr.left + 14, y1: r.bottom - hr.top + 14 }; });
      // faint grid of the letter, drawn once and blitted every frame
      bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0); b.font = font(); b.textBaseline = "top"; b.fillStyle = rgba(INK, 0.07);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!blocked(c * CW, r * CH)) b.fillText(LETTER, c * CW, r * CH);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sig = ""; paintSource(); frame(performance.now());
    };

    const frame = (now: number) => {
      const { nodes: ns, onHud: hud } = live.current;
      const key = ns.map((n) => n.id).join("|");
      if (key !== sig) { sig = key; paintSource(); }
      const dt = Math.min(64, now - last || 16); last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bg, 0, 0);
      const dpr = cv.width / W; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font(); ctx.textBaseline = "top";

      // an idle glow wanders over the memories so the field is alive before anyone moves the mouse
      let gx = mx, gy = my;
      if (gx < -1000 && stars.length) { const s = stars[Math.floor(now / 4500) % stars.length]; gx = s.x * CW; gy = s.y * CH; }
      const idle = mx < -1000;

      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c, o = i * 4, a = px[o + 3] / 255, x = c * CW, y = r * CH;
        const d = Math.hypot(x + CW / 2 - gx, y + CH / 2 - gy), f = d < REACH ? 1 - d / REACH : 0;
        if (f > heat[i]) heat[i] = f * (idle ? 0.55 : 1);
        const h = heat[i]; heat[i] = h > 0.02 ? h * 0.93 : 0;
        if (a < 0.04 && h < 0.04) continue;
        if (blocked(x, y)) continue;
        let col = a >= 0.04 ? [px[o], px[o + 1], px[o + 2]] : INK, alpha = a >= 0.04 ? a * (0.82 + 0.18 * Math.sin(now * 0.0017 + (c * 7 + r * 13) % 11)) : 0;
        if (h > 0.04) { col = a >= 0.04 ? col : BRASS; alpha = Math.max(alpha, h * 0.9); }
        const ox = reduced ? 0 : ((x + CW / 2 - gx) / (d || 1)) * f * f * 12, oy = reduced ? 0 : ((y + CH / 2 - gy) / (d || 1)) * f * f * 12;
        ctx.fillStyle = rgba(col, Math.min(1, alpha)); ctx.fillText(LETTER, x + ox, y + oy);
      }

      if (now - hudAt > 90) {
        hudAt = now;
        const hit = stars.map((s) => ({ s, d: Math.hypot(s.x * CW - gx, s.y * CH - gy) })).filter((t) => t.d < REACH).sort((a, b) => a.d - b.d);
        near = hit.length ? Math.min(near + 90, 1000) : 0;
        const locked = near >= 300 && hit.length > 0;
        hud({ state: !stars.length ? "idle" : locked ? "locked" : "scanning", tracked: hit.length, top: locked ? `${hit[0].s.n.type}: ${hit[0].s.n.text.slice(0, 40)}` : "none" });
      }
      void dt;
    };

    const loop = (now: number) => { if (!running) return; if (now - last >= 33) frame(now); raf = requestAnimationFrame(loop); };
    const setRunning = (on: boolean) => { if (reduced || on === running) return; running = on; if (on) raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; };
    const onLeave = () => { mx = my = -1e4; };
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
