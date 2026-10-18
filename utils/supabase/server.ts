import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; proxy.ts refreshes sessions instead.
        }
      },
    },
  });
};

// The signed-in user and a client acting as them, read once per request. Redirects to /login when signed out.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  // Supabase checks token expiry with Date.now(), so this must run at request time, not in a cookie-aware prerender.
  await connection();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/login");
  return { supabase, user: data.claims };
});

export type Role = "resident" | "ra" | "guard";

// The signed-in user's profile, read once per request (the layout and pages both need the role).
export const getProfile = cache(async () => {
  const session = await getSession();
  const { data } = await session.supabase.from("profiles").select("role, full_name").eq("id", session.user.sub).single();
  return { ...session, role: (data?.role ?? "resident") as Role, fullName: (data?.full_name ?? null) as string | null };
});
