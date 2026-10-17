import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { signInWithGoogle, signOut, switchUser } from "./actions";
import { NavLink } from "./client";
import { getPoints, getUser, USERS } from "@/lib/favours";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elmina Neighbours · Sime Darby Property",
  description: "Accept favours from neighbours, track their status and earn points.",
};

const SIDEBAR_BUTTON =
  "min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold text-on-dark transition-colors duration-200 ease-arrive hover:bg-white/20";

async function Account() {
  const cookieStore = await cookies();
  const user = getUser(cookieStore.get("uid")?.value);
  // Supabase checks token expiry with Date.now(), so this must run at request time, not in a cookie-aware prerender.
  await connection();
  const {
    data: { user: authUser },
  } = await createClient(cookieStore).auth.getUser();
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 md:flex-col md:items-stretch">
      {authUser ? (
        <form action={signOut} className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
          <span className="truncate text-sm text-on-dark-muted">{authUser.email}</span>
          <button className={SIDEBAR_BUTTON}>Sign out</button>
        </form>
      ) : (
        <form action={signInWithGoogle}>
          <button className={`${SIDEBAR_BUTTON} w-full`}>Sign in with Google</button>
        </form>
      )}
      <p className="flex flex-col-reverse">
        <span className="text-sm text-on-dark-muted">Your points</span>
        <span className="text-3xl font-bold tabular-nums">
          {getPoints(user.id)} <span className="text-base font-semibold text-gold">pts</span>
        </span>
      </p>
      <form action={switchUser} className="flex min-w-56 flex-1 items-end gap-2 md:min-w-0 md:flex-col md:items-stretch">
        <label className="flex-1 space-y-1">
          <span className="block text-sm text-on-dark-muted">Viewing as (demo)</span>
          <select
            name="uid"
            defaultValue={user.id}
            key={user.id}
            className="min-h-11 w-full rounded-xl bg-white/10 px-3 text-sm text-on-dark [color-scheme:dark]"
          >
            {USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button className={SIDEBAR_BUTTON}>
          Switch
        </button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col md:flex-row">
        <aside className="flex flex-col gap-4 bg-deep p-4 text-on-dark md:sticky md:top-0 md:h-svh md:w-64 md:shrink-0 md:gap-8 md:p-6">
          <p className="flex flex-wrap items-baseline gap-x-2 leading-tight md:block">
            <span className="text-lg font-bold md:block">Elmina Neighbours</span>
            <span className="text-sm text-brand-bright">Sime Darby Property</span>
          </p>
          <div className="md:order-last md:mt-auto">
            <Suspense fallback={<div className="h-20 md:h-40" />}>
              <Account />
            </Suspense>
          </div>
          <nav aria-label="Primary" className="flex gap-1 md:flex-col">
            <NavLink href="/">Open favours</NavLink>
            <NavLink href="/my-favours">My favours</NavLink>
          </nav>
        </aside>
        <main className="w-full max-w-5xl min-w-0 flex-1 p-4 sm:p-6 md:p-10">{children}</main>
      </body>
    </html>
  );
}
