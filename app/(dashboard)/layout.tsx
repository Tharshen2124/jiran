import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "../actions";
import { NavLink } from "../client";
import { getPoints, getUser } from "@/lib/favours";
import { createClient } from "@/utils/supabase/server";

const SIDEBAR_BUTTON =
  "min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold text-on-dark transition-colors duration-200 ease-arrive hover:bg-white/20";

const ROLE_LABEL = { resident: "Resident", ra: "Resident administration", guard: "Security guard" } as const;

async function Account() {
  const cookieStore = await cookies();
  const user = getUser(cookieStore.get("uid")?.value);
  // Supabase checks token expiry with Date.now(), so this must run at request time, not in a cookie-aware prerender.
  await connection();
  const supabase = createClient(cookieStore);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");
  // RLS only returns the caller's own row.
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", authUser.id).single();
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 md:flex-col md:items-stretch">
      <form action={signOut} className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
        <p className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-on-dark">{profile?.full_name ?? authUser.email}</span>
          <span className="block text-sm text-brand-bright">{ROLE_LABEL[(profile?.role ?? "resident") as keyof typeof ROLE_LABEL]}</span>
        </p>
        <button className={SIDEBAR_BUTTON}>Sign out</button>
      </form>
      <p className="flex flex-col-reverse">
        <span className="text-sm text-on-dark-muted">Your points</span>
        <span className="text-3xl font-bold tabular-nums">
          {getPoints(user.id)} <span className="text-base font-semibold text-gold">pts</span>
        </span>
      </p>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex flex-col gap-4 bg-deep p-4 text-on-dark md:sticky md:top-0 md:h-svh md:w-64 md:shrink-0 md:gap-8 md:p-6">
        <p className="flex flex-wrap items-baseline gap-x-2 leading-tight md:block">
          <span className="text-lg font-bold md:block">Jiran</span>
          <span className="text-sm text-brand-bright">City of Elmina · Sime Darby Property</span>
        </p>
        <div className="md:order-last md:mt-auto">
          <Suspense fallback={<div className="h-20 md:h-40" />}>
            <Account />
          </Suspense>
        </div>
        <nav aria-label="Primary" className="flex gap-1 md:flex-col">
          <NavLink href="/favours">Open favours</NavLink>
          <NavLink href="/my-favours">My favours</NavLink>
        </nav>
      </aside>
      <main className="w-full max-w-5xl min-w-0 flex-1 p-4 sm:p-6 md:p-10">{children}</main>
    </div>
  );
}
