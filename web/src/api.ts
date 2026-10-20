// keep-api client. Every string that comes back is untrusted: components render it as React text only.
export type Memory = { id: string; dataset: string; kind: string; text: string; source?: string | null; created_at: string };
export type Draft = { id: string; to_name: string; subject: string; body: string; status: string; approved_sha256?: string | null };
export type Agent = { agent: string; harness?: string; tokens_in: number; tokens_out: number; tasks: number; usd?: number | null };
export type Ev = { id: number; ts: string; type: string; agent?: string; payload?: Record<string, unknown> };
export type Gate = { feature: string; allow: boolean; cost?: number; balance?: number; source?: string };
export type Snapshot = { mems: Memory[]; drafts: Draft[]; agents: Agent[]; events: Ev[]; balance: number; start: number; gate: Gate; backend: string };

export const DEMO = new URLSearchParams(location.search).has("demo");
export const STILL = new URLSearchParams(location.search).has("still");

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const DEMO_DATA: Snapshot = {
  mems: [
    { id: "m1", dataset: "rel_northline", kind: "promise", text: "Founder promised Sarah Chen the retention cohort by Oct 17.", source: "prism: Northline partner meeting Oct 13", created_at: ago(120) },
    { id: "m2", dataset: "rel_acme", kind: "promise", text: "SSO fix promised to Acme by Friday.", source: "prism: Acme call Oct 13", created_at: ago(118) },
    { id: "m3", dataset: "rel_acme", kind: "risk", text: "Acme will look at alternatives if SSO slips: churn risk this quarter.", source: "prism: Acme call Oct 13", created_at: ago(117) },
    { id: "m4", dataset: "company", kind: "claim", text: "Metric: weekly active workspaces grew 18 percent.", source: "metrics.json", created_at: ago(90) },
    { id: "m6", dataset: "rel_acme", kind: "risk", text: "Acme reported the CSV export shows another customer's rows.", source: "pasted: Acme support ticket Oct 20", created_at: ago(40) },
    { id: "m7", dataset: "company", kind: "decision", text: "Security fixes need a clean Snyk rescan before Done.", source: "chief of staff", created_at: ago(35) },
    { id: "m5", dataset: "eng_security", kind: "finding", text: "Raw SQL string in CSV export path (seen 2 times).", source: "snyk code", created_at: ago(30) },
  ],
  drafts: [
    { id: "d1", to_name: "Sarah Chen", subject: "Follow up: retention cohort", body: "As promised on Oct 13, here is the retention cohort. We see no churn risk this quarter and Acme is expanding.", status: "pending" },
    { id: "d2", to_name: "Acme Logistics", subject: "CSV export fix shipped", body: "The export fix is live and verified by a clean security scan.", status: "approved", approved_sha256: "9f2c7a1be04d3358a6c1f0d9e87b24c5d3a9106b7e48f2c1ad05b39e6c7f8a12" },
  ],
  agents: [
    { agent: "chief_of_staff", harness: "claude-code", tokens_in: 18400, tokens_out: 5200, tasks: 6, usd: 0.41 },
    { agent: "drafter", harness: "codex", tokens_in: 9100, tokens_out: 3300, tasks: 3, usd: 0.22 },
    { agent: "brain", harness: "langgraph", tokens_in: 14000, tokens_out: 2100, tasks: 4, usd: 0.16 },
  ],
  events: [
    { id: 1, ts: ago(5), type: "remember", agent: "listener", payload: { dataset: "rel_northline", kind: "promise" } },
    { id: 2, ts: ago(4), type: "recall", agent: "drafter", payload: { query: "open promises for Northline", n: 2 } },
    { id: 3, ts: ago(3), type: "draft", agent: "drafter", payload: { to: "Sarah Chen" } },
    { id: 4, ts: ago(2), type: "cost", agent: "brain", payload: { tokens_in: 4000, tokens_out: 600, tasks: 1 } },
    { id: 5, ts: ago(1.5), type: "approve", agent: "chief_of_staff", payload: { id: "d2", sha256: "9f2c7a1be04d3358a6c1f0d9e87b24c5" } },
    { id: 6, ts: ago(1), type: "send", agent: "chief_of_staff", payload: { id: "d2", flexprice_synced: true } },
    { id: 7, ts: ago(0.8), type: "forget", agent: "brain", payload: { dataset: "rel_acme" } },
    { id: 8, ts: ago(0.6), type: "improve", agent: "brain", payload: { dataset: "rel_acme", feedback: "Acme renewed for 12 months" } },
  ],
  balance: 140, start: 1000, gate: { feature: "deep_research", allow: false, cost: 200, balance: 140 }, backend: "LocalBackend (demo)",
};

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export async function load(): Promise<Snapshot> {
  if (DEMO) return structuredClone(DEMO_DATA);
  const [m, d, u, c, e, g, hl] = await Promise.all([
    get<{ memories?: Memory[] }>("/memories"), get<{ drafts?: Draft[] }>("/drafts"), get<{ agents?: Agent[] }>("/usage"),
    get<{ balance?: number; start?: number }>("/credits"), get<{ events?: Ev[] }>("/events"), get<Gate>("/gate/deep_research"), get<{ backend?: string }>("/health"),
  ]);
  return { mems: m.memories ?? [], drafts: d.drafts ?? [], agents: u.agents ?? [], events: e.events ?? [], balance: Number(c.balance ?? 0), start: Number(c.start || 1000), gate: g, backend: hl.backend ?? "unknown" };
}
