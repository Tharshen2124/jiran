"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useActionState, useEffect, useRef, useState } from "react";
import { acceptFavour, updateStatus, type ActionState } from "./actions";
import { STATUS_LABEL, type Status } from "@/lib/favours";
import { createClient } from "@/utils/supabase/client";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-18 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold md:min-h-11 md:justify-start md:px-4 md:text-left md:text-base transition-colors duration-200 ease-arrive ${
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

// How often a sharing resident's location is sent. It doubles as a heartbeat: the database stamps every write, so a row
// that stops updating means the session closed (see the live_locations migration).
const TICK_MS = 10_000;

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

export function LiveLocationPanel() {
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
                  ? "Your home dashboard can't tell when you're away."
                  : sentAt
                    ? `Your home dashboard last heard from you at ${timeFmt.format(sentAt)}.`
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
          {on
            ? "Your home dashboard will stop knowing when you're away, so your home's security won't switch on by itself."
            : "Your home dashboard will receive your location every 10 seconds and switch your home's security on while you're away."}
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
