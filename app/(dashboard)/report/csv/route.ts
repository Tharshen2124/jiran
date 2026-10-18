import type { NextRequest } from "next/server";
import { monthlyReport, toMonth } from "@/lib/patrols";
import { getProfile } from "@/utils/supabase/server";

// "2026-10-18 15:05:00" in Malaysian time, which spreadsheets read as a date.
const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Kuala_Lumpur" });

const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;

export async function GET(request: NextRequest) {
  const { supabase, role } = await getProfile();
  if (role !== "ra") return new Response("Only the resident administration can export patrol reports.", { status: 403 });
  const month = toMonth(request.nextUrl.searchParams.get("month"));
  const rows = await monthlyReport(supabase, month);
  const csv = [
    ["Jalan", "Section", "Patrols", "Last patrolled", "Rounds missed"],
    ...rows.map((r) => [r.jalan, r.section, r.patrols, r.lastAt ? fmt.format(new Date(r.lastAt)) : "Never", r.missed]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patrol-report-${month}.csv"`,
    },
  });
}
