import type { SupabaseClient } from "@supabase/supabase-js";

export type Trip = { eta: string; arrived_at: string | null };

// The resident's home (null until an admin links one), their latest trip home, and when this was read.
export async function getGuardianAngel(db: SupabaseClient, userId: string) {
  const [profile, trip] = await Promise.all([
    db.from("profiles").select("house:houses(id, address)").eq("id", userId).single(),
    db.from("guardian_angels").select("eta, arrived_at").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  if (trip.error) throw trip.error;
  return {
    house: profile.data.house as unknown as { id: string; address: string } | null,
    trip: trip.data as Trip | null,
    readAt: Date.now(),
  };
}

// "21:30" as the next time it's 9:30 pm in Malaysia (UTC+8 all year): today, or tomorrow if that's passed.
export function nextTime(hhmm: string, now = Date.now()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) throw new Error("Pick the time you expect to get home.");
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const at = Date.parse(`${today}T${hhmm}:00+08:00`);
  return new Date(at > now ? at : at + 24 * 60 * 60 * 1000);
}

// Starting again replaces the last trip. RLS only accepts the resident's own house.
export async function start(db: SupabaseClient, userId: string, houseId: string, eta: Date) {
  const { error } = await db.from("guardian_angels").upsert({
    user_id: userId,
    house_id: houseId,
    eta: eta.toISOString(),
    started_at: new Date().toISOString(),
    arrived_at: null,
  });
  if (error) throw new Error(error.message);
}

export async function arrive(db: SupabaseClient, userId: string) {
  const { error } = await db
    .from("guardian_angels")
    .update({ arrived_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("arrived_at", null);
  if (error) throw new Error(error.message);
}
