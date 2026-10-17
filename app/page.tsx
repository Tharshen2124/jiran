import Link from "next/link";
import { Headline } from "./landing";

const BUTTON =
  "press inline-flex min-h-14 items-center justify-center rounded-full px-8 text-lg whitespace-nowrap font-semibold transition-colors duration-200";

export default function Landing() {
  return (
    <main className="landing flex min-h-svh flex-col bg-paper px-4 py-5 text-ink md:px-7 md:py-7">
      <header className="rise flex items-baseline justify-between gap-6" style={{ "--i": 0 } as React.CSSProperties}>
        <p className="text-2xl font-extrabold tracking-[-0.03em]">Jiran</p>
        <p className="text-right">City of Elmina, Shah Alam</p>
      </header>

      <div className="flex flex-1 flex-col justify-center py-16">
        <Headline />
      </div>

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-12 lg:items-end">
        <p className="rise max-w-[30ch] text-m leading-tight font-semibold lg:col-span-6" style={{ "--i": 1 } as React.CSSProperties}>
          Jiran is Malay for neighbour. Post a favour to your jalan, and earn points for the ones you do.
        </p>
        <p className="rise flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-end" style={{ "--i": 2 } as React.CSSProperties}>
          <Link href="/login" className={`${BUTTON} bg-white text-ink hover:bg-surface-2`}>
            Sign in
          </Link>
          <Link href="/login?mode=signup" className={`${BUTTON} bg-ink text-paper hover:bg-deep`}>
            Create an account
          </Link>
        </p>
      </div>

      <p className="rise mt-12 max-w-[60ch] text-base" style={{ "--i": 3 } as React.CSSProperties}>
        Built for the Sime Darby Property University Hackathon, 2026.
      </p>
    </main>
  );
}
