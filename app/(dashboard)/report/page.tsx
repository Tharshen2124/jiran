import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "../../client";
import { PageHeader } from "../../ui";
import { monthlyReport, ROUNDS, thisMonth, toMonth, type ReportDay, type RoundStatus, type RoundTotals } from "@/lib/patrols";
import { getProfile, HOME } from "@/utils/supabase/server";

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const monthName = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// The last 12 months, newest first, as "YYYY-MM".
function recentMonths() {
  const [y, m] = thisMonth().split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
}

const label = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`));

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 ease-arrive";
// Breakpoints follow the report's own width (@container below), not the window: the sidebar takes 16rem from md up.
const TH = "px-1.5 py-3 text-xs font-semibold text-ink-muted @xs:px-2 @xl:px-4 @xl:tracking-[0.1em] @xl:uppercase";
const TD = "border-t border-line px-1.5 py-3 @xs:px-2 @xl:px-4";

const LABEL: Record<RoundStatus, string> = { done: "Done", partly: "Partly done", missed: "Missed", now: "Under way", later: "Not yet" };
// Solid fills so a round reads at a glance, even as a sliver on a phone.
const FILL: Record<RoundStatus, string> = {
  done: "bg-success-ink text-white",
  partly: "bg-gold-ink text-white",
  missed: "bg-error text-white",
  now: "bg-ink text-surface",
  later: "bg-surface-2",
};

function RoundSummary({ name, hours, totals, of }: { name: string; hours: string; totals: RoundTotals; of: number }) {
  return (
    <li className="space-y-3 rounded-2xl bg-surface p-3 @xl:p-5">
      <h3 className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold @xl:text-lg">{name}</span>
        <span className="text-sm text-ink-muted">{hours}</span>
      </h3>
      <p className="text-sm text-ink-muted @xl:text-base">
        <span className="text-3xl font-bold tracking-tight text-ink tabular-nums @xl:text-4xl">{totals.done}</span> of {of}
        <span className="hidden @xl:inline"> done</span>
      </p>
      <p aria-hidden className="flex h-2 overflow-hidden rounded-full bg-surface-2">
        {(["done", "partly", "missed"] as const).map((s) => (
          <span key={s} className={FILL[s]} style={{ width: `${(totals[s] / (of || 1)) * 100}%` }} />
        ))}
      </p>
      <p className="text-sm text-ink-muted">
        <span className="block @xl:inline">
          {totals.partly} partly<span className="hidden @xl:inline"> done</span>
        </span>
        <span className="hidden @xl:inline"> · </span>
        <span className="block @xl:inline">{totals.missed} missed</span>
      </p>
    </li>
  );
}

// A phone only has room for the count; a wider calendar spells the round out.
function Round({ name, status, passed, of }: { name: string; status: RoundStatus; passed: number; of: number }) {
  const counted = status === "partly" || status === "now";
  return (
    <span className={`flex h-4 items-center justify-center rounded-md text-xs font-semibold tabular-nums @lg:h-6 ${FILL[status]}`}>
      <span className="sr-only">
        {name}: {LABEL[status]}
        {counted && `, ${passed} of ${of} checkpoints`}.
      </span>
      <span aria-hidden>
        {counted && passed}
        <span className="hidden @lg:inline">{counted ? ` of ${of}` : status === "later" ? "" : LABEL[status]}</span>
      </span>
    </span>
  );
}

function Calendar({ month, days, of }: { month: string; days: ReportDay[]; of: number }) {
  const offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7; // weeks start on Monday
  return (
    <div className="@container rounded-2xl bg-surface p-3 @xl:p-5">
      <p aria-hidden className="mb-2 grid grid-cols-7 gap-x-1 text-xs text-ink-muted @lg:gap-x-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </p>
      <ol className="grid grid-cols-7 gap-x-1 gap-y-3 @lg:gap-x-2 @lg:gap-y-4">
        {days.map((d, i) => {
          const today = d.rounds.some((r) => r.status === "now");
          return (
            <li key={d.date} style={i ? undefined : { gridColumnStart: offset + 1 }} className="flex flex-col gap-1">
              <span
                aria-hidden
                className={`grid size-6 place-items-center rounded-full text-sm font-semibold tabular-nums ${
                  today ? "bg-ink text-surface" : d.rounds[0].status === "later" ? "text-ink-muted" : ""
                }`}
              >
                {Number(d.date.slice(8))}
              </span>
              <span className="sr-only">
                {dayName.format(new Date(d.date))}
                {today && ", today"}
              </span>
              {d.rounds.map((r, k) => (
                <Round key={k} name={ROUNDS[k][0]} of={of} {...r} />
              ))}
            </li>
          );
        })}
      </ol>
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
        {(Object.keys(LABEL) as RoundStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className={`size-3 rounded-sm ${FILL[s]}`} />
            {LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/report">["searchParams"] }) {
  const [params, { supabase, role }] = await Promise.all([searchParams, getProfile()]);
  if (role !== "ra") redirect(HOME[role]);
  const month = toMonth(params.month);
  const { rows, days, fullDays, totals } = await monthlyReport(supabase, month);

  return (
    <div className="@container space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">{label(month)}</h2>
        <div className="flex w-full flex-wrap gap-2 @xl:w-auto print:hidden">
          <form className="flex w-full gap-2 @xl:w-auto">
            <label htmlFor="month" className="sr-only">Month</label>
            <select id="month" name="month" defaultValue={month} className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-4">
              {recentMonths().map((m) => (
                <option key={m} value={m}>{label(m)}</option>
              ))}
            </select>
            <button className={`${BUTTON} bg-ink text-surface hover:bg-deep`}>Show</button>
          </form>
          <a href={`/report/csv?month=${month}`} download className={`${BUTTON} flex-1 bg-surface text-ink hover:bg-surface-2 @xl:flex-none`}>
            Download CSV
          </a>
          <PrintButton className={`${BUTTON} flex-1 bg-brand text-white hover:bg-brand-strong @xl:flex-none`}>Save as PDF</PrintButton>
        </div>
      </div>

      <section aria-label="Totals" className="space-y-4">
        <p className="text-ink-muted">
          {fullDays === days.length
            ? `Totals cover all ${fullDays} days.`
            : fullDays
              ? `Totals cover the ${fullDays} full ${fullDays === 1 ? "day" : "days"} so far. Today's rounds are in the calendar only.`
              : "Totals start once the first day's midnight round is over."}
        </p>
        <ul className="grid grid-cols-3 gap-2 @xl:gap-3">
          {ROUNDS.map(([name, hours], k) => (
            <RoundSummary key={name} name={name} hours={hours} totals={totals[k]} of={fullDays} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="days" className="space-y-4">
        <div className="space-y-1">
          <h3 id="days" className="text-xl">Rounds by day</h3>
          <p className="text-ink-muted">Each day shows its morning, afternoon and midnight rounds, top to bottom.</p>
        </div>
        <Calendar month={month} days={days} of={rows.length} />
      </section>

      <section aria-labelledby="checkpoints" className="space-y-4">
        <div className="space-y-1">
          <h3 id="checkpoints" className="text-xl">Rounds missed by checkpoint</h3>
          <p className="text-ink-muted">
            Out of {fullDays} full {fullDays === 1 ? "day" : "days"}, so {fullDays} of each round.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className={TH}>Checkpoint</th>
                {ROUNDS.map(([name]) => (
                  <th key={name} className={`${TH} text-right`}>{name}</th>
                ))}
                <th className={`${TH} hidden text-right @3xl:table-cell`}>Passes</th>
                <th className={`${TH} hidden @3xl:table-cell`}>Last patrolled</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className={`${TD} font-normal whitespace-normal @3xl:whitespace-nowrap`}>
                    <span className="block text-sm font-semibold @xl:text-base @4xl:inline">{r.jalan}</span>{" "}
                    <span className="block text-sm text-ink-muted @4xl:ml-1 @4xl:inline">Section {r.section}</span>
                  </th>
                  {r.missed.map((n, i) => (
                    <td key={i} className={`${TD} text-right tabular-nums ${n ? "font-semibold text-error" : "text-ink-muted"}`}>{n}</td>
                  ))}
                  <td className={`${TD} hidden text-right tabular-nums @3xl:table-cell`}>{r.patrols}</td>
                  <td className={`${TD} hidden @3xl:table-cell`}>
                    {r.lastAt ? (
                      <time dateTime={r.lastAt} className="tabular-nums">{fmt.format(new Date(r.lastAt))}</time>
                    ) : (
                      <span className="text-error">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/report">) {
  return (
    <>
      <PageHeader title="Patrol report">
        Guards patrol every checkpoint three times a day. A round is done when a guard passed every checkpoint during its
        window, and missed when they passed none.
      </PageHeader>
      <Suspense fallback={<div aria-busy className="h-[60svh] rounded-2xl bg-surface" />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}
