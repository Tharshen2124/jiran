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
  updated_at: string;
  requester: Person;
  helper: Person;
};

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
  "id, title, description, location, points, status, updated_at, requester:profiles!requester_id(full_name), helper:profiles!helper_id(full_name)";

async function rows(query: PromiseLike<{ data: unknown; error: Error | null }>) {
  const { data, error } = await query;
  if (error) throw error;
  return data as Favour[];
}

export const listOpen = (db: SupabaseClient, userId: string) =>
  // House dashboards post favours with no requester_id; neq alone would drop those NULL rows.
  rows(db.from("favours").select(FIELDS).eq("status", "open").or(`requester_id.is.null,requester_id.neq.${userId}`).order("created_at", { ascending: false }));

export const listHelping = (db: SupabaseClient, userId: string) =>
  rows(db.from("favours").select(FIELDS).eq("helper_id", userId).order("updated_at", { ascending: false }));

export const listRequested = (db: SupabaseClient, userId: string) =>
  rows(db.from("favours").select(FIELDS).eq("requester_id", userId).order("updated_at", { ascending: false }));

export async function getPoints(db: SupabaseClient, userId: string) {
  const { data, error } = await db.from("favours").select("points").eq("helper_id", userId).eq("status", "completed");
  if (error) throw error;
  return data.reduce((n, f) => n + f.points, 0);
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
