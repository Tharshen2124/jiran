import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RedeemButton } from "../../client";
import { Empty, ListSkeleton, PageHeader, Stats } from "../../ui";
import { getBalance, listRedemptions, listRewards } from "@/lib/marketplace";
import { getProfile, getSession, HOME } from "@/utils/supabase/server";

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

const chip = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 ease-arrive ${
    active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-surface-2"
  }`;

function Icon({ icon, className = "size-12 text-2xl" }: { icon: string; className?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl bg-gold-soft ${className}`}>
      {icon}
    </span>
  );
}

async function Rewards({ searchParams }: { searchParams: PageProps<"/marketplace">["searchParams"] }) {
  const [{ category }, { supabase, user, role }] = await Promise.all([searchParams, getProfile()]);
  if (role !== "resident") redirect(HOME[role]);
  const [rewards, redemptions, balance] = await Promise.all([
    listRewards(supabase),
    listRedemptions(supabase, user.sub),
    getBalance(supabase, user.sub),
  ]);
  const categories = [...new Set(rewards.map((r) => r.category))];
  const active = categories.find((c) => c === category);
  const shown = active ? rewards.filter((r) => r.category === active) : rewards;
  const affordable = rewards.filter((r) => r.cost <= balance).length;

  return (
    <>
      <Stats
        items={[
          ["Your points", balance],
          ["Can redeem", affordable],
          ["Vouchers", redemptions.length],
        ]}
      />
      {/* Vouchers are what you need at the counter, and on a phone they sit below the whole catalogue. */}
      {redemptions.length > 0 && (
        <a href="#vouchers" className="-mt-4 mb-6 inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">
          Show my vouchers ↓
        </a>
      )}
      <section aria-labelledby="rewards" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="rewards" className="text-2xl">Rewards</h2>
          {/* Scrolls sideways on phones instead of wrapping into a tall block of chips. */}
          <nav aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href="/marketplace" scroll={false} aria-current={!active ? "page" : undefined} className={chip(!active)}>
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/marketplace?category=${encodeURIComponent(c)}`}
                scroll={false}
                aria-current={c === active ? "page" : undefined}
                className={chip(c === active)}
              >
                {c}
              </Link>
            ))}
          </nav>
        </div>
        {shown.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
                <div className="flex items-start gap-4">
                  <Icon icon={r.icon} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink-muted">{r.category}</p>
                    <h3 className="text-lg font-semibold">{r.title}</h3>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p>{r.description}</p>
                  <p className="text-sm text-ink-muted">{r.shop}</p>
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3 border-t pt-4">
                  <p className="font-bold text-gold-ink tabular-nums">
                    <span className="text-2xl">{r.cost}</span> pts
                  </p>
                  <RedeemButton reward={r} balance={balance} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No rewards here yet.</Empty>
        )}
      </section>
    </>
  );
}

async function Vouchers() {
  const { supabase, user } = await getSession();
  const redemptions = await listRedemptions(supabase, user.sub);
  return (
    <section aria-labelledby="vouchers" className="space-y-4">
      <h2 id="vouchers" className="text-2xl">My vouchers</h2>
      {redemptions.length ? (
        <ul className="space-y-2">
          {redemptions.map((r) => (
            <li key={r.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-2xl bg-surface p-4 sm:grid-cols-[auto_1fr_auto] sm:p-5">
              <Icon icon={r.reward?.icon ?? "🎟️"} />
              <div className="min-w-0">
                <h3 className="font-semibold">{r.reward?.title ?? "Reward"}</h3>
                <p className="text-sm text-ink-muted">
                  {r.reward?.shop} · <span className="tabular-nums">{r.cost} pts</span> ·{" "}
                  <time dateTime={new Date(r.created_at).toISOString()} className="tabular-nums">
                    {fmt.format(new Date(r.created_at))}
                  </time>
                </p>
              </div>
              <p className="col-span-2 rounded-xl border-2 border-dashed border-gold bg-gold-soft px-4 py-2 text-center font-mono text-lg font-bold tracking-widest text-gold-ink sm:col-span-1">
                <span className="sr-only">Voucher code </span>
                {r.code}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No vouchers yet. Redeem a reward above and its code shows up here.</Empty>
      )}
    </section>
  );
}

export default function Page({ searchParams }: PageProps<"/marketplace">) {
  return (
    <>
      <PageHeader title="Marketplace">Spend the points you earn helping neighbours on vouchers from shops around Elmina.</PageHeader>
      <div className="space-y-12">
        <Suspense fallback={<ListSkeleton />}>
          <Rewards searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<ListSkeleton />}>
          <Vouchers />
        </Suspense>
      </div>
    </>
  );
}
