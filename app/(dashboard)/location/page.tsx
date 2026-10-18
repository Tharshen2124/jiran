import { LiveLocationPanel } from "../../client";
import { PageHeader } from "../../ui";

const STEPS = [
  ["Turn it on before you head out", "Jiran sends your location to your home dashboard every 10 seconds."],
  ["Security switches on while you're away", "Once you're away from home, your home dashboard puts your home's security into active mode."],
  ["It switches off when you're back", "Back home, security stands down again. This keeps happening until you turn sharing off."],
];

export default function Page() {
  return (
    <>
      <PageHeader title="Live location">Let your home dashboard know when you&apos;re out, so your home is protected while you&apos;re away.</PageHeader>
      <div className="max-w-2xl space-y-10">
        <LiveLocationPanel />
        <section aria-labelledby="how" className="space-y-4">
          <h2 id="how" className="text-2xl">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold tabular-nums">
                  {i + 1}
                </span>
                <p>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-ink-muted">{body}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
        <p className="max-w-[65ch] text-sm text-ink-muted">
          Only your home dashboard uses your location. Neighbours on Jiran can&apos;t see it. Sharing runs while Jiran is open in
          your browser and picks up again when you come back.
        </p>
      </div>
    </>
  );
}
