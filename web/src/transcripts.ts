// The seed conversations, bundled at build time (Vite raw imports). All synthetic.
export type Line = { who: string; role: string; text: string };
export type Convo = { id: string; source: string; title: string; date: string; kind: string; people: string; counterparty: string; lines: Line[]; raw: string };

const files = import.meta.glob("../../data/seed/*_{call,meeting,ticket}_*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UTTER = /^\[u\d+\]\s+(.+?)\s+\((.+?)\):\s*(.*)$/;

export function parse(id: string, raw: string): Convo {
  const m = id.match(/^(\d+_[a-z]+_([a-z]+))_(\d{4})-(\d{2})-(\d{2})$/);
  const rows = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = rows[0] ?? id;
  const title = head.startsWith("# ") ? head.slice(2).replace(/,\s*\w{3} \d{1,2}, \d{4}.*$/, "") : head.startsWith("Support ticket") ? `Support ticket: ${head.match(/\((.+?)\)/)?.[1] ?? "customer"}` : head.split(",")[0];
  const people = rows.find((l) => l.startsWith("Participants:"))?.slice(13).trim() ?? "";
  const lines: Line[] = rows.slice(1).filter((l) => !l.startsWith("Participants:")).map((l) => {
    const u = l.match(UTTER);
    return u ? { who: u[1], role: u[2], text: u[3] } : { who: "", role: "", text: l.replace(/^"|"$/g, "") };
  });
  const counterparty = lines.find((l) => l.role && l.role !== "us")?.who ?? head.match(/from (.+?) \(/)?.[1] ?? "them";
  return {
    id, source: m?.[1] ?? id, title, kind: m?.[2] ?? "conversation", people, counterparty, lines, raw,
    date: m ? `${MONTHS[Number(m[4]) - 1]} ${Number(m[5])}` : "",
  };
}

// Newest first, so today's conversations sit at the top.
export const CONVOS: Convo[] = Object.entries(files)
  .map(([path, raw]) => parse(path.split("/").pop()!.replace(/\.md$/, ""), raw))
  .sort((a, b) => b.id.slice(-10).localeCompare(a.id.slice(-10)) || a.id.localeCompare(b.id));
