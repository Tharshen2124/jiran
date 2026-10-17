import { Suspense } from "react";
import { signOut } from "../actions";
import { LiveLocationToggle, NavLink } from "../client";
import { getSession } from "@/utils/supabase/server";

const SIDEBAR_BUTTON =
  "min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold text-on-dark transition-colors duration-200 ease-arrive hover:bg-white/20";

const ROLE_LABEL = { resident: "Resident", ra: "Resident administration", guard: "Security guard" } as const;

async function Account() {
  const { supabase, user } = await getSession();
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.sub).single();
  const name = profile?.full_name ?? user.email ?? "Resident";
  const identity = (
    <form action={signOut} className="flex flex-col gap-3">
      <p className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-on-dark">{name}</span>
        <span className="block text-sm text-brand-bright">{ROLE_LABEL[(profile?.role ?? "resident") as keyof typeof ROLE_LABEL]}</span>
      </p>
      <button className={SIDEBAR_BUTTON}>Sign out</button>
    </form>
  );
  return (
    <>
      <LiveLocationToggle userId={user.sub} />
      <div className="hidden md:block">{identity}</div>
      {/* On phones the name and sign-out move into a menu. */}
      <button
        popoverTarget="account-menu"
        aria-label={`Account: ${name}`}
        className="grid size-11 place-items-center rounded-full bg-white/10 font-bold text-on-dark transition-colors duration-200 ease-arrive hover:bg-white/20 md:hidden"
      >
        {name.charAt(0).toUpperCase()}
      </button>
      <div id="account-menu" popover="auto" className="inset-auto top-16 right-4 w-64 rounded-2xl bg-deep p-4 text-on-dark ring-1 ring-white/15 md:hidden">
        {identity}
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex items-center justify-between gap-4 bg-deep px-4 py-2 text-on-dark md:sticky md:top-0 md:h-svh md:w-64 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-8 md:p-6">
        <p className="leading-tight">
          <span className="block text-lg font-bold">Jiran</span>
          <span className="hidden text-sm text-brand-bright md:block">City of Elmina · Sime Darby Property</span>
        </p>
        <div className="flex items-center gap-2 md:order-last md:mt-auto md:flex-col md:items-stretch md:gap-6">
          <Suspense fallback={<div className="size-11 md:h-40 md:w-auto" />}>
            <Account />
          </Suspense>
        </div>
        {/* A bottom tab bar on phones, part of the sidebar from md up. */}
        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-1 bg-deep p-2 md:static md:flex md:flex-col md:p-0">
          <NavLink href="/favours">Open favours</NavLink>
          <NavLink href="/my-favours">My favours</NavLink>
        </nav>
      </aside>
      <main className="w-full max-w-5xl min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:p-10">{children}</main>
    </div>
  );
}
