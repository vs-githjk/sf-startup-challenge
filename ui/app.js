// Starter data wiring for the UI/UX role. Polls keep-api every 2 s.
// Security: everything from the API is untrusted text. Build DOM with textContent only, never innerHTML.

const $ = (id) => document.getElementById(id);

async function get(path) {
  const r = await fetch(path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

function item(pill, text, extra) {
  const li = document.createElement("li");
  const p = document.createElement("span");
  p.className = `pill ${pill}`;
  p.textContent = pill;
  li.append(p, document.createTextNode(text));
  if (extra) {
    const s = document.createElement("div");
    s.className = "hint mono";
    s.textContent = extra;
    li.append(s);
  }
  return li;
}

function fill(el, nodes, empty) {
  el.replaceChildren(...(nodes.length ? nodes : [item("empty", empty)]));
}

async function refresh() {
  try {
    const mem = await get("/memories");
    const rows = Array.isArray(mem) ? mem : mem.memories || [];
    fill($("promises"), rows.filter((m) => m.kind === "promise").map((m) => item("promise", m.text, m.dataset)), "No promises yet");
    fill($("risks"), rows.filter((m) => m.kind === "risk" || m.kind === "claim").map((m) => item(m.kind, m.text, m.dataset)), "No risks yet");

    const d = await get("/drafts");
    const drafts = Array.isArray(d) ? d : d.drafts || [];
    fill($("drafts"), drafts.map((x) => item(x.status, `${x.to_name}: ${x.subject}`, x.approved_sha256 ? `sha256 ${x.approved_sha256.slice(0, 16)}…` : "")), "Nothing waiting");

    const u = await get("/usage");
    const usage = Array.isArray(u) ? u : u.agents || [];
    fill($("usage"), usage.map((a) => item(a.harness || "agent", `${a.agent}: ${a.tokens_in + a.tokens_out} tokens, ${a.tasks} tasks`, a.usd != null ? `$${Number(a.usd).toFixed(3)}` : "")), "No usage yet");

    const c = await get("/credits");
    $("credits").textContent = `credits ${c.balance ?? c.credits ?? "?"}`;

    const e = await get("/events");
    const events = (Array.isArray(e) ? e : e.events || []).slice(-30).reverse();
    fill($("events"), events.map((ev) => item(ev.type, ` ${ev.agent || ""} ${JSON.stringify(ev.payload || {})}`, ev.ts)), "Waiting for activity");
  } catch (err) {
    $("credits").textContent = `keep-api offline (${err.message})`;
  }
}

refresh();
setInterval(refresh, 2000);
