// PrismKeep founder ledger. Polls keep-api every 2 s and updates the DOM in place so rows animate once.
// Security: everything from the API is untrusted text. Build DOM with textContent only, never innerHTML.
// Add ?demo=1 to the URL to preview with synthetic data (Lumen Analytics, Acme Logistics, Northline Ventures).

const $ = (id) => document.getElementById(id);
const DEMO = new URLSearchParams(location.search).has("demo");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STOP = new Set("the and for with that this from have will your our was were are not but you they their about into over than then when what which would could should been being more some just also".split(" "));
let firstPaint = true;

// ---------- data ----------
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const FIXTURES = {
  "/memories": { memories: [
    { id: "m1", dataset: "rel_northline", kind: "promise", text: "Founder promised Sarah Chen the retention cohort by Oct 17.", source: "northline meeting Oct 13", created_at: ago(120) },
    { id: "m2", dataset: "rel_acme", kind: "promise", text: "SSO fix promised to Acme by Friday.", source: "acme call Oct 13", created_at: ago(118) },
    { id: "m3", dataset: "rel_acme", kind: "risk", text: "Acme will look at alternatives if SSO slips: churn risk this quarter.", source: "acme call Oct 13", created_at: ago(117) },
    { id: "m4", dataset: "company", kind: "claim", text: "Metric: weekly active workspaces grew 18 percent.", source: "metrics.json", created_at: ago(90) },
    { id: "m6", dataset: "rel_acme", kind: "risk", text: "Acme reported the CSV export shows another customer's rows.", source: "support ticket Oct 20", created_at: ago(40) },
    { id: "m7", dataset: "company", kind: "decision", text: "Security fixes need a clean Snyk rescan before Done.", source: "chief of staff", created_at: ago(35) },
    { id: "m5", dataset: "eng_security", kind: "finding", text: "Raw SQL string in CSV export path (seen 2 times).", source: "snyk code", created_at: ago(30) },
  ] },
  "/drafts": { drafts: [
    { id: "d1", to_name: "Sarah Chen", subject: "Follow up: retention cohort", body: "As promised on Oct 13, here is the retention cohort. We see no churn risk this quarter and Acme is expanding.", status: "pending", approved_sha256: null },
    { id: "d2", to_name: "Acme Logistics", subject: "CSV export fix shipped", body: "The export fix is live and verified by a clean security scan.", status: "approved", approved_sha256: "9f2c7a1be04d3358a6c1f0d9e87b24c5d3a9106b7e48f2c1ad05b39e6c7f8a12" },
  ] },
  "/usage": { agents: [
    { agent: "chief_of_staff", harness: "claude-code", tokens_in: 18400, tokens_out: 5200, tasks: 6, usd: 0.41 },
    { agent: "drafter", harness: "codex", tokens_in: 9100, tokens_out: 3300, tasks: 3, usd: 0.22 },
    { agent: "brain", harness: "langgraph", tokens_in: 14000, tokens_out: 2100, tasks: 4, usd: 0.16 },
  ] },
  "/credits": { balance: 140, start: 1000 },
  "/gate/deep_research": { feature: "deep_research", allow: false, cost: 200, balance: 140 },
  "/events": { events: [
    { id: 1, ts: ago(5), type: "remember", agent: "listener", payload: { dataset: "rel_northline", kind: "promise" } },
    { id: 2, ts: ago(4), type: "recall", agent: "drafter", payload: { query: "open promises for Northline", n: 2 } },
    { id: 3, ts: ago(3), type: "draft", agent: "drafter", payload: { to: "Sarah Chen" } },
    { id: 4, ts: ago(2), type: "cost", agent: "brain", payload: { tokens_in: 4000, tokens_out: 600, tasks: 1 } },
  ] },
};

async function get(path) {
  if (DEMO) return structuredClone(FIXTURES[path] ?? {});
  const r = await fetch(path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

// ---------- dom helpers ----------
function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const chip = (kind, label) => h("span", `chip ${kind}`, label ?? kind);
const pretty = (ds) => (ds || "").replace(/^rel_/, "").replace(/_/g, " ");
const clock = (ts) => { const d = new Date(ts); return isNaN(d) ? "" : d.toLocaleTimeString([], { hour12: false }); };
const words = (s) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !STOP.has(w)));

// Reconcile rows by key so existing nodes keep their state and new ones animate in.
function sync(list, rows, make, update, emptyText) {
  const old = new Map([...list.children].map((c) => [c.dataset.key, c]));
  if (!rows.length) {
    if (!old.has("__empty")) { const e = h("li", "empty", emptyText); e.dataset.key = "__empty"; list.replaceChildren(e); }
    return;
  }
  old.get("__empty")?.remove();
  rows.forEach((row, i) => {
    let node = old.get(row.key);
    if (!node) {
      node = make(row);
      node.dataset.key = row.key;
      node.classList.add(firstPaint ? "enter" : "fresh");
      node.style.setProperty("--i", String(i));
    }
    old.delete(row.key);
    update?.(node, row);
    if (list.children[i] !== node) list.insertBefore(node, list.children[i] || null);
  });
  old.forEach((n) => n.remove());
}

function tween(el, to) {
  const from = Number(el.dataset.v || 0);
  if (from === to) return;
  el.dataset.v = String(to);
  if (REDUCED) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / 550);
    el.textContent = String(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step); // stops when the tween ends
  };
  requestAnimationFrame(step);
}

// ---------- panels ----------
function memoryRow(m) {
  const li = h("li");
  li.append(h("div", "quote"), h("div", "meta"));
  return li;
}
function memoryUpdate(node, m) {
  node.firstChild.textContent = m.text;
  const meta = node.lastChild;
  meta.replaceChildren(chip(m.kind), h("span", null, pretty(m.dataset)), ...(m.source ? [h("span", null, m.source)] : []));
}

// Pair draft sentences with stored risks that share two or more meaningful words, plus any "block" events.
function findConflicts(drafts, mems, events) {
  const out = [];
  const risky = mems.filter((m) => m.kind === "risk" || m.kind === "correction");
  drafts.filter((d) => d.status === "pending").forEach((d) => {
    (d.body.match(/[^.!?]+[.!?]?/g) || []).forEach((sentence) => {
      const sw = words(sentence);
      const hit = risky.find((m) => [...words(m.text)].filter((w) => sw.has(w)).length >= 2
        || (/\bno\b.*\bchurn\b/i.test(sentence) && /churn/i.test(m.text)));
      if (hit) out.push({ key: `${d.id}:${hit.id}:${sentence.trim().slice(0, 24)}`, draftId: d.id, memId: hit.id, said: sentence.trim(), mem: hit.text, ds: hit.dataset, to: d.to_name, note: "Possible conflict, Brain confirms before send" });
    });
  });
  events.filter((e) => e.type === "block").forEach((e) => {
    const p = e.payload || {};
    out.push({ key: `ev${e.id}`, said: String(p.claim || ""), mem: String(p.memory || ""), ds: String(p.dataset || ""), to: String(p.to || ""), note: p.tier ? `Evidence tier: ${p.tier}` : "Blocked by Brain" });
  });
  return out;
}
function conflictRow() {
  const li = h("li", "pair");
  const said = h("div", "side said"), link = h("div", "link"), mem = h("div", "side mem");
  said.append(h("small", null, "Draft says"), h("div", "quote"));
  mem.append(h("small", null, "Memory says"), h("div", "quote"), h("div", "meta"));
  li.append(said, link, mem);
  return li;
}
function conflictUpdate(node, c) {
  node.querySelector(".said .quote").textContent = c.said;
  node.querySelector(".mem .quote").textContent = c.mem;
  node.querySelector(".mem .meta").replaceChildren(chip("risk", "memory"), h("span", null, `[memory: ${c.ds} / ${c.mem.slice(0, 40)}]`));
  node.querySelector(".mem small").textContent = `Memory says${c.to ? ` (${c.to})` : ""}`;
}

function draftRow() {
  const li = h("li");
  li.append(h("div", "meta"), h("div", "subject"), h("p", "body"));
  return li;
}
function draftUpdate(node, d) {
  const [meta, subject, body] = node.children;
  meta.replaceChildren(chip(d.status), h("span", null, d.to_name));
  subject.textContent = d.subject;
  body.textContent = d.body;
  // Touch the hash node only when the value changes, so its reveal animation plays once.
  const text = d.approved_sha256 ? `sha256 ${d.approved_sha256}` : "";
  let hash = node.querySelector(".hash");
  if (!text) { hash?.remove(); return; }
  if (!hash) { hash = h("code", "hash"); hash.title = "Hash of the approved text"; node.append(hash); }
  if (hash.textContent !== text) hash.textContent = text;
}

function usageRow() {
  const li = h("li", "bar-row");
  const spark = h("div", "spark"); spark.append(h("i"));
  li.append(h("span", "name"), h("span", "num"), spark);
  return li;
}
function usageUpdate(node, a, max) {
  node.children[0].textContent = `${a.agent}${a.harness ? ` (${a.harness})` : ""}`;
  const tok = a.tokens_in + a.tokens_out;
  node.children[1].textContent = `${tok.toLocaleString()} tok, ${a.tasks} tasks${a.usd != null ? `, $${Number(a.usd).toFixed(2)}` : ""}`;
  node.querySelector("i").style.transform = `scaleX(${max ? tok / max : 0})`;
}

function summarize(ev) {
  const p = ev.payload || {};
  switch (ev.type) {
    case "remember": return `saved ${p.kind || "memory"} to ${p.dataset || "memory"}`;
    case "recall": return `recalled ${p.n ?? "?"} for "${p.query || ""}"`;
    case "forget": return `forgot a fact in ${p.dataset || "memory"}`;
    case "improve": return `improve: ${p.feedback || p.dataset || ""}`;
    case "draft": return `draft for ${p.to || ""}`;
    case "approve": return `approved, sha256 ${String(p.sha256 || "").slice(0, 12)}`;
    case "send": return `sent to outbox${p.flexprice_synced === false ? " (Flexprice sync pending)" : ""}`;
    case "send_refused": return "send refused: text differs from approval";
    case "cost": return `${(p.tokens_in || 0) + (p.tokens_out || 0)} tokens, ${p.tasks || 0} tasks`;
    case "credit_spend": return `${p.credits} credits for ${p.reason || ""}`;
    default: return JSON.stringify(p).slice(0, 120);
  }
}
function eventRow() {
  const li = h("li", "ev");
  li.append(h("time"), h("span", "t"), h("span"));
  return li;
}
function eventUpdate(node, ev) {
  node.children[0].textContent = clock(ev.ts);
  node.children[1].className = `t ${ev.type}`;
  node.children[1].textContent = ev.type;
  node.children[2].textContent = `${ev.agent ? `${ev.agent}: ` : ""}${summarize(ev)}`;
}

// ---------- memory graph ----------
// Dependency-free force layout. Positions persist across polls; the simulation cools and stops on its own.
const NS = "http://www.w3.org/2000/svg", W = 1000, H = 380;
const G = { pos: new Map(), sig: "", nodes: [], links: [], els: new Map(), raf: 0 };
const sv = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };

function graphData(mems, drafts, conflicts) {
  const nodes = [], links = [], seen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  mems.forEach((m) => {
    add({ id: `ds:${m.dataset}`, type: "hub", r: 15, label: pretty(m.dataset) || m.dataset, text: `Dataset ${m.dataset}` });
    add({ id: `m:${m.id}`, type: m.kind, r: 7, text: m.text });
    links.push({ a: `ds:${m.dataset}`, b: `m:${m.id}`, type: "own" });
  });
  drafts.filter((d) => d.status === "pending").forEach((d) => add({ id: `d:${d.id}`, type: "draft", r: 9, text: `Draft to ${d.to_name}: ${d.subject}` }));
  conflicts.forEach((c) => { if (c.draftId && seen.has(`d:${c.draftId}`) && seen.has(`m:${c.memId}`)) links.push({ a: `d:${c.draftId}`, b: `m:${c.memId}`, type: "conflict" }); });
  return { nodes, links };
}

function renderGraph(mems, drafts, conflicts) {
  const { nodes, links } = graphData(mems, drafts, conflicts);
  const sig = nodes.map((n) => n.id).join("|") + links.length;
  $("c-graph").textContent = `${nodes.length} nodes, ${links.length} links`;
  if (sig === G.sig) return;
  G.sig = sig;
  nodes.forEach((n, i) => {
    const old = G.pos.get(n.id);
    const ang = i * 2.399963;  // golden angle spreads new nodes without randomness
    n.x = old ? old.x : W / 2 + Math.cos(ang) * 90 * (1 + (i % 5) / 4);
    n.y = old ? old.y : H / 2 + Math.sin(ang) * 70 * (1 + (i % 5) / 4);
    n.vx = 0; n.vy = 0;
    G.pos.set(n.id, n);
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  G.nodes = nodes; G.links = links.map((l) => ({ ...l, s: byId.get(l.a), t: byId.get(l.b) }));

  const svgEl = $("graph"), tip = $("tip");
  svgEl.replaceChildren();
  G.els = new Map();
  G.links.forEach((l) => { l.el = sv("line", { class: `edge ${l.type}` }); svgEl.append(l.el); });
  nodes.forEach((n, i) => {
    const g = sv("g", { tabindex: 0, "aria-label": n.text });
    const dot = sv("circle", { r: n.r, class: `dot ${n.type}` });
    dot.style.animationDelay = `${Math.min(i, 30) * 30}ms`;
    g.append(dot);
    if (n.label) { const t = sv("text", { y: n.r + 15 }); t.textContent = n.label; g.append(t); }
    const show = () => { tip.textContent = n.text; tip.hidden = false; tip.style.left = `${(n.x / W) * 100}%`; tip.style.top = `${(n.y / H) * 100}%`; };
    g.addEventListener("pointerenter", show); g.addEventListener("focus", show);
    g.addEventListener("pointerleave", () => { tip.hidden = true; }); g.addEventListener("blur", () => { tip.hidden = true; });
    svgEl.append(g);
    n.el = g;
  });
  if (REDUCED) { for (let i = 0; i < 300; i++) step(1 - i / 300); draw(); } else { G.alpha = 1; cancelAnimationFrame(G.raf); loop(); }
}

function step(alpha) {
  const ns = G.nodes;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const a = ns[i], b = ns[j];
    let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy || 1;
    const f = (a.type === "hub" || b.type === "hub" ? 18000 : 6500) / d2 * alpha, d = Math.sqrt(d2);
    dx = (dx / d) * f; dy = (dy / d) * f;
    a.vx -= dx; a.vy -= dy; b.vx += dx; b.vy += dy;
  }
  G.links.forEach((l) => {
    const rest = l.type === "conflict" ? 230 : 95;
    const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.hypot(dx, dy) || 1, k = (d - rest) * 0.04 * alpha;
    l.s.vx += (dx / d) * k; l.s.vy += (dy / d) * k; l.t.vx -= (dx / d) * k; l.t.vy -= (dy / d) * k;
  });
  ns.forEach((n) => {
    n.vx += (W / 2 - n.x) * 0.0012 * alpha; n.vy += (H / 2 - n.y) * 0.002 * alpha;
    n.vx *= 0.82; n.vy *= 0.82;
    n.x = Math.max(30, Math.min(W - 30, n.x + n.vx)); n.y = Math.max(24, Math.min(H - 34, n.y + n.vy));
  });
}
function draw() {
  G.nodes.forEach((n) => n.el.setAttribute("transform", `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`));
  G.links.forEach((l) => { l.el.setAttribute("x1", l.s.x.toFixed(1)); l.el.setAttribute("y1", l.s.y.toFixed(1)); l.el.setAttribute("x2", l.t.x.toFixed(1)); l.el.setAttribute("y2", l.t.y.toFixed(1)); });
}
function loop() {
  step(G.alpha); draw();
  G.alpha *= 0.975;
  if (G.alpha > 0.02 && !document.hidden) G.raf = requestAnimationFrame(loop); // cools and stops
}

// ---------- refresh ----------
function setConn(ok, msg) {
  $("live").className = `live ${ok ? "on" : "off"}`;
  $("conn").textContent = msg;
}

async function refresh() {
  if (document.hidden) return;
  try {
    const [mem, dr, us, cr, ev, gate] = await Promise.all(
      ["/memories", "/drafts", "/usage", "/credits", "/events", "/gate/deep_research"].map(get));
    const mems = mem.memories || [], drafts = dr.drafts || [], agents = us.agents || [], events = ev.events || [];
    const promises = mems.filter((m) => m.kind === "promise");
    const risks = mems.filter((m) => m.kind === "risk" || m.kind === "claim");
    const finds = mems.filter((m) => m.dataset === "eng_security");
    const conflicts = findConflicts(drafts, mems, events);
    const pending = drafts.filter((d) => d.status === "pending").length;

    sync($("promises"), promises.map((m) => ({ key: m.id, ...m })), memoryRow, memoryUpdate, "No promises yet. Paste a conversation into Band and the Listener will log them here.");
    sync($("risks"), risks.map((m) => ({ key: m.id, ...m })), memoryRow, memoryUpdate, "No risks on record.");
    sync($("conflicts"), conflicts, conflictRow, conflictUpdate, "No conflicts. Every pending claim agrees with memory.");
    sync($("drafts"), drafts.map((d) => ({ key: d.id, ...d })), draftRow, draftUpdate, "Nothing waiting for approval.");
    const max = Math.max(0, ...agents.map((a) => a.tokens_in + a.tokens_out));
    sync($("usage"), agents.map((a) => ({ key: a.agent, ...a })), usageRow, (n, a) => usageUpdate(n, a, max), "No agent usage metered yet.");
    sync($("security"), finds.map((m) => ({ key: m.id, ...m })), memoryRow, memoryUpdate, "No findings stored yet. Run the first Snyk scan.");
    sync($("events"), events.slice(-40).reverse().map((e) => ({ key: String(e.id), ...e })), eventRow, eventUpdate, "Waiting for activity.");

    renderGraph(mems, drafts, conflicts);
    $("c-promises").textContent = `${promises.length}`;
    $("c-risks").textContent = `${risks.length}`;
    $("c-conflict").textContent = conflicts.length ? `${conflicts.length} to review` : "clear";
    $("c-drafts").textContent = `${pending} pending`;
    $("c-usage").textContent = `${agents.length} agents`;
    $("c-sec").textContent = finds.length ? `${finds.length} stored` : "no scan yet";
    $("c-events").textContent = `${events.length}`;
    $("t-prom").textContent = String(promises.length).padStart(2, "0");
    $("t-conf").textContent = String(conflicts.length).padStart(2, "0");
    tween($("s-promises"), promises.length);
    tween($("s-risks"), risks.length);
    tween($("s-blocks"), conflicts.length);
    tween($("s-pending"), pending);

    const bal = Number(cr.balance ?? 0), start = Number(cr.start || 1000);
    $("credits").textContent = `${Math.round(bal)} credits`;
    $("meter").style.transform = `scaleX(${Math.max(0, Math.min(1, bal / start))})`;
    $("meter-label").textContent = `${Math.round(bal)} of ${Math.round(start)} credits left`;
    const g = $("gate");
    g.replaceChildren(chip(gate.allow ? "allowed" : "denied", gate.allow ? "allowed" : "denied"),
      h("span", null, `Deep investor research costs ${gate.cost ?? "?"} credits`),
      ...(gate.allow ? [] : [h("span", "meta", "Not enough credits. Top up in Flexprice.")]));

    $("tag").textContent = DEMO ? "demo preview, synthetic data" : "synthetic data";
    setConn(true, DEMO ? "demo" : "keep-api live");
  } catch (err) {
    setConn(false, `keep-api offline (${err.message})`);
    // Keep stale rows on a transient error; only explain the empty panels.
    ["promises", "risks", "conflicts", "drafts", "usage", "security", "events"].forEach((id) => {
      if (!$(id).children.length) sync($(id), [], null, null, "Waiting for keep-api. Start it with: KEEP_BACKEND=local uv run python -m keep.api");
    });
  }
  firstPaint = false;
}

refresh();
setInterval(refresh, 2000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
