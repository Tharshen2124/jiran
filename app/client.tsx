"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useActionState, useEffect, useRef, useState } from "react";
import { acceptFavour, arriveHome, boostFavour, redeemReward, startGuardianAngel, updateStatus, type ActionState } from "./actions";
import { STATUS_LABEL, type Status } from "@/lib/favours";
import type { Reward } from "@/lib/marketplace";
import { createClient } from "@/utils/supabase/client";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-18 items-center justify-center rounded-xl px-1 text-center text-sm font-semibold md:min-h-11 md:justify-start md:px-4 md:text-left md:text-base transition-colors duration-200 ease-arrive ${
        active ? "bg-white/10 text-on-dark" : "text-on-dark-muted hover:bg-white/5 hover:text-on-dark"
      }`}
    >
      {children}
    </Link>
  );
}

function ErrorText({ state }: { state: ActionState }) {
  return state?.error ? (
    <p role="alert" className="text-sm font-medium text-error">
      {state.error}
    </p>
  ) : null;
}

export function AcceptButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(acceptFavour, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors duration-200 ease-arrive hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Accepting…" : "Accept favour"}
      </button>
      <ErrorText state={state} />
    </form>
  );
}

const BUTTON_TEXT: Partial<Record<Status, string>> = {
  in_progress: "Start",
  completed: "Mark completed",
  cancelled: "Cancel",
};

export function StatusButtons({ id, next }: { id: string; next: Status[] }) {
  const [state, action, pending] = useActionState(updateStatus, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap justify-end gap-2">
        {next.map((to) => (
          <button
            key={to}
            name="to"
            value={to}
            disabled={pending}
            aria-label={`${BUTTON_TEXT[to]} (set status to ${STATUS_LABEL[to]})`}
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 ease-arrive disabled:opacity-60 ${
              to === "cancelled"
                ? "bg-brand-soft text-error hover:bg-error hover:text-white"
                : "bg-brand text-white hover:bg-brand-strong"
            }`}
          >
            {BUTTON_TEXT[to]}
          </button>
        ))}
      </div>
      <ErrorText state={state} />
    </form>
  );
}

const BIG_BUTTON =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-6 font-semibold text-white transition-colors duration-200 ease-arrive hover:bg-brand-strong disabled:opacity-60";

export function StartGuardianAngel({ houseId, defaultEta }: { houseId: string; defaultEta: string }) {
  const [state, action, pending] = useActionState(startGuardianAngel, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="house" value={houseId} />
      <label className="block space-y-1.5">
        <span className="block text-sm font-semibold">Expected home by</span>
        <input type="time" name="eta" required defaultValue={defaultEta} className="min-h-12 w-full rounded-xl border bg-surface px-4 text-lg tabular-nums" />
      </label>
      <button disabled={pending} className={BIG_BUTTON}>
        {pending ? "Starting…" : "Start Guardian Angel"}
      </button>
      <ErrorText state={state} />
    </form>
  );
}

export function ArriveHomeButton() {
  const [state, action, pending] = useActionState(arriveHome, undefined);
  return (
    <form action={action} className="space-y-2">
      <button disabled={pending} className={BIG_BUTTON}>
        {pending ? "Checking in…" : "I'm home"}
      </button>
      <ErrorText state={state} />
    </form>
  );
}

const DIALOG_BUTTON = "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 ease-arrive disabled:opacity-60";

// Spending points can't be undone, so redeeming asks first (in red; the card buttons stay dark so a grid of them isn't loud), then shows the voucher code in the same dialog.
export function RedeemButton({ reward, balance }: { reward: Reward; balance: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // A new key on every open resets the form, so a reopened dialog asks again instead of showing the last code.
  const [round, setRound] = useState(0);
  const short = reward.cost - balance;

  if (short > 0)
    return <p className="text-sm font-semibold text-ink-muted tabular-nums">{short} more pts needed</p>;

  return (
    <>
      <button
        onClick={() => {
          setRound((r) => r + 1);
          dialog.current!.showModal();
        }}
        aria-label={`Redeem ${reward.title}`}
        className={`${DIALOG_BUTTON} bg-ink text-surface hover:bg-deep`}
      >
        Redeem
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`redeem-${reward.id}`}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-surface p-6 text-ink backdrop:bg-deep/60"
      >
        <RedeemForm key={round} reward={reward} balance={balance} close={() => dialog.current!.close()} />
      </dialog>
    </>
  );
}

function RedeemForm({ reward, balance, close }: { reward: Reward; balance: number; close: () => void }) {
  const [state, action, pending] = useActionState(redeemReward, undefined);
  const titleId = `redeem-${reward.id}`;

  if (state?.code)
    return (
      <div className="space-y-4">
        <h2 id={titleId} className="text-xl font-semibold">
          Voucher ready
        </h2>
        <p className="text-ink-muted">
          Show this code at {reward.shop} for <span className="text-ink">{reward.title}</span>. It&apos;s saved under My vouchers.
        </p>
        <p className="rounded-xl border-2 border-dashed border-gold bg-gold-soft p-4 text-center font-mono text-2xl font-bold tracking-widest text-gold-ink">
          {state.code}
        </p>
        <div className="flex justify-end">
          <button autoFocus onClick={close} className={`${DIALOG_BUTTON} bg-surface-2 hover:bg-line`}>
            Done
          </button>
        </div>
      </div>
    );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={reward.id} />
      <h2 id={titleId} className="text-xl font-semibold">
        Redeem {reward.title}?
      </h2>
      <p className="mt-2 text-ink-muted">
        This uses <span className="text-ink tabular-nums">{reward.cost} points</span> and leaves you with{" "}
        <span className="text-ink tabular-nums">{balance - reward.cost}</span>. You&apos;ll get a code to show at {reward.shop}.
      </p>
      <div className="mt-3 empty:hidden">
        <ErrorText state={state} />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={close} className={`${DIALOG_BUTTON} bg-surface-2 hover:bg-line`}>
          Cancel
        </button>
        <button disabled={pending} className={`${DIALOG_BUTTON} bg-brand text-white hover:bg-brand-strong`}>
          {pending ? "Redeeming…" : `Redeem for ${reward.cost} pts`}
        </button>
      </div>
    </form>
  );
}

const INPUT = "min-h-11 w-full rounded-xl border bg-surface px-4";

// The RA sweetens a favour nobody has taken up: extra points and/or a voucher for whoever completes it.
export function BoostButton({ favour, rewards }: { favour: { id: string; title: string }; rewards: Reward[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `boost-${favour.id}`;
  const [state, action, pending] = useActionState(async (prev: ActionState, form: FormData) => {
    const next = await boostFavour(prev, form);
    if (!next?.error) dialog.current?.close();
    return next;
  }, undefined);

  return (
    <>
      <button
        onClick={() => dialog.current!.showModal()}
        aria-label={`Add a bonus to ${favour.title}`}
        className={`${DIALOG_BUTTON} bg-ink text-surface hover:bg-deep`}
      >
        Add a bonus
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-surface p-6 text-ink backdrop:bg-deep/60"
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={favour.id} />
          <div className="space-y-2">
            <h2 id={titleId} className="text-xl font-semibold">
              Add a bonus to {favour.title}
            </h2>
            <p className="text-ink-muted">Whoever takes it up gets this when they complete it.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="block text-sm font-semibold">Extra points</span>
            <input type="number" name="points" required min={0} max={100} defaultValue={0} className={`${INPUT} tabular-nums`} />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-sm font-semibold">Voucher</span>
            <select name="reward" className={INPUT}>
              <option value="">No voucher</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>{`${r.icon} ${r.title} (${r.shop})`}</option>
              ))}
            </select>
          </label>
          <ErrorText state={state} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialog.current!.close()} className={`${DIALOG_BUTTON} bg-surface-2 hover:bg-line`}>
              Cancel
            </button>
            <button disabled={pending} className={`${DIALOG_BUTTON} bg-brand text-white hover:bg-brand-strong`}>
              {pending ? "Adding…" : "Add bonus"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// How often a sharing resident's location is sent. It doubles as a heartbeat: the database stamps every write, so a row
// that stops updating means the session closed (see the live_locations migration).
export const TICK_MS = 10_000;

const SEND_FAILED = "Couldn't send your location. Trying again…";
const NO_FIX = "Can't find your location right now. Still trying…";

// `on` is undefined until we know whether this resident was already sharing.
type LiveLocation = { on?: boolean; sentAt?: Date; error?: string; setSharing: (on: boolean) => void };
const LiveLocationContext = createContext<LiveLocation>({ setSharing() {} });

// Lives in the dashboard layout, not the location page, so sharing carries on while the resident uses the rest of the app.
export function LiveLocationProvider({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState<boolean>();
  const [sentAt, setSentAt] = useState<Date>();
  const [error, setError] = useState<string>();
  const userId = useRef<string>(undefined);
  // Every write joins one chain, so stopping's delete always lands after an upsert that's still in flight.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Sharing lasts until it's turned off, so if their row is still there (a reload, a reopened tab) pick it back up.
  useEffect(() => {
    const db = createClient();
    db.auth.getClaims().then(async ({ data }) => {
      userId.current = data?.claims.sub;
      const { data: row } = await db.from("live_locations").select("user_id").maybeSingle();
      setOn(!!row);
    });
  }, []);

  // One watcher and one timer exist only while on; the cleanup tears both down, so repeat toggles can't stack them.
  useEffect(() => {
    if (!on) return;
    const db = createClient();
    const user_id = userId.current;
    const write = (op: () => PromiseLike<unknown>) => (queue.current = queue.current.then(op));
    let fix: GeolocationCoordinates | undefined;
    const send = () => {
      if (!fix) return;
      const { latitude: lat, longitude: lng, accuracy } = fix;
      write(() =>
        db.from("live_locations").upsert({ user_id, lat, lng, accuracy }).then(({ error }) => {
          setError(error ? SEND_FAILED : undefined);
          if (!error) setSentAt(new Date());
        }),
      );
    };
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const first = !fix;
        fix = p.coords;
        if (first) send();
      },
      (e) => {
        if (e.code !== e.PERMISSION_DENIED) return setError(NO_FIX);
        setOn(false);
        setError("Location access is blocked. Allow it in your browser settings to share.");
      },
      { enableHighAccuracy: true },
    );
    const timer = setInterval(send, TICK_MS);
    // Some browsers never answer at all (no error), which would look like sharing while nothing is sent.
    const slow = setTimeout(() => fix || setError(NO_FIX), 15_000);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      clearTimeout(slow);
      setSentAt(undefined);
      write(() => db.from("live_locations").delete().eq("user_id", user_id).then(({ error }) => error && setError("Couldn't stop sharing. Try again.")));
    };
  }, [on]);

  function setSharing(next: boolean) {
    if (next && !("geolocation" in navigator)) return setError("This browser can't share its location.");
    setError(undefined);
    setOn(next);
  }

  return <LiveLocationContext value={{ on, sentAt, error, setSharing }}>{children}</LiveLocationContext>;
}

export const useLiveLocation = () => use(LiveLocationContext);

// Marks the nav link while sharing, so it's visible from any page.
export function LiveDot() {
  return use(LiveLocationContext).on ? (
    <>
      <span aria-hidden className="ml-2 size-2 shrink-0 rounded-full bg-brand-bright motion-safe:animate-pulse" />
      <span className="sr-only">, sharing</span>
    </>
  ) : null;
}

const timeFmt = new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", second: "2-digit" });

// What sharing does for whoever is reading. Residents share with their home dashboard; guards share to patrol.
type SharingCopy = { off: string; sent: string; start: string; stop: string };

const HOME_DASHBOARD: SharingCopy = {
  off: "Your home dashboard can't tell when you're away.",
  sent: "Your home dashboard last heard from you at",
  start: "Your home dashboard will receive your location every 10 seconds and switch your home's security on while you're away.",
  stop: "Your home dashboard will stop knowing when you're away, so your home's security won't switch on by itself.",
};

export function LiveLocationPanel({ copy = HOME_DASHBOARD }: { copy?: SharingCopy }) {
  const { on, sentAt, error, setSharing } = use(LiveLocationContext);
  const confirm = useRef<HTMLDialogElement>(null);

  function ask() {
    // Esc closes without a value and would keep the last "yes", so clear it first.
    confirm.current!.returnValue = "";
    confirm.current!.showModal();
  }

  return (
    <section aria-labelledby="sharing-status" className="space-y-3">
      <div className="flex flex-col gap-5 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span aria-hidden className={`size-3 shrink-0 rounded-full ${on ? "bg-brand motion-safe:animate-pulse" : "ring-2 ring-ink-muted ring-inset"}`} />
          <div>
            <h2 id="sharing-status" className="text-xl font-semibold">
              {on === undefined ? "Checking…" : on ? "Sharing your live location" : "Not sharing"}
            </h2>
            <p className="text-sm text-ink-muted">
              {on === undefined
                ? "Seeing whether you're already sharing."
                : !on
                  ? copy.off
                  : sentAt
                    ? `${copy.sent} ${timeFmt.format(sentAt)}.`
                    : "Finding your location…"}
            </p>
          </div>
        </div>
        <button
          disabled={on === undefined}
          onClick={ask}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 ease-arrive disabled:opacity-60 ${
            on ? "bg-brand-soft text-error hover:bg-error hover:text-white" : "bg-brand text-white hover:bg-brand-strong"
          }`}
        >
          {on ? "Turn off sharing" : "Turn on sharing"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
      <dialog
        ref={confirm}
        aria-labelledby="confirm-sharing"
        onClose={(e) => e.currentTarget.returnValue === "yes" && setSharing(!on)}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl bg-surface p-6 text-ink backdrop:bg-deep/60"
      >
        <h2 id="confirm-sharing" className="text-xl font-semibold">
          {on ? "Turn off live location?" : "Turn on live location?"}
        </h2>
        <p className="mt-2 text-ink-muted">
          {on ? copy.stop : copy.start}
        </p>
        <form method="dialog" className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button value="" className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-2 px-5 text-sm font-semibold transition-colors duration-200 ease-arrive hover:bg-line">
            {on ? "Keep sharing" : "Cancel"}
          </button>
          <button
            value="yes"
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-colors duration-200 ease-arrive ${
              on ? "bg-error hover:bg-brand-strong" : "bg-brand hover:bg-brand-strong"
            }`}
          >
            {on ? "Turn off" : "Turn on"}
          </button>
        </form>
      </dialog>
    </section>
  );
}
