import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArriveHomeButton, StartGuardianAngel } from "../../client";
import { Empty, ListSkeleton, PageHeader } from "../../ui";
import { getGuardianAngel } from "@/lib/guardian-angel";
import { getProfile, HOME } from "@/utils/supabase/server";

const MYT = "Asia/Kuala_Lumpur";
const timeFmt = new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", timeZone: MYT });
const dayFmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: MYT });
// "21:30", what a time input wants.
const inputFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: MYT });

function Surveillance({ active }: { active: boolean }) {
  return (
    <p
      role="status"
      className={`flex min-h-12 items-center gap-3 rounded-2xl px-5 font-semibold ${active ? "bg-success-soft text-success-ink" : "bg-surface-2 text-ink-muted"}`}
    >
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${active ? "bg-success-ink motion-safe:animate-pulse" : "bg-ink-muted"}`} />
      {active ? "Surveillance system is active now" : "Surveillance system is shut off"}
    </p>
  );
}

async function GuardianAngel() {
  const { supabase, user, role } = await getProfile();
  if (role !== "resident") redirect(HOME[role]);
  const { house, trip, readAt } = await getGuardianAngel(supabase, user.sub);
  if (!house) return <Empty>Your account isn&apos;t linked to a home yet. Ask your resident administration to link it.</Empty>;

  const active = !!trip && !trip.arrived_at;
  const late = active && Date.parse(trip.eta) < readAt;

  return (
    <div className="max-w-2xl space-y-4">
      <Surveillance active={active} />
      <section aria-labelledby="trip" className="space-y-5 rounded-2xl bg-surface p-5 sm:p-6">
        <div>
          <h2 id="trip" className="text-xl font-semibold">
            {active ? "On your way home" : "Heading home?"}
          </h2>
          <p className="text-ink-muted">To {house.address}</p>
        </div>
        {active ? (
          <>
            <p className={late ? "font-semibold text-error" : ""}>
              {late ? "You're past your expected time of " : "Expected home by "}
              <time dateTime={trip.eta} className="tabular-nums">
                {timeFmt.format(new Date(trip.eta))}
              </time>
              {late && ". Check in as soon as you're home."}
            </p>
            <ArriveHomeButton />
          </>
        ) : (
          <>
            {trip?.arrived_at && (
              <p className="text-sm text-ink-muted">
                You last checked in at home on{" "}
                <time dateTime={trip.arrived_at} className="tabular-nums">
                  {dayFmt.format(new Date(trip.arrived_at))}
                </time>
                .
              </p>
            )}
            <StartGuardianAngel houseId={house.id} defaultEta={inputFmt.format(readAt + 30 * 60 * 1000)} />
          </>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title="Guardian Angel">
        Heading home? Tell your home when to expect you. Its surveillance system stays on until you check in.
      </PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <GuardianAngel />
      </Suspense>
    </>
  );
}
