import type { SupabaseClient } from "@supabase/supabase-js";

export type Status = "open" | "accepted" | "in_progress" | "completed" | "cancelled";

type Person = { full_name: string | null } | null;

export type Favour = {
  id: string;
  title: string;
  description: string;
  location: string;
  points: number;
  status: Status;
  created_at: string;
  updated_at: string;
  bumped_at: string | null;
  bump_points: number;
  boost_points: number;
  reward: { title: string; icon: string } | null;
  requester: Person;
  helper: Person;
};

// What the helper earns: the house's points plus whatever the RA added (public.redeem sums the same).
export const worth = (f: { points: number; boost_points: number }) => f.points + f.boost_points;

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Where a helper can move a favour from each status. The database enforces the same moves (private.check_favour_transition).
const NEXT: Partial<Record<Status, Status[]>> = {
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

export const nextStatuses = (s: Status): Status[] => NEXT[s] ?? [];

const FIELDS =
  "id, title, description, location, points, status, created_at, updated_at, bumped_at, bump_points, boost_points, reward:rewards(title, icon), requester:profiles!requester_id(full_name), helper:profiles!helper_id(full_name)";

async function rows(query: PromiseLike<{ data: unknown; error: Error | null }>) {
  const { data, error } = await query;
  if (error) throw error;
  return data as Favour[];
}

export const listOpen = (db: SupabaseClient, userId: string) =>
  // House dashboards post favours with no requester_id; neq alone would drop those NULL rows.
  // feed_at is when it was posted or last bumped, so a bumped favour comes back to the top.
  rows(db.from("favours").select(FIELDS).eq("status", "open").or(`requester_id.is.null,requester_id.neq.${userId}`).order("feed_at", { ascending: false }));

export const listHelping = (db: SupabaseClient, userId: string) =>
  rows(db.from("favours").select(FIELDS).eq("helper_id", userId).order("updated_at", { ascending: false }));

export const listRequested = (db: SupabaseClient, userId: string) =>
  rows(db.from("favours").select(FIELDS).eq("requester_id", userId).order("updated_at", { ascending: false }));

// The RA's list: every open favour, oldest first, with how many whole days it has waited for a helper.
export const STALE_DAYS = 7;

export async function listUnclaimed(db: SupabaseClient) {
  const favours = await rows(db.from("favours").select(FIELDS).eq("status", "open").order("created_at"));
  const now = Date.now();
  return favours.map((f) => ({ ...f, days: Math.floor((now - Date.parse(f.created_at)) / 86_400_000) }));
}

export async function getPoints(db: SupabaseClient, userId: string) {
  const { data, error } = await db.from("favours").select("points, boost_points").eq("helper_id", userId).eq("status", "completed");
  if (error) throw error;
  return data.reduce((n, f) => n + worth(f), 0);
}

// RLS only matches open favours or ones you help with, and the database rejects invalid status moves.
async function update(db: SupabaseClient, id: string, patch: { status: Status; helper_id?: string }, missing: string) {
  const { data, error } = await db.from("favours").update(patch).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error(missing);
}

export const accept = (db: SupabaseClient, id: string, userId: string) =>
  update(db, id, { status: "accepted", helper_id: userId }, "Someone else already accepted this favour");

export const setStatus = (db: SupabaseClient, id: string, to: Status) =>
  update(db, id, { status: to }, "Only the helper can update this favour");

// Only the RA, and only while the favour is open (public.boost_favour checks both).
export async function boost(db: SupabaseClient, id: string, extra: number, rewardId: string | null) {
  const { error } = await db.rpc("boost_favour", { favour: id, extra, reward: rewardId });
  if (error) throw new Error(error.message);
}
