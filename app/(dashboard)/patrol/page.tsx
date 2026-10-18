import { Suspense } from "react";
import { LiveLocationPanel } from "../../client";
import { PatrolMap } from "../../patrol-map";
import { Empty, PageHeader, Stats } from "../../ui";
import { listSections, PATROL_WINDOW_MS, type Section } from "@/lib/patrols";
import { getProfile } from "@/utils/supabase/server";

const HOURS = PATROL_WINDOW_MS / 3_600_000;

const PATROLLING = {
  off: "Checkpoints you pass won't be marked as patrolled.",
  sent: "Your location was last sent at",
  start: "Jiran will send your location every 10 seconds and mark each checkpoint you pass as patrolled. Turn it off when your shift ends.",
  stop: "Checkpoints you pass won't be marked as patrolled until you turn it back on.",
};

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

const JALAN_STATUS = {
  done: ["Patrolled", "bg-success-soft text-success-ink"],
  partly: ["Partly patrolled", "bg-gold-soft text-gold-ink"],
  none: ["Not patrolled", "bg-brand-soft text-error"],
} as const;

function Jalan({ name, sections }: { name: string; sections: Section[] }) {
  const done = sections.filter((s) => s.patrolled).length;
  const [label, pill] = JALAN_STATUS[done === sections.length ? "done" : done ? "partly" : "none"];
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{name}</h3>
        <ul className="text-sm text-ink-muted">
          {sections.map((s) => (
            <li key={s.id}>
              <span className={s.patrolled ? "text-success-ink" : "text-error"}>{s.section}</span> ·{" "}
              {s.lastAt ? (
                <>
                  last passed <time dateTime={s.lastAt} className="tabular-nums">{fmt.format(new Date(s.lastAt))}</time>
                  {s.lastBy && ` by ${s.lastBy}`}
                </>
              ) : (
                "never passed"
              )}
            </li>
          ))}
        </ul>
      </div>
      <span className={`inline-flex min-h-8 shrink-0 items-center self-start rounded-full px-3 text-sm font-semibold sm:self-center ${pill}`}>{label}</span>
    </li>
  );
}

async function Patrol() {
  const { supabase, role } = await getProfile();
  if (role !== "guard") return <Empty>Patrols are only for security guards.</Empty>;
  const sections = await listSections(supabase);
  // Not Map.groupBy: it needs Node 21+, and Next 16 still runs on Node 20.
  const jalans = new Map<string, typeof sections>();
  for (const s of sections) jalans.set(s.jalan, [...(jalans.get(s.jalan) ?? []), s]);
  const patrolled = sections.filter((s) => s.patrolled).length;
  // Mapbox GL runs in the browser, so it only ever gets a public (pk.) token. A secret (sk.) token must never leave the server.
  const token = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN;

  return (
    <div className="space-y-10">
      <Stats
        items={[
          ["Jalans patrolled", [...jalans.values()].filter((j) => j.every((s) => s.patrolled)).length],
          ["Checkpoints passed", patrolled],
          ["Checkpoints left", sections.length - patrolled],
        ]}
      />
      <LiveLocationPanel copy={PATROLLING} />
      <section aria-labelledby="map" className="space-y-4">
        <h2 id="map" className="text-2xl">Checkpoints</h2>
        {token?.startsWith("pk.") ? (
          <PatrolMap token={token} sections={sections} />
        ) : (
          <Empty>The map needs a public Mapbox token (starting with pk.) in NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN.</Empty>
        )}
        <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-success-ink" /> Patrolled in the last {HOURS} hours
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-brand" /> Not patrolled yet
          </span>
        </p>
      </section>
      <section aria-labelledby="jalans" className="space-y-4">
        <h2 id="jalans" className="text-2xl">Jalans</h2>
        <ul className="space-y-2">
          {[...jalans].map(([name, s]) => (
            <Jalan key={name} name={name} sections={s} />
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title="Patrol">
        Share your location while you patrol. Each jalan has a checkpoint on every section, and passing one marks that section as
        patrolled for {HOURS} hours.
      </PageHeader>
      <Suspense fallback={<div aria-busy className="h-[60svh] rounded-2xl bg-surface" />}>
        <Patrol />
      </Suspense>
    </>
  );
}
