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
    .sort((a, b) => a.jalan.localeCompare(b.jalan, undefined, { numeric: true }) || b.section.localeCompare(a.section));
}
