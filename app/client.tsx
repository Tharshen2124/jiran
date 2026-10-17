"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { acceptFavour, updateStatus, type ActionState } from "./actions";
import { STATUS_LABEL, type Status } from "@/lib/favours";
import { createClient } from "@/utils/supabase/client";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center rounded-xl px-4 font-semibold md:justify-start transition-colors duration-200 ease-arrive ${
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

export function LiveLocationToggle({ userId }: { userId: string }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string>();
  // Every write joins one chain, so stopping's delete always lands after an upsert that's still in flight.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // One watcher and one timer exist only while on; the cleanup tears both down, so repeat clicks can't stack them.
  useEffect(() => {
    if (!on) return;
    const db = createClient();
    const write = (op: () => PromiseLike<unknown>) => (queue.current = queue.current.then(op));
    let fix: GeolocationCoordinates | undefined;
    const send = () => {
      if (!fix) return;
      const { latitude: lat, longitude: lng, accuracy } = fix;
      write(() => db.from("live_locations").upsert({ user_id: userId, lat, lng, accuracy }).then(({ error }) => setError(error ? SEND_FAILED : undefined)));
    };
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const first = !fix;
        fix = p.coords;
        if (first) send();
      },
      (e) => {
        if (e.code !== e.PERMISSION_DENIED) return setError("Can't find your location right now. Still trying…");
        setOn(false);
        setError("Location access is blocked. Allow it in your browser settings to share.");
      },
      { enableHighAccuracy: true },
    );
    const timer = setInterval(send, TICK_MS);
    // Some browsers never answer at all (no error), which would look like sharing while nothing is sent.
    const slow = setTimeout(() => fix || setError("Can't find your location right now. Still trying…"), 15_000);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      clearTimeout(slow);
      write(() => db.from("live_locations").delete().eq("user_id", userId).then(({ error }) => error && setError("Couldn't stop sharing. Try again.")));
    };
  }, [on, userId]);

  function toggle() {
    if (!on && !("geolocation" in navigator)) return setError("This browser can't share its location.");
    setError(undefined);
    setOn(!on);
  }

  return (
    <div className="md:flex md:flex-col md:gap-2">
      <button
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ease-arrive ${
          on ? "bg-brand text-white hover:bg-brand-strong" : "bg-white/10 text-on-dark hover:bg-white/20"
        }`}
      >
        <span aria-hidden className={`size-2.5 rounded-full ${on ? "bg-white motion-safe:animate-pulse" : "ring-2 ring-on-dark-muted ring-inset"}`} />
        {on ? "Sharing live" : "Share location"}
      </button>
      {error && (
        <p role="alert" className="fixed inset-x-4 top-16 z-10 rounded-xl bg-deep p-3 text-sm font-medium text-brand-bright ring-1 ring-white/15 md:static md:bg-transparent md:p-0 md:ring-0">
          {error}
        </p>
      )}
    </div>
  );
}
