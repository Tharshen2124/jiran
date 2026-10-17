import Image from "next/image";
import Link from "next/link";
import { DayInElmina } from "./landing";
import neutron from "@/public/landing/persiaran-neutron-seksyen-u16-shah-alam-20231105.jpg";
import river from "@/public/landing/sungai-subang-elmina-west-20231105-105946.jpg";
import path from "@/public/landing/buggy-path-elmina-west-20231105-110617.jpg";
import dusk from "@/public/landing/taman-sri-rembau.jpg";

const BUTTON =
  "press inline-flex min-h-14 items-center justify-center rounded-full bg-brand px-8 text-lg font-semibold text-white transition-colors duration-200 hover:bg-brand-strong";
const LINK = "link font-semibold";

const FAQ = [
  ["Who can join Jiran?", "Residents of City of Elmina sign up with email or Google. Accounts for resident administration and security guards are set up by the RA office, so nobody can make themselves a guard."],
  ["What do points do?", "Each favour carries the points its asker set. They land with the helper only once the favour is marked completed, so your balance is a record of the help you have given."],
  ["Can two people take the same favour?", "No. The first neighbour to accept it gets it, and everyone else sees that it has been taken."],
  ["What if plans change?", "The helper can cancel an accepted or started favour. No points move, and the asker can see what happened."],
  ["Does it replace the guardhouse?", "No. Guards still run the gate and the rounds. Jiran shows when each jalan was last patrolled, and the RA sees the same rounds in its monthly report."],
  ["Who can see my details?", "Neighbours see your name and jalan on the favours you post or accept. Your email address and account stay private to you."],
] as const;

const CREDITS = [
  ["Persiaran Neutron, Seksyen U16", "Wiki Farazi, CC0", "https://commons.wikimedia.org/wiki/File:Persiaran_Neutron,_Seksyen_U16_Shah_Alam_20231105_125029.jpg"],
  ["Sungai Subang, Elmina West", "Wiki Farazi, CC0", "https://commons.wikimedia.org/wiki/File:Sungai_Subang,_Elmina_West_20231105_105946.jpg"],
  ["Buggy path, Elmina West", "Wiki Farazi, CC0", "https://commons.wikimedia.org/wiki/File:Buggy_Path,_Elmina_West_20231105_110617.jpg"],
  ["Taman Sri Rembau", "AyyanD, CC BY-SA 4.0", "https://commons.wikimedia.org/w/index.php?curid=124125506"],
] as const;

function FavourFragment() {
  return (
    <div data-ui className="rounded-2xl bg-surface p-5 text-base leading-normal">
      <div className="flex gap-4">
        <p className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
          <span className="text-2xl leading-none font-bold tabular-nums">30</span>
          <span className="text-sm font-semibold">pts</span>
        </p>
        <div className="min-w-0 space-y-1">
          <p className="text-lg leading-snug font-semibold">Pick up groceries from Elmina Lakeside Mall</p>
          <p>A small bag, list shared on accept. Need it before 6pm.</p>
          <p className="text-sm text-ink-muted">Jalan Elmina 7 · by Daniel Tan · 4:12 pm</p>
        </div>
      </div>
      <p className="mt-4 flex justify-end">
        <span className="inline-flex min-h-11 items-center rounded-full bg-brand-strong px-5 text-sm font-semibold text-white">Accept favour</span>
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <div id="top" className="landing bg-paper text-lg text-ink">
      {/* Hero run: "Ji" and "ran" hold opposite corners for two screens while the township passes between them. */}
      <div className="relative">
        <div className="pointer-events-none sticky top-0 z-10 h-svh">
          <h1 className="text-mega leading-[0.85] font-extrabold tracking-[-0.05em] text-brand">
            <span className="mask absolute top-5 left-4 md:top-7 md:left-7">
              <span className="drop block">Ji</span>
            </span>
            <span className="mask absolute right-4 bottom-5 md:right-7 md:bottom-7">
              <span className="lift block">ran</span>
            </span>
          </h1>
        </div>

        <div className="-mt-[100svh]">
          {/* Screen 1 */}
          <section className="relative grid h-svh grid-cols-12 gap-x-6 px-4 md:px-7">
            <a href="/login" className="press absolute top-5 right-4 z-20 font-semibold md:hidden">
              Sign in
            </a>
            <div className="col-span-12 self-center pt-[30svh] md:col-span-6 md:col-start-3 md:pt-0 lg:col-span-5">
              <p className="rise max-w-[24ch] text-m leading-tight font-semibold" style={{ "--i": 0 } as React.CSSProperties}>
                Jiran is Malay for neighbour. Ask your jalan for a hand and help back for points.
              </p>
              <p className="rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--i": 1 } as React.CSSProperties}>
                <Link href="/login" className={BUTTON}>
                  Sign in to Jiran
                </Link>
                <Link href="/login?mode=signup" className={LINK}>
                  Create an account
                </Link>
              </p>
            </div>
            <nav aria-label="Sections" className="rise hidden flex-col items-end gap-3 self-center lg:col-span-1 lg:col-start-8 lg:flex" style={{ "--i": 2 } as React.CSSProperties}>
              <a href="#how" className="link whitespace-nowrap">How it works</a>
              <a href="#day" className="link whitespace-nowrap">A day in Elmina</a>
              <a href="#faq" className="link whitespace-nowrap">Questions</a>
            </nav>
            <figure className="absolute top-0 right-0 hidden h-[calc(100svh-var(--text-mega)-5rem)] w-[calc((100%-3.5rem)*4/12)] overflow-hidden md:block">
              <Image src={neutron} alt="Persiaran Neutron, a tree-lined township road in Shah Alam with a red-roofed bus stop" priority sizes="33vw" className="drift size-full object-cover object-[30%_50%]" />
            </figure>
            <figure className="absolute inset-x-0 top-[16svh] h-[24svh] overflow-hidden md:hidden">
              <Image src={neutron} alt="" priority sizes="100vw" className="drift size-full object-cover" />
            </figure>
          </section>

          {/* Screen 2 */}
          <section aria-label="A favour on Jalan Elmina 7" className="grid min-h-svh grid-cols-12 items-center gap-x-6 gap-y-10 px-4 py-32 md:px-7 md:py-0">
            <p className="enter col-span-12 text-m leading-tight font-semibold md:col-span-5 md:col-start-3 md:pr-12">
              Daniel needs groceries by six. Three doors down, someone says yes.
            </p>
            <div className="enter col-span-12 md:col-span-3 md:col-start-8" style={{ "--i": 1 } as React.CSSProperties}>
              <FavourFragment />
            </div>
          </section>
        </div>
      </div>

      {/* Intro */}
      <section className="grid grid-cols-12 gap-x-6 px-5 py-28 md:px-[5vw] md:py-40">
        <p className="enter col-span-12 text-m leading-[1.3] md:col-span-6 md:col-start-7 md:mt-[18vh] md:indent-[3em]">
          Elmina already runs on small favours. Jiran puts them where the whole jalan can see.
        </p>
        <figure className="col-span-12 mt-12 grid grid-cols-[30%_62%] justify-between md:col-span-6 md:col-start-1 md:row-start-2 md:mt-4 md:flex md:flex-col md:items-start md:gap-6">
          <div className="enter col-start-2 row-start-1 aspect-[4/5] overflow-hidden md:aspect-square md:w-[20vw]" style={{ "--i": 1 } as React.CSSProperties}>
            <Image src={river} alt="Sungai Subang, a brown river between grassy banks and rainforest at Elmina West" sizes="(min-width: 768px) 20vw, 62vw" className="size-full object-cover" />
          </div>
          <figcaption className="enter col-start-1 row-start-1 self-end text-sm text-ink-muted md:w-[180px] md:self-start" style={{ "--i": 2 } as React.CSSProperties}>
            Sungai Subang, where it runs through Elmina West, Seksyen U15, Shah Alam. Photograph by Wiki Farazi, CC0.
          </figcaption>
        </figure>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-8 px-5 py-28 md:py-40 md:pl-[30vw]">
        <div className="max-w-[580px]">
          <h2 className="enter text-m">From ask to points</h2>
          <ol className="mt-12 space-y-[72px]">
            <li>
              <p className="enter" style={{ "--i": 1 } as React.CSSProperties}>
                <b>To ask,</b> write what you need, where and by when, and set the points you will give. Fifteen for a parcel run, fifty for a sofa up the stairs.
              </p>
              <div data-ui className="enter mt-5 space-y-3 rounded-2xl bg-surface p-5 text-base" style={{ "--i": 2 } as React.CSSProperties}>
                <p className="flex min-h-11 items-center rounded-xl bg-surface-2 px-4">Water plants while I&apos;m away</p>
                <div className="flex gap-3">
                  <p className="flex min-h-11 flex-1 items-center rounded-xl bg-surface-2 px-4">Jalan Elmina 7</p>
                  <p className="flex min-h-11 items-center gap-2 rounded-xl bg-gold-soft px-4 font-semibold text-gold-ink tabular-nums">25 pts</p>
                </div>
                <p className="flex justify-end">
                  <span className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">Post to the jalan</span>
                </p>
              </div>
            </li>
            <li>
              <p className="enter">
                <b>Once a neighbour accepts,</b> the favour is theirs alone. No one else can take it, and you can see who is coming and when they started.
              </p>
              <div data-ui className="enter mt-5 flex items-center justify-between gap-4 rounded-2xl bg-surface p-5 text-base" style={{ "--i": 1 } as React.CSSProperties}>
                <div>
                  <p className="font-semibold">Jump-start my car</p>
                  <p className="text-sm text-ink-muted">Jalan Elmina 3 · helped by Priya Nair</p>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-full bg-gold-soft px-3 text-sm font-semibold text-gold-ink">Accepted</span>
              </div>
            </li>
            <li>
              <p className="enter">
                <b>When it&apos;s done,</b> the helper marks it completed and the points land in their balance. If plans change, they can cancel and no points move.
              </p>
              <div data-ui className="enter mt-5 flex items-end justify-between gap-4 rounded-2xl bg-deep p-5 text-base text-on-dark" style={{ "--i": 1 } as React.CSSProperties}>
                <p className="flex flex-col-reverse">
                  <span className="text-sm text-on-dark-muted">Your points</span>
                  <span className="text-3xl font-bold tabular-nums">
                    55 <span className="text-base font-semibold text-gold">pts</span>
                  </span>
                </p>
                <p className="text-right text-sm">
                  <span className="block font-semibold text-gold tabular-nums">+40</span>
                  <span className="text-on-dark-muted">Jump-start my car</span>
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* A day in Elmina: the live thing */}
      <section id="day" className="scroll-mt-8 px-5 py-28 md:px-7 md:py-40">
        <h2 className="enter max-w-[22ch] text-m md:pl-[3vw]">A day in Elmina, hour by hour</h2>
        <p className="enter mt-6 max-w-[52ch] md:pl-[3vw]" style={{ "--i": 1 } as React.CSSProperties}>
          Residents trade favours, resident administration keeps the township running, and guards walk the rounds. Slide through the day to see who&apos;s up.
        </p>
        <DayInElmina day={path} night={dusk} />
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-8 px-5 py-28 md:px-7 md:py-40">
        <h2 className="enter text-m">Questions from the jalan</h2>
        <div className="mt-12 md:mt-20 md:grid md:grid-cols-12 md:gap-x-6">
          <div className="space-y-2 md:col-span-8 md:col-start-5">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="faq enter group -mx-5 px-5 py-4 transition-colors duration-200 open:bg-surface-2 md:-mx-6 md:px-6" style={{ "--i": i % 3 } as React.CSSProperties}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-m leading-snug font-medium">
                  {q}
                  <span aria-hidden className="chev size-3 shrink-0 rotate-45 border-r-2 border-b-2 border-current transition-transform duration-300 group-open:-rotate-135" />
                </summary>
                <p className="mt-4 max-w-[48ch] pb-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Close: the idea again, inverted */}
      <section className="flex min-h-[80svh] flex-col justify-between bg-deep px-5 pt-20 pb-10 text-on-dark md:min-h-[90svh] md:px-7 md:pt-28">
        <p className="enter text-[14vw] leading-[0.9] font-extrabold md:text-mega tracking-[-0.05em]">
          Your turn,
          <br />
          jiran.
        </p>
        <div className="mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="enter max-w-[40ch]" style={{ "--i": 1 } as React.CSSProperties}>
            Sign in with your email or Google account. Takes about a minute.
          </p>
          <Link href="/login" className={`${BUTTON} enter w-full md:w-auto`} style={{ "--i": 2 } as React.CSSProperties}>
            Sign in to Jiran
          </Link>
        </div>
      </section>

      <footer className="overflow-hidden bg-deep px-5 pt-40 pb-8 text-on-dark md:px-7">
        <div className="grid gap-x-6 gap-y-14 md:grid-cols-12">
          <ul className="space-y-2 text-m font-semibold md:col-span-5">
            <li>
              <a href="https://www.simedarbyproperty.com/" className="link text-brand-bright">City of Elmina</a>
            </li>
            <li className="text-on-dark-muted">Shah Alam, Selangor</li>
          </ul>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-7 md:grid-cols-3">
            <ul className="space-y-2">
              <li><a href="#how" className="link">How it works</a></li>
              <li><a href="#day" className="link">A day in Elmina</a></li>
              <li><a href="#faq" className="link">Questions</a></li>
            </ul>
            <ul className="space-y-2">
              <li><Link href="/login" className="link">Sign in</Link></li>
              <li><Link href="/login?mode=signup" className="link">Create an account</Link></li>
            </ul>
            <ul className="col-span-2 space-y-2 text-sm text-on-dark-muted md:col-span-1">
              {CREDITS.map(([title, by, href]) => (
                <li key={href}>
                  <a href={href} className="link">{title}</a>, {by}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-24 flex justify-between gap-6 text-sm text-on-dark-muted">
          <span>Built for the Sime Darby Property University Hackathon, 2026.</span>
          <a href="#top" className="link">Back to top</a>
        </p>
        <p aria-hidden className="text-name -mb-[0.2em] mt-10 leading-[0.8] font-extrabold tracking-[-0.06em] text-brand-bright">Jiran</p>
      </footer>
    </div>
  );
}
