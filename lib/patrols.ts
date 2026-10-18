import type { SupabaseClient } from "@supabase/supabase-js";

// A section counts as patrolled for this long after a guard passes its checkpoint.
// ponytail: a rolling window, not shifts or rounds; add those if the RA schedules patrols.
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

// Street order: 10/5 before 10/10, West before East.
const byStreet = (a: { jalan: string; section: string }, b: { jalan: string; section: string }) =>
  a.jalan.localeCompare(b.jalan, undefined, { numeric: true }) || b.section.localeCompare(a.section);

export type ReportRow = { id: string; jalan: string; section: string; patrols: number; lastAt: string | null; missed: number };

// Malaysia is UTC+8 all year, so a month runs from local midnight on the 1st without any DST maths.
const MYT_MS = 8 * 60 * 60 * 1000;

// "2026-10" for the current month in Malaysia.
export const thisMonth = () => new Date(Date.now() + MYT_MS).toISOString().slice(0, 7);

// A "YYYY-MM" month from the URL, or this month.
export const toMonth = (v: unknown) => (typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : thisMonth());

// One row per checkpoint for a "YYYY-MM" month. Missed counts the PATROL_WINDOW_MS rounds so far that month with no pass.
export async function monthlyReport(db: SupabaseClient, month: string): Promise<ReportRow[]> {
  const [y, m] = month.split("-").map(Number);
  const from = Date.UTC(y, m - 1, 1) - MYT_MS;
  const to = Date.UTC(y, m, 1) - MYT_MS;
  const rounds = Math.max(0, Math.ceil((Math.min(Date.now(), to) - from) / PATROL_WINDOW_MS));
  const [checkpoints, report] = await Promise.all([
    db.from("checkpoints").select("id, jalan, section"),
    db.rpc("patrol_report", {
      from_at: new Date(from).toISOString(),
      to_at: new Date(to).toISOString(),
      slot: `${PATROL_WINDOW_MS / 1000} seconds`,
    }),
  ]);
  if (checkpoints.error) throw checkpoints.error;
  if (report.error) throw report.error;
  const byId = new Map((report.data as { checkpoint_id: string; patrols: number; last_at: string; rounds: number }[]).map((r) => [r.checkpoint_id, r]));
  return checkpoints.data
    .map((c) => {
      const r = byId.get(c.id);
      return { ...c, patrols: r?.patrols ?? 0, lastAt: r?.last_at ?? null, missed: rounds - (r?.rounds ?? 0) };
    })
    .sort(byStreet);
}
