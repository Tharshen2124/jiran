import { Suspense } from "react";
import { AcceptButton } from "../../client";
import { Empty, FavourCard, ListSkeleton, PageHeader, Stats } from "../../ui";
import { listOpen } from "@/lib/favours";
import { getBalance } from "@/lib/marketplace";
import { redirect } from "next/navigation";
import { getProfile, HOME } from "@/utils/supabase/server";

async function OpenFavours() {
  const { supabase, user, role } = await getProfile();
  if (role !== "resident") redirect(HOME[role]);
  const [favours, points] = await Promise.all([listOpen(supabase, user.sub), getBalance(supabase, user.sub)]);
  return (
    <>
      <Stats
        items={[
          ["Open favours", favours.length],
          ["Points on offer", favours.reduce((n, f) => n + f.points, 0)],
          ["Your points", points],
        ]}
      />
      {favours.length ? (
        <ul className="space-y-2">
          {favours.map((f) => (
            <FavourCard key={f.id} favour={f} showStatus={false}>
              <AcceptButton id={f.id} />
            </FavourCard>
          ))}
        </ul>
      ) : (
        <Empty>No open favours right now. Check back later.</Empty>
      )}
    </>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title="Open favours">Help a neighbour and earn the points once it&apos;s completed.</PageHeader>
      <Suspense fallback={<ListSkeleton />}>
        <OpenFavours />
      </Suspense>
    </>
  );
}
