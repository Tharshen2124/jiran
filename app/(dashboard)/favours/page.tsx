import { Suspense } from "react";
import { AcceptButton } from "../../client";
import { Empty, FavourCard, ListSkeleton, PageHeader, Stats } from "../../ui";
import { listOpen } from "@/lib/favours";
import { getSession } from "@/utils/supabase/server";

async function OpenFavours() {
  const { supabase, user } = await getSession();
  const favours = await listOpen(supabase, user.sub);
  return (
    <>
      <Stats
        items={[
          ["Open favours", favours.length],
          ["Points on offer", favours.reduce((n, f) => n + f.points, 0)],
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
