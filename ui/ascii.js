// ASCII recall field. Every star is a memory (promise, risk, claim, finding, draft), placed by a hash of its id.
// The pointer is a recall probe shaped like a prism: move it and the field scrambles (no answer yet),
// hold still and it locks, brackets the nearest memories and cites them as [memory: dataset / quote].
// Conflicting pairs get a red dotted link. Canvas 2D, no dependencies, 30 fps cap, paused off screen,
// one locked still frame under reduced motion. Mechanic adapted from clone/kalmanspace (our own repo).
(() => {
  const hero = document.getElementById("hero");
  const cv = document.getElementById("ascii");
  if (!hero || !cv) return;
  const ctx = cv.getContext("2d");
  const CW = 9, CH = 12, RAMP = [".", ":", "+", "*", "o", "O", "@"], SCRAMBLE = "01+*-=/\\|<>#$%&:.";
  const INK = "239,231,214", BRASS = "224,169,59", BAD = "238,109,87", COOL = "143,180,217";
  const KIND = { promise: [BRASS, 1], risk: [BAD, 0.95], draft: [INK, 0.9], claim: [COOL, 0.8], finding: ["180,155,214", 0.75], decision: ["134,191,141", 0.7], correction: ["134,191,141", 0.7] };
  const SPECTRUM = [BAD, BRASS, "134,191,141", COOL];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("still"); // ?still=1 gives a locked static frame for stills
  const el = (id) => document.getElementById(id);

  let W = 0, H = 0, cols = 0, rows = 0, dither = [], sky = [], mem = [], links = [];
  let sx = 0.5, sy = 0.45, mx = null, my = null, energy = 0, lockT = 0, running = false, last = 0, hudAt = 0;

  const rng = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const snap = (v, n) => Math.round(v / n) * n;

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 ${CH - 1}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    ctx.textBaseline = "top";
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    const r = rng(7);  // fixed seed: the sky is the same every visit
    dither = Array.from({ length: Math.floor(cols * rows * 0.05) }, () => ({ c: Math.floor(r() * cols), r: Math.floor(r() * rows), p: r() }));
    sky = Array.from({ length: Math.floor(cols * rows * 0.03) }, () => ({ u: r(), v: r(), b: Math.pow(r(), 3), p: r() * 40 }));
    frame(performance.now());
  }

  window.addEventListener("prismkeep:graph", (e) => {
    const d = e.detail || {};
    mem = (d.nodes || []).map((n) => ({ ...n, u: 0.05 + 0.9 * hash(n.id), v: 0.1 + 0.38 * hash(`${n.id}#`), b: (KIND[n.type] || [INK, 0.6])[1] }));
    links = d.links || [];
  });

  const dots = (ax, ay, bx, by, ch) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / CW));
    for (let i = 1; i < n; i++) ctx.fillText(ch, snap(ax + ((bx - ax) * i) / n, CW), snap(ay + ((by - ay) * i) / n, CH));
  };

  function frame(now) {
    const dt = Math.min(64, now - last || 16); last = now;
    // probe target: the pointer, or a slow survey drift when idle
    let tx = mx, ty = my;
    if (tx === null) {  // idle: tour the memories, contradicting ones first, 5 s each
      const linked = new Set(links.flatMap((l) => [l.a, l.b]));
      const tour = mem.filter((m) => linked.has(m.id)).concat(mem.filter((m) => !linked.has(m.id)));
      const m = tour.length ? tour[Math.floor(now / 5000) % tour.length] : null;
      tx = m ? m.u : 0.5 + 0.3 * Math.sin(now * 0.00021); ty = m ? m.v : 0.4 + 0.16 * Math.sin(now * 0.00033);
    }
    const dx = (tx - sx) * (reduced ? 1 : 0.07), dy = (ty - sy) * (reduced ? 1 : 0.07);
    sx += dx; sy += dy;
    const rate = Math.hypot(dx * W, dy * H) / Math.max(1, dt);          // px per ms
    energy += (Math.min(1, rate * 9) - energy) * 0.18;
    if (reduced || energy < 0.14) lockT += dt; else lockT = 0;
    const lock = reduced ? 1 : Math.max(0, Math.min(1, (lockT - 260) / 620));

    const bx = snap(sx * W, CW), by = snap(sy * H, CH), fov = Math.min(W, H) * 0.26;
    const px = (u, depth) => u * W - (sx - 0.5) * depth;
    ctx.clearRect(0, 0, W, H);

    for (const d of dither) {                                           // sensor noise
      const x = d.c * CW, y = d.r * CH, inside = Math.hypot(x - bx, y - by) < fov;
      ctx.fillStyle = `rgba(${INK},${(inside ? 0.14 : 0.05) * (0.5 + 0.5 * Math.sin(now * 0.001 + d.p * 40))})`;
      ctx.fillText(".", x, y);
    }
    for (const s of sky) {                                              // background stars, slow parallax
      const x = snap(px(s.u, 40), CW), y = snap(s.v * H - (sy - 0.45) * 24, CH);
      const inside = Math.hypot(x - bx, y - by) < fov, a = (0.28 + s.b * 0.6) * (inside ? 1 : 0.6);
      ctx.fillStyle = `rgba(${INK},${a * (0.85 + 0.15 * Math.sin(now * 0.002 + s.p))})`;
      ctx.fillText(RAMP[Math.min(RAMP.length - 1, Math.floor(Math.sqrt(s.b) * RAMP.length))], x, y);
    }

    // memories
    const seen = mem.map((m) => {
      const x = snap(px(m.u, 90), CW), y = snap(m.v * H - (sy - 0.45) * 50, CH);
      return { m, x, y, inside: Math.hypot(x - bx, y - by) < fov };
    });
    const byId = new Map(seen.map((s) => [s.m.id, s]));
    for (const s of seen) {
      const [rgb] = KIND[s.m.type] || [INK];
      ctx.fillStyle = `rgba(${rgb},${(0.62 + s.m.b * 0.38) * (s.inside ? 1 : 0.7)})`;
      ctx.fillText(s.inside ? "@" : "O", s.x, s.y);
    }
    ctx.fillStyle = `rgba(${BRASS},${0.28 + 0.4 * lock})`;               // acquisition circle
    for (let i = 0; i < 84; i++) { const t = (i / 84) * Math.PI * 2; ctx.fillText(".", snap(bx + Math.cos(t) * fov, CW), snap(by + Math.sin(t) * fov, CH)); }

    if (energy > 0.06 && !reduced) {                                    // no answer while slewing
      ctx.fillStyle = `rgba(${COOL},${0.14 + energy * 0.5})`;
      for (let i = 0, n = Math.floor(energy * 170); i < n; i++) {
        const t = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * fov;
        ctx.fillText(SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0], snap(bx + Math.cos(t) * r, CW), snap(by + Math.sin(t) * r, CH));
      }
    }

    const hits = seen.filter((s) => s.inside).sort((a, b) => b.m.b - a.m.b).slice(0, 5);
    if (lock > 0) {
      links.forEach((l) => {                                            // contradiction: red dotted link
        const a = byId.get(l.a), b = byId.get(l.b);
        if (a && b && (a.inside || b.inside)) { ctx.fillStyle = `rgba(${BAD},${0.15 + lock * 0.55})`; dots(a.x, a.y, b.x, b.y, "!"); }
      });
      const shown = Math.ceil(lock * hits.length), placed = [];
      for (let i = 0; i < shown; i++) {
        const h = hits[i];
        ctx.fillStyle = `rgba(${(KIND[h.m.type] || [BRASS])[0]},${0.55 + 0.45 * lock})`;
        ctx.fillText("[", h.x - CW * 1.5, h.y); ctx.fillText("]", h.x + CW * 1.5, h.y);
        if (lock > 0.7 && h.x < W - 220) {                              // cite it, unless a label is already there
          const lx = h.x + CW * 3, ly = h.y - CH;
          if (!placed.some((q) => Math.abs(q.x - lx) < 340 && Math.abs(q.y - ly) < 14)) {
            placed.push({ x: lx, y: ly });
            ctx.fillStyle = `rgba(${BRASS},${0.55 * lock})`;
            ctx.fillText(`[memory: ${h.m.ds || "company"} / ${(h.m.text || "").replace(/\s+/g, " ").slice(0, 26)}]`, lx, ly);
          }
        }
      }
    }

    // the probe: a dotted prism. At lock the beam splits into four rays.
    ctx.fillStyle = `rgba(${BRASS},${0.7 + 0.3 * lock})`;
    const A = [bx, by - CH * 3], B = [bx - CW * 3, by + CH * 2], C = [bx + CW * 3, by + CH * 2];
    dots(...A, ...B, "."); dots(...B, ...C, "."); dots(...C, ...A, ".");
    ctx.fillText(lock > 0.9 ? "+" : "o", bx, by - CH);
    if (lock > 0.3) SPECTRUM.forEach((rgb, k) => {
      ctx.fillStyle = `rgba(${rgb},${lock * 0.85})`;
      for (let i = 1; i <= 4; i++) ctx.fillText("-", bx + CW * (3 + i * 2), by + CH * (k - 1.5) * (1 + i * 0.25));
    });

    if (now - hudAt > 90) {                                             // readout, written straight to the DOM
      hudAt = now;
      const locked = lock > 0.6, top = hits[0];
      if (el("t-state")) { el("t-state").textContent = locked ? "LOCKED" : "SLEWING"; el("t-state").className = locked ? "on" : ""; }
      if (el("t-track")) el("t-track").textContent = String(lock > 0.4 ? hits.length : 0).padStart(2, "0");
      if (el("t-top")) el("t-top").textContent = locked && top ? `${top.m.type}: ${(top.m.text || "").slice(0, 34)}` : "NONE";
    }
  }

  function loop(now) {
    if (!running) return;
    if (now - last >= 33) frame(now);
    requestAnimationFrame(loop);
  }
  const setRunning = (on) => { if (reduced || on === running) return; running = on; if (on) requestAnimationFrame(loop); };

  hero.addEventListener("pointermove", (e) => { const b = cv.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width; my = (e.clientY - b.top) / b.height; }, { passive: true });
  hero.addEventListener("pointerleave", () => { mx = my = null; });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver((es) => setRunning(es[0].isIntersecting && !document.hidden)).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
  resize();

  const clock = el("t-clock");
  if (clock) { const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour12: false }); }; tick(); setInterval(tick, 1000); }
})();
