// ASCII prism hero. Canvas 2D, no dependencies. A prism splits one red beam of promises into a spectrum.
// The pointer shoves glyphs away, brightens them, and leaves a decaying heat trail.
// Capped at 30 fps, paused off screen or in a hidden tab, drawn once if the user prefers reduced motion.
(() => {
  const hero = document.getElementById("hero");
  const cv = document.getElementById("ascii");
  if (!hero || !cv) return;
  const ctx = cv.getContext("2d");
  const CW = 11, CH = 17, RAMP = ".:-=+*#%@", RADIUS = 120;
  const COLORS = { ink: "239,231,214", beam: "238,109,87", brass: "224,169,59", band: ["238,109,87", "224,169,59", "134,191,141", "143,180,217", "180,155,214"] };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, cols = 0, rows = 0, heat = new Float32Array(0), mx = -9999, my = -9999, running = false, last = 0;

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 ${CH - 4}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    heat = new Float32Array(cols * rows);
    frame(performance.now());
  }

  const segDist = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
    return [Math.hypot(px - ax - vx * t, py - ay - vy * t), t];
  };

  function frame(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    const A = [W * 0.70, H * 0.12], B = [W * 0.58, H * 0.80], C = [W * 0.84, H * 0.80];  // prism
    const P0 = [0, H * 0.04], P1 = [W * 0.64, H * 0.50];                                   // incoming beam
    const O = [W * 0.76, H * 0.50];                                                         // exit point
    const area = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    let lastFill = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = c * CW + CW / 2, cy = r * CH + CH / 2, i = r * cols + c;
      let ch = "K", rgb = COLORS.ink, a = 0.08;

      const l1 = ((B[1] - C[1]) * (cx - C[0]) + (C[0] - B[0]) * (cy - C[1])) / area;
      const l2 = ((C[1] - A[1]) * (cx - C[0]) + (A[0] - C[0]) * (cy - C[1])) / area;
      const l3 = 1 - l1 - l2;
      if (l1 > 0 && l2 > 0 && l3 > 0) {  // inside the prism: shaded by distance to its edges
        const edge = Math.min(l1, l2, l3), lum = Math.min(1, 0.25 + edge * 2.4 + 0.12 * Math.sin(t * 1.4 + cx * 0.03));
        ch = RAMP[Math.round(lum * (RAMP.length - 1))]; a = 0.2 + lum * 0.6;
      }
      const [bd, bt] = segDist(cx, cy, P0[0], P0[1], P1[0], P1[1]);
      if (bd < 8) { ch = "P"; rgb = COLORS.beam; a = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(bt * 26 - t * 3.2)); }
      COLORS.band.forEach((col, k) => {
        const E = [W + 20, H * (0.14 + k * 0.17)], [d, u] = segDist(cx, cy, O[0], O[1], E[0], E[1]);
        if (d < 7 && u > 0.02) { ch = RAMP[4 + ((c + r + k) % 4)]; rgb = col; a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(u * 30 - t * 2.6 + k)) * (1 - u * 0.45); }
      });

      let ox = 0, oy = 0;
      if (!reduced) {
        const dx = cx - mx, dy = cy - my, d = Math.hypot(dx, dy);
        if (d < RADIUS) {
          const f = 1 - d / RADIUS;
          ox = (dx / (d || 1)) * f * f * 18; oy = (dy / (d || 1)) * f * f * 18;
          heat[i] = Math.max(heat[i], f);
        }
        const h = heat[i];
        if (h > 0.03) { ch = RAMP[Math.min(RAMP.length - 1, Math.floor(h * RAMP.length))]; rgb = COLORS.brass; a = Math.max(a, h * 0.9); heat[i] = h * 0.93; } else heat[i] = 0;
      }
      const fill = `rgba(${rgb},${a.toFixed(2)})`;
      if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
      ctx.fillText(ch, cx + ox, cy + oy);
    }
  }

  function loop(now) {
    if (!running) return;
    if (now - last >= 33) { last = now; frame(now); }
    requestAnimationFrame(loop);
  }
  const setRunning = (on) => { if (reduced || on === running) return; running = on; if (on) requestAnimationFrame(loop); };

  hero.addEventListener("pointermove", (e) => { const b = cv.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top; });
  hero.addEventListener("pointerleave", () => { mx = my = -9999; });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver((es) => setRunning(es[0].isIntersecting && !document.hidden)).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
  resize();

  // Telemetry strip: clock ticks locally, counts come from app.js through textContent.
  const clock = document.getElementById("t-clock");
  if (clock) { const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour12: false }); }; tick(); setInterval(tick, 1000); }
})();
