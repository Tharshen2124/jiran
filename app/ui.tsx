import { getUser, STATUS_LABEL, type Favour, type Status } from "@/lib/favours";

const PILL: Record<Status, string> = {
  open: "bg-surface-2 text-ink-muted",
  accepted: "bg-gold-soft text-gold-ink",
  in_progress: "bg-tech-soft text-tech-ink",
  completed: "bg-success-soft text-success-ink",
  cancelled: "bg-brand-soft text-error",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${PILL[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

export function FavourCard({ favour, children, showStatus = true }: { favour: Favour; children?: React.ReactNode; showStatus?: boolean }) {
  const requester = getUser(favour.requesterId);
  const helper = favour.helperId ? getUser(favour.helperId) : null;
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 rounded-2xl bg-surface p-4 sm:grid-cols-[auto_1fr_auto] sm:gap-x-6 sm:p-5">
      <p className="flex size-16 flex-col items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
        <span className="text-2xl leading-none font-bold tabular-nums">{favour.points}</span>
        <span className="text-sm font-semibold">pts</span>
      </p>
      <div className="min-w-0 space-y-1">
        <h3 className="text-lg font-semibold">{favour.title}</h3>
        <p className="max-w-[65ch]">{favour.description}</p>
        <p className="text-sm text-ink-muted">
          {favour.location} · by {requester.name}
          {helper && ` · helped by ${helper.name}`} ·{" "}
          <time dateTime={new Date(favour.updatedAt).toISOString()} className="tabular-nums">
            {fmt.format(favour.updatedAt)}
          </time>
        </p>
      </div>
      {(showStatus || children) && (
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
          {showStatus && <StatusPill status={favour.status} />}
          {children}
        </div>
      )}
    </li>
  );
}

export function Stats({ items }: { items: [label: string, value: number][] }) {
  return (
    <dl className="mb-8 flex flex-wrap gap-x-12 gap-y-4">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="text-sm text-ink-muted">{label}</dt>
          <dd className="text-4xl font-bold tracking-tight tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-surface p-8 text-center text-ink-muted">{children}</p>;
}

export function ListSkeleton() {
  return (
    <ul aria-busy className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-28 rounded-2xl bg-surface" />
      ))}
    </ul>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 space-y-2">
      <h1 className="text-3xl">{title}</h1>
      {children && <p className="max-w-[65ch] text-ink-muted">{children}</p>}
    </header>
  );
}
