import type { SupabaseClient } from "@supabase/supabase-js";

// A section counts as patrolled for this long after a guard passes its checkpoint.
// ponytail: a rolling window, not the report's ROUNDS; switch to the current round if guards need to see what's left of it.
export const PATROL_WINDOW_MS = 2 * 60 * 60 * 1000;

export type Section = {
  id: string;
  jalan: string;
  section: string;
  lat: number;
  lng: number;
  path: [lng: number, lat: number][];
  lastAt: string | null;
  lastBy: string | null;
  patrolled: boolean;
};

type Row = Omit<Section, "lastAt" | "lastBy" | "patrolled"> & {
  patrol_events: { created_at: string; guard: { full_name: string | null } | null }[];
};

// Every section with its latest patrol, in street order (10/5 before 10/10).
export async function listSections(db: SupabaseClient): Promise<Section[]> {
  const { data, error } = await db
    .from("checkpoints")
    .select("id, jalan, section, lat, lng, path, patrol_events(created_at, guard:profiles(full_name))")
    .order("created_at", { referencedTable: "patrol_events", ascending: false })
    .limit(1, { referencedTable: "patrol_events" });
  if (error) throw error;
  return (data as unknown as Row[])
    .map(({ patrol_events: [last], ...s }) => ({
      ...s,
      lastAt: last?.created_at ?? null,
      lastBy: last?.guard?.full_name ?? null,
      patrolled: !!last && Date.now() - Date.parse(last.created_at) < PATROL_WINDOW_MS,
    }))
    .sort(byStreet);
}

// Street order: 10/5 before 10/10, then section A before B.
const byStreet = (a: { jalan: string; section: string }, b: { jalan: string; section: string }) =>
  a.jalan.localeCompare(b.jalan, undefined, { numeric: true }) || a.section.localeCompare(b.section);

// Guards patrol every checkpoint three times a day, each round in its own 8-hour window (Malaysian time). The patrol day
// starts at 4 am, so the midnight round belongs to the evening it starts on.
// ponytail: one fixed schedule for every estate; move it to the DB if the RA needs to change it.
export const ROUNDS = [
  ["Morning", "4 am–12 pm"],
  ["Afternoon", "12–8 pm"],
  ["Midnight", "8 pm–4 am"],
] as const;
const DAY_START_MS = 4 * 60 * 60 * 1000;
const ROUND_MS = (24 * 60 * 60 * 1000) / ROUNDS.length;

// Malaysia is UTC+8 all year, so a month runs from 4 am on the 1st without any DST maths.
const MYT_MS = 8 * 60 * 60 * 1000;

// "2026-10" for the current patrol month in Malaysia.
export const thisMonth = () => new Date(Date.now() + MYT_MS - DAY_START_MS).toISOString().slice(0, 7);

// A "YYYY-MM" month from the URL, or this month.
export const toMonth = (v: unknown) => (typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : thisMonth());

// Missed counts the rounds of each ROUNDS kind with no pass at the checkpoint.
export type ReportRow = { id: string; jalan: string; section: string; patrols: number; lastAt: string | null; missed: number[] };
// done: every checkpoint passed, partly: some, missed: none. now: under way, later: not started.
export type RoundStatus = "done" | "partly" | "missed" | "now" | "later";
export type ReportDay = { date: string; rounds: { status: RoundStatus; passed: number }[] };
export type RoundTotals = { done: number; partly: number; missed: number };

// A "YYYY-MM" month: one row per checkpoint, every day with how its ROUNDS went, and totals per kind of round. Totals
// only count full days (all their rounds over), so every kind has the same number of rounds while today is under way.
export async function monthlyReport(
  db: SupabaseClient,
  month: string,
): Promise<{ rows: ReportRow[]; days: ReportDay[]; fullDays: number; totals: RoundTotals[] }> {
  const [y, m] = month.split("-").map(Number);
  const from = Date.UTC(y, m - 1, 1) - MYT_MS + DAY_START_MS;
  const to = Date.UTC(y, m, 1) - MYT_MS + DAY_START_MS;
  const [checkpoints, report] = await Promise.all([
    db.from("checkpoints").select("id, jalan, section"),
    db.rpc("patrol_report", {
      from_at: new Date(from).toISOString(),
      to_at: new Date(to).toISOString(),
      slot: `${ROUND_MS / 1000} seconds`,
    }),
  ]);
  if (checkpoints.error) throw checkpoints.error;
  if (report.error) throw report.error;
  const data = report.data as { checkpoint_id: string; patrols: number; last_at: string; rounds: string[] }[];

  // passed[i] holds the checkpoints passed in the month's i-th round.
  const total = (to - from) / ROUND_MS;
  const passed = Array.from({ length: total }, () => new Set<string>());
  for (const r of data) for (const at of r.rounds) passed[Math.round((Date.parse(at) - from) / ROUND_MS)].add(r.checkpoint_id);
  const elapsed = (Date.now() - from) / ROUND_MS; // rounds since the month began
  const fullDays = Math.max(0, Math.min(total / ROUNDS.length, Math.floor(elapsed / ROUNDS.length)));

  const byId = new Map(data.map((r) => [r.checkpoint_id, r]));
  const rows = checkpoints.data
    .map((c) => {
      const r = byId.get(c.id);
      const missed = ROUNDS.map(() => 0);
      for (let i = 0; i < fullDays * ROUNDS.length; i++) if (!passed[i].has(c.id)) missed[i % ROUNDS.length]++;
      return { ...c, patrols: r?.patrols ?? 0, lastAt: r?.last_at ?? null, missed };
    })
    .sort(byStreet);

  const status = (i: number): RoundStatus =>
    i >= elapsed ? "later" : i + 1 > elapsed ? "now" : passed[i].size === rows.length ? "done" : passed[i].size ? "partly" : "missed";
  const days = Array.from({ length: total / ROUNDS.length }, (_, d) => ({
    date: new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10),
    rounds: ROUNDS.map((_, k) => {
      const i = d * ROUNDS.length + k;
      return { status: status(i), passed: passed[i].size };
    }),
  }));
  const totals = ROUNDS.map((_, k) => {
    const t: RoundTotals = { done: 0, partly: 0, missed: 0 };
    for (const d of days.slice(0, fullDays)) t[d.rounds[k].status as keyof RoundTotals]++;
    return t;
  });
  return { rows, days, fullDays, totals };
}
