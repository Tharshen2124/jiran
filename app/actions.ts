"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { accept, getUser, setStatus, USERS, type Status } from "@/lib/favours";

export type ActionState = { error?: string } | undefined;

// ponytail: demo identity from a cookie, no auth. Replace with real sessions before anyone else can reach this.
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

export async function switchUser(form: FormData) {
  const id = String(form.get("uid"));
  if (!USERS.some((u) => u.id === id)) return;
  (await cookies()).set("uid", id);
}
