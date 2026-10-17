"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accept, getUser, setStatus, type Status } from "@/lib/favours";
import { createClient } from "@/utils/supabase/server";

export type ActionState = { error?: string } | undefined;

// ponytail: favours still run on a demo identity (a leftover `uid` cookie, else the first demo user), not the Supabase session.
// Key them to the signed-in user once favours live in the database.
async function currentUser() {
  return getUser((await cookies()).get("uid")?.value);
}

async function run(fn: () => void): Promise<ActionState> {
  try {
    fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  refresh();
}

export async function acceptFavour(_: ActionState, form: FormData) {
  const user = await currentUser();
  return run(() => accept(String(form.get("id")), user.id));
}

export async function updateStatus(_: ActionState, form: FormData) {
  const user = await currentUser();
  return run(() => setStatus(String(form.get("id")), user.id, String(form.get("to")) as Status));
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
  await createClient(await cookies()).auth.signOut();
  redirect("/");
}
