import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "../../client";
import { PageHeader, Stats } from "../../ui";
import { monthlyReport, PATROL_WINDOW_MS, thisMonth, toMonth } from "@/lib/patrols";
import { getProfile, HOME } from "@/utils/supabase/server";

const HOURS = PATROL_WINDOW_MS / 3_600_000;

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const monthName = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: "UTC" });

// The last 12 months, newest first, as "YYYY-MM".
function recentMonths() {
  const [y, m] = thisMonth().split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
}

const label = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`));

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 ease-arrive";
const TH = "px-4 py-3 text-xs font-semibold tracking-[0.1em] text-ink-muted uppercase";
const TD = "border-t border-line px-4 py-3";

async function Report({ searchParams }: { searchParams: PageProps<"/report">["searchParams"] }) {
  const [params, { supabase, role }] = await Promise.all([searchParams, getProfile()]);
  if (role !== "ra") redirect(HOME[role]);
  const month = toMonth(params.month);
  const rows = await monthlyReport(supabase, month);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <form className="flex gap-2">
          <label htmlFor="month" className="sr-only">Month</label>
          <select id="month" name="month" defaultValue={month} className="min-h-11 rounded-xl border border-line bg-surface px-4">
            {recentMonths().map((m) => (
              <option key={m} value={m}>{label(m)}</option>
            ))}
          </select>
          <button className={`${BUTTON} bg-ink text-surface hover:bg-deep`}>Show</button>
        </form>
        <p className="flex gap-2">
          <a href={`/report/csv?month=${month}`} download className={`${BUTTON} bg-surface text-ink hover:bg-surface-2`}>Download CSV</a>
          <PrintButton className={`${BUTTON} bg-brand text-white hover:bg-brand-strong`}>Save as PDF</PrintButton>
        </p>
      </div>

      <h2 className="text-2xl">{label(month)}</h2>
      <Stats
        items={[
          ["Patrols", rows.reduce((n, r) => n + r.patrols, 0)],
          ["Rounds missed", rows.reduce((n, r) => n + r.missed, 0)],
          ["Checkpoints never patrolled", rows.filter((r) => !r.patrols).length],
        ]}
      />

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr>
              <th className={TH}>Jalan</th>
              <th className={TH}>Section</th>
              <th className={`${TH} text-right`}>Patrols</th>
              <th className={TH}>Last patrolled</th>
              <th className={`${TH} text-right`}>Rounds missed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className={`${TD} font-semibold`}>{r.jalan}</th>
                <td className={TD}>{r.section}</td>
                <td className={`${TD} text-right tabular-nums`}>{r.patrols}</td>
                <td className={TD}>
                  {r.lastAt ? (
                    <time dateTime={r.lastAt} className="tabular-nums">{fmt.format(new Date(r.lastAt))}</time>
                  ) : (
                    <span className="text-error">Never</span>
                  )}
                </td>
                <td className={`${TD} text-right tabular-nums`}>{r.missed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/report">) {
  return (
    <>
      <PageHeader title="Patrol report">
        How often guards passed each checkpoint in a month. The month is split into {HOURS}-hour rounds, and a round is missed
        when no guard passed the checkpoint during it.
      </PageHeader>
      <Suspense fallback={<div aria-busy className="h-[60svh] rounded-2xl bg-surface" />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}
