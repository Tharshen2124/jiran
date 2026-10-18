import Link from "next/link";
import { Suspense } from "react";
import { StatusButtons } from "../../client";
import { Empty, FavourCard, ListSkeleton, PageHeader, Stats } from "../../ui";
import { listHelping, listRequested, nextStatuses, type Status } from "@/lib/favours";
import { redirect } from "next/navigation";
import { getProfile, getSession } from "@/utils/supabase/server";

const FILTERS: { key: string; label: string; match: Status[] }[] = [
  { key: "all", label: "All", match: ["accepted", "in_progress", "completed", "cancelled"] },
  { key: "active", label: "Active", match: ["accepted", "in_progress"] },
  { key: "completed", label: "Completed", match: ["completed"] },
  { key: "cancelled", label: "Cancelled", match: ["cancelled"] },
];

async function Helping({ searchParams }: { searchParams: PageProps<"/my-favours">["searchParams"] }) {
  const [{ status }, { supabase, user, role }] = await Promise.all([searchParams, getProfile()]);
  // Favours are for residents; guards only patrol.
  if (role === "guard") redirect("/patrol");
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const all = await listHelping(supabase, user.sub);
  const favours = all.filter((f) => filter.match.includes(f.status));
  const done = all.filter((f) => f.status === "completed");

  return (
    <>
      <Stats
        items={[
          ["Active", all.filter((f) => FILTERS[1].match.includes(f.status)).length],
          ["Completed", done.length],
          ["Points earned", done.reduce((n, f) => n + f.points, 0)],
        ]}
      />
      <section aria-labelledby="helping" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="helping" className="text-2xl">Helping with</h2>
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "all" ? "/my-favours" : `/my-favours?status=${f.key}`}
                aria-current={f === filter ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold sm:px-4 transition-colors duration-200 ease-arrive ${
                  f === filter ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
        {favours.length ? (
          <ul className="space-y-2">
            {favours.map((f) => {
              const next = nextStatuses(f.status);
              return (
                <FavourCard key={f.id} favour={f}>
                  {next.length > 0 && <StatusButtons id={f.id} next={next} />}
                </FavourCard>
              );
            })}
          </ul>
        ) : (
          <Empty>
            Nothing here yet.{" "}
            <Link href="/favours" className="font-semibold text-brand underline-offset-4 hover:underline">
              Browse open favours
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}

async function Requested() {
  const { supabase, user } = await getSession();
  const favours = await listRequested(supabase, user.sub);
  return (
    <section aria-labelledby="requested" className="space-y-4">
      <h2 id="requested" className="text-2xl">Requested by me</h2>
      {favours.length ? (
        <ul className="space-y-2">
          {favours.map((f) => (
            <FavourCard key={f.id} favour={f} />
          ))}
        </ul>
      ) : (
        <Empty>You haven&apos;t requested any favours.</Empty>
      )}
    </section>
  );
}

export default function Page({ searchParams }: PageProps<"/my-favours">) {
  return (
    <>
      <PageHeader title="My favours">Update favours you&apos;ve accepted and see your history.</PageHeader>
      <div className="space-y-12">
        <Suspense fallback={<ListSkeleton />}>
          <Helping searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<ListSkeleton />}>
          <Requested />
        </Suspense>
      </div>
    </>
  );
}
