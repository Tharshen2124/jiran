"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { acceptFavour, updateStatus, type ActionState } from "./actions";
import { STATUS_LABEL, type Status } from "@/lib/favours";

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
