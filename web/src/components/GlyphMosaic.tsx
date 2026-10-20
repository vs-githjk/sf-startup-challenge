import { useEffect, useRef } from "react";
import { STILL } from "../api";

// Hero art. One letter repeated on a grid is the only pixel. A glass prism takes a single beam from the left and
// splits it into four rays, one to each tool tile (the tiles carry data-ray="r,g,b"). No pointer interaction:
// the glint and the light pulses move on their own. A still frame is drawn under reduced motion.

const LETTER = "P", CW = 10, CH = 13;
const CREAM = [239, 231, 214], BRASS = [224, 169, 59];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const h2 = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const noise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
};

type Target = { x: number; y: number; color: number[] };

export default function GlyphMosaic() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!, hero = cv.parentElement!, ctx = cv.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || STILL;
    const bg = document.createElement("canvas");
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1, targets: Target[] = [];
    let keep: { x0: number; y0: number; x1: number; y1: number }[] = [];
    let running = false, last = 0, raf = 0;
    const font = () => `600 ${CH - 2}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    const blocked = (x: number, y: number) => keep.some((k) => x + CW > k.x0 && x < k.x1 && y + CH > k.y0 && y < k.y1);

    const measure = () => {
      const hr = hero.getBoundingClientRect();
      keep = [...hero.querySelectorAll("[data-keepout]")].map((el) => { const r = el.getBoundingClientRect(); return { x0: r.left - hr.left - 14, y0: r.top - hr.top - 14, x1: r.right - hr.left + 14, y1: r.bottom - hr.top + 14 }; });
      targets = [...hero.querySelectorAll("[data-ray]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - hr.left - 6, y: r.top - hr.top + r.height / 2, color: (el.getAttribute("data-ray") ?? "239,231,214").split(",").map(Number) };
      });
    };

    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight; cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      measure();
      // faint grid of the letter, drawn once, a little lighter than the ground
      bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0); b.font = font(); b.textBaseline = "top"; b.fillStyle = rgba([58, 55, 49], 0.55);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!blocked(c * CW, r * CH)) b.fillText(LETTER, c * CW, r * CH);
      frame(performance.now());
    };

    const ray = (x0: number, y0: number, x1: number, y1: number, color: (u: number, i: number) => [number[], number]) => {
      let c0 = Math.floor(x0 / CW), r0 = Math.floor(y0 / CH); const c1 = Math.floor(x1 / CW), r1 = Math.floor(y1 / CH);
      const dx = Math.abs(c1 - c0), dy = -Math.abs(r1 - r0), sxn = c0 < c1 ? 1 : -1, syn = r0 < r1 ? 1 : -1, total = Math.max(1, dx + Math.abs(dy));
      let err = dx + dy;
      for (let i = 0; i < 600; i++) {
        if (c0 >= 0 && r0 >= 0 && c0 < cols && r0 < rows && !blocked(c0 * CW, r0 * CH)) { const [col, a] = color(i / total, i); ctx.fillStyle = rgba(col, a); ctx.fillText(LETTER, c0 * CW, r0 * CH); }
        if (c0 === c1 && r0 === r1) break;
        const e2 = 2 * err; if (e2 >= dy) { err += dy; c0 += sxn; } if (e2 <= dx) { err += dx; r0 += syn; }
      }
    };

    const frame = (now: number) => {
      const t = reduced ? 2.3 : now / 1000;
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(bg, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = font(); ctx.textBaseline = "top";

      // prism: a triangle of letters with a bright rim and a glint that drifts across it
      const S = Math.min(H * 0.27, W * 0.13), pcx = W * 0.4, pcy = H * 0.4;
      const A = [pcx, pcy - S], B = [pcx - S * 0.92, pcy + S * 0.66], C = [pcx + S * 0.92, pcy + S * 0.66];
      const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      const glintX = lerp(B[0], C[0], 0.5 + 0.5 * Math.sin(t * 0.7));
      for (let r = Math.floor((A[1] - 6) / CH); r <= Math.ceil((B[1] + 6) / CH); r++) for (let c = Math.floor((B[0] - 6) / CW); c <= Math.ceil((C[0] + 6) / CW); c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const x = c * CW, y = r * CH, qx = x + CW / 2, qy = y + CH / 2;
        const l1 = ((B[1] - C[1]) * (qx - C[0]) + (C[0] - B[0]) * (qy - C[1])) / den, l2 = ((C[1] - A[1]) * (qx - C[0]) + (A[0] - C[0]) * (qy - C[1])) / den, l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0 || blocked(x, y)) continue;
        const rim = 1 - Math.min(1, Math.min(l1, l2, l3) / 0.09), face = l3 > l2 ? 1 : 0, glint = Math.exp(-(((qx - glintX) / (S * 0.28)) ** 2));
        const k = Math.min(1, 0.2 + face * 0.3 + glint * 0.55 + 0.15 * noise(qx * 0.05 + t * 0.4, qy * 0.05));
        let col = mix([30, 29, 27], [120, 115, 104], k); col = mix(col, CREAM, rim * 0.85); if (glint > 0.45) col = mix(col, BRASS, Math.min(0.8, glint * 0.7));
        ctx.fillStyle = rgba(col, 0.97); ctx.fillText(LETTER, x, y);
      }

      const at = (p: number[], q: number[], u: number) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
      const E1 = at(A, B, 0.5), E2 = at(A, C, 0.5);
      // one beam in, a path through the glass, then a ray to each tool
      ray(0, E1[1] - H * 0.05, E1[0], E1[1], (_u, i) => [CREAM, 0.55 + 0.45 * Math.sin(i * 0.45 - t * 3.6)]);
      ray(E1[0], E1[1], E2[0], E2[1], (u, i) => [mix(CREAM, BRASS, u), 0.65 + 0.35 * Math.sin(i * 0.5 - t * 3.6)]);
      targets.forEach((tg, k) => ray(E2[0], E2[1], tg.x, tg.y, (u, i) => [tg.color, (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.4 - t * 3 + k))) * (1 - u * 0.2)]));
    };

    const loop = (now: number) => { if (!running) return; if (now - last >= 33) frame(now); raf = requestAnimationFrame(loop); };
    const setRunning = (on: boolean) => { if (reduced || on === running) return; running = on; if (on) raf = requestAnimationFrame(loop); };
    const onVis = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(resize); ro.observe(hero); hero.querySelectorAll("[data-ray]").forEach((el) => ro.observe(el));
    const io = new IntersectionObserver((es) => setRunning(es[0].isIntersecting && !document.hidden)); io.observe(hero);
    resize();
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
