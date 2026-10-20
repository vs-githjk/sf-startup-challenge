import type { Draft, Ev, Memory } from "./api";

const STOP = new Set("the and for with that this from have will your our was were are not but you they their about into over than then when what which would could should been being more some just also".split(" "));
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)));
export const pretty = (ds: string) => ds.replace(/^rel_/, "").replace(/_/g, " ");

export type Conflict = { key: string; draftId: string; memId: string; said: string; mem: string; ds: string; to: string; note: string };

// Pair pending draft sentences with stored risks that share two or more meaningful words.
// A "block" event from the Brain carries its own claim, memory and evidence tier and is shown as is.
export function findConflicts(drafts: Draft[], mems: Memory[], events: Ev[]): Conflict[] {
  const out: Conflict[] = [];
  const risky = mems.filter((m) => m.kind === "risk" || m.kind === "correction");
  for (const d of drafts.filter((x) => x.status === "pending")) {
    for (const sentence of d.body.match(/[^.!?]+[.!?]?/g) ?? []) {
      const sw = words(sentence);
      const hit = risky.find((m) => [...words(m.text)].filter((w) => sw.has(w)).length >= 2 || (/\bno\b.*\bchurn\b/i.test(sentence) && /churn/i.test(m.text)));
      if (hit) out.push({ key: `${d.id}:${hit.id}:${sentence.trim().slice(0, 24)}`, draftId: d.id, memId: hit.id, said: sentence.trim(), mem: hit.text, ds: hit.dataset, to: d.to_name, note: "Possible conflict, Brain confirms before send" });
    }
  }
  for (const e of events.filter((x) => x.type === "block")) {
    const p = e.payload ?? {};
    out.push({ key: `ev${e.id}`, draftId: "", memId: "", said: String(p.claim ?? ""), mem: String(p.memory ?? ""), ds: String(p.dataset ?? ""), to: String(p.to ?? ""), note: p.tier ? `Evidence tier: ${String(p.tier)}` : "Blocked by Brain" });
  }
  return out;
}

export function summarize(ev: Ev): string {
  const p = (ev.payload ?? {}) as Record<string, any>;
  switch (ev.type) {
    case "remember": return `saved ${p.kind ?? "memory"} to ${p.dataset ?? "memory"}`;
    case "recall": return `recalled ${p.n ?? "?"} for "${p.query ?? ""}"`;
    case "forget": return `forgot a fact in ${p.dataset ?? "memory"}`;
    case "improve": return `improve: ${p.feedback ?? p.dataset ?? ""}`;
    case "draft": return `draft for ${p.to ?? ""}`;
    case "approve": return `approved, sha256 ${String(p.sha256 ?? "").slice(0, 12)}`;
    case "send": return `sent to outbox${p.flexprice_synced === false ? " (Flexprice sync pending)" : ""}`;
    case "send_refused": return "send refused: text differs from approval";
    case "cost": return `${(p.tokens_in ?? 0) + (p.tokens_out ?? 0)} tokens, ${p.tasks ?? 0} tasks`;
    case "credit_spend": return `${p.credits} credits for ${p.reason ?? ""}`;
    default: return JSON.stringify(p).slice(0, 120);
  }
}

export const clock = (ts: string) => { const d = new Date(ts); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour12: false }); };

export type GNode = { id: string; type: string; r: number; text: string; ds?: string; label?: string; x: number; y: number; vx: number; vy: number };
export type GLink = { a: string; b: string; type: "own" | "conflict" };
type Raw = Omit<GNode, "x" | "y" | "vx" | "vy">;

export function graphData(mems: Memory[], drafts: Draft[], conflicts: Conflict[]) {
  const nodes: Raw[] = [], links: GLink[] = [], seen = new Set<string>();
  const add = (n: Raw) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  for (const m of mems) {
    add({ id: `ds:${m.dataset}`, type: "hub", r: 15, label: pretty(m.dataset) || m.dataset, text: `Dataset ${m.dataset}` });
    add({ id: `m:${m.id}`, type: m.kind, r: 7, text: m.text, ds: m.dataset });
    links.push({ a: `ds:${m.dataset}`, b: `m:${m.id}`, type: "own" });
  }
  for (const d of drafts.filter((x) => x.status === "pending")) add({ id: `d:${d.id}`, type: "draft", r: 9, text: `Draft to ${d.to_name}: ${d.subject}` });
  for (const c of conflicts) if (c.draftId && seen.has(`d:${c.draftId}`) && seen.has(`m:${c.memId}`)) links.push({ a: `d:${c.draftId}`, b: `m:${c.memId}`, type: "conflict" });
  return { nodes, links };
}

// A conversation is every memory that shares a source. Where the source names Prism (the Recall.ai recording bot)
// it is a recorded meeting; anything else was pasted into Band. keep-api cannot see Band, so this is the only honest signal.
export type Convo = { source: string; origin: "prism" | "pasted"; promises: number; risks: number; claims: number; other: number; datasets: string[]; at: string };
export function conversations(mems: Memory[]): Convo[] {
  const by = new Map<string, Convo>();
  for (const m of mems) {
    const src = (m.source ?? "").trim();
    if (!src || m.dataset === "eng_security" || m.kind === "decision" || /metrics/i.test(src)) continue;
    const c = by.get(src) ?? { source: src, origin: /prism|recall/i.test(src) ? "prism" : "pasted", promises: 0, risks: 0, claims: 0, other: 0, datasets: [], at: m.created_at };
    if (m.kind === "promise") c.promises++; else if (m.kind === "risk") c.risks++; else if (m.kind === "claim") c.claims++; else c.other++;
    if (!c.datasets.includes(m.dataset)) c.datasets.push(m.dataset);
    if (m.created_at > c.at) c.at = m.created_at;
    by.set(src, c);
  }
  return [...by.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
}
