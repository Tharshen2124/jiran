import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AcceptButton, BoostButton, StatusButtons } from "../../client";
import { Empty, FavourCard, ListSkeleton, PageHeader, Stats } from "../../ui";
import { listHelping, listUnclaimed, nextStatuses, STALE_DAYS } from "@/lib/favours";
import { listRewards } from "@/lib/marketplace";
import { getProfile, HOME } from "@/utils/supabase/server";

async function Unclaimed() {
  const { supabase, user, role } = await getProfile();
  if (role !== "ra") redirect(HOME[role]);
  const [favours, helping, rewards] = await Promise.all([listUnclaimed(supabase), listHelping(supabase, user.sub), listRewards(supabase)]);
  const handling = helping.filter((f) => nextStatuses(f.status).length);

  return (
    <>
      <Stats
        items={[
          ["Open favours", favours.length],
          [`Waiting ${STALE_DAYS}+ days`, favours.filter((f) => f.days >= STALE_DAYS).length],
          ["You're handling", handling.length],
        ]}
      />
      <div className="space-y-12">
        <section aria-labelledby="waiting" className="space-y-4">
          <h2 id="waiting" className="text-2xl">Waiting for a helper</h2>
          {favours.length ? (
            <ul className="space-y-2">
              {favours.map((f) => (
                <FavourCard key={f.id} favour={f} showStatus={false} flag={f.days >= STALE_DAYS ? `Waiting ${f.days} days` : undefined}>
                  <AcceptButton id={f.id} />
                  <BoostButton favour={f} rewards={rewards} />
                </FavourCard>
              ))}
            </ul>
          ) : (
            <Empty>Every favour has a helper. Nothing to handle.</Empty>
          )}
        </section>
        {handling.length > 0 && (
          <section aria-labelledby="handling" className="space-y-4">
            <h2 id="handling" className="text-2xl">You&apos;re handling</h2>
            <ul className="space-y-2">
              {handling.map((f) => (
                <FavourCard key={f.id} favour={f}>
                  <StatusButtons id={f.id} next={nextStatuses(f.status)} />
                </FavourCard>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title="Unclaimed favours">
        Favours no neighbour has taken up, oldest first. Ones waiting {STALE_DAYS} days or more are flagged: do them yourself, or add points
        or a voucher for whoever takes them up.
      </PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <Unclaimed />
      </Suspense>
    </>
  );
}
