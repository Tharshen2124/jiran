"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accept, boost, setStatus, type Status } from "@/lib/favours";
import { arrive, nextTime, start } from "@/lib/guardian-angel";
import { redeem } from "@/lib/marketplace";
import { createClient, getSession } from "@/utils/supabase/server";

export type ActionState = { error?: string } | undefined;

async function run(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  refresh();
}

export async function acceptFavour(_: ActionState, form: FormData) {
  const { supabase, user } = await getSession();
  return run(() => accept(supabase, String(form.get("id")), user.sub));
}

export async function updateStatus(_: ActionState, form: FormData) {
  const { supabase } = await getSession();
  return run(() => setStatus(supabase, String(form.get("id")), String(form.get("to")) as Status));
}

export async function boostFavour(_: ActionState, form: FormData) {
  const { supabase } = await getSession();
  return run(() => boost(supabase, String(form.get("id")), Number(form.get("points")), String(form.get("reward")) || null));
}

export async function startGuardianAngel(_: ActionState, form: FormData) {
  const { supabase, user } = await getSession();
  return run(() => start(supabase, user.sub, String(form.get("house")), nextTime(String(form.get("eta")))));
}

export async function arriveHome() {
  const { supabase, user } = await getSession();
  return run(() => arrive(supabase, user.sub));
}

export type RedeemState = { error?: string; code?: string } | undefined;

export async function redeemReward(_: RedeemState, form: FormData): Promise<RedeemState> {
  const { supabase } = await getSession();
  let code;
  try {
    code = await redeem(supabase, String(form.get("id")));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  refresh();
  return { code };
}

export type AuthState = { error?: string; message?: string } | undefined;

const origin = async () => (await headers()).get("origin");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const { error } = await createClient(await cookies()).auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: error.message };
  redirect("/favours");
}

// New accounts are always residents (see the profiles migration); RA and guard roles are granted by an admin.
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { data, error } = await createClient(await cookies()).auth.signUp({
    email: String(form.get("email")),
    password: String(form.get("password")),
    options: {
      data: { full_name: String(form.get("full_name")).trim() || null },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/favours");
  return { message: "Check your inbox for a confirmation link, then come back to sign in." };
}

export async function signInWithGoogle() {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = createClient(await cookies());
  // Stop live sharing first: once signed out, the browser is no longer allowed to delete its row.
  const { data } = await supabase.auth.getClaims();
  if (data) await supabase.from("live_locations").delete().eq("user_id", data.claims.sub);
  await supabase.auth.signOut();
  redirect("/");
}
