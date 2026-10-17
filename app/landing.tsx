"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";

type Who = "Resident" | "RA" | "Guard";
type Row = { at: number; what: string; who: Who; pts?: number };

// Sample day for the landing page; not live data.
const DAY: Row[][] = [
  [
    { at: 7, what: "Morning handover at the main guardhouse", who: "Guard" },
    { at: 8.5, what: "Porch plants watered over the weekend", who: "Resident", pts: 25 },
    { at: 10, what: "Grass cutting notice for Jalan Elmina 3 to 12", who: "RA" },
    { at: 11.5, what: "Parcel collected from the guardhouse", who: "Resident", pts: 15 },
  ],
  [
    { at: 13, what: "Streetlight fault on Jalan Elmina 7 logged", who: "RA" },
    { at: 15.5, what: "Loose cabinet hinge fixed", who: "Resident", pts: 35 },
    { at: 17.75, what: "Groceries from Elmina Lakeside Mall", who: "Resident", pts: 30 },
  ],
  [
    { at: 19, what: "Sofa carried up to the first floor", who: "Resident", pts: 50 },
    { at: 20.5, what: "Evening round of every jalan", who: "Guard" },
    { at: 22, what: "Monthly report on favours and patrols", who: "RA" },
  ],
  [
    { at: 0, what: "Midnight round", who: "Guard" },
    { at: 2, what: "Checkpoint at Jalan Elmina 12 cleared", who: "Guard" },
    { at: 5.5, what: "Last round before the morning handover", who: "Guard" },
  ],
];
const ROWS = DAY.flat();

const WHO_INK: Record<Who, string> = { Resident: "text-brand", RA: "text-tech-ink", Guard: "text-gold-ink" };
const WHO_LABEL: Record<Who, string> = { Resident: "Resident", RA: "Resident admin", Guard: "Guard" };

const clock = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const spoken = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "am" : "pm"}`;
};

// The latest row at or before the hour, wrapping past midnight.
const current = (h: number) =>
  ROWS.reduce((best, r) => {
    const d = (h - r.at + 24) % 24;
    return d < (h - best.at + 24) % 24 ? r : best;
  });

export function DayInElmina({ day, night }: { day: StaticImageData; night: StaticImageData }) {
  const [hour, setHour] = useState(20.5);
  useEffect(() => {
    const [h, m] = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hourCycle: "h23", timeZone: "Asia/Kuala_Lumpur" })
      .format(new Date())
      .split(":")
      .map(Number);
    // Syncing to the visitor's clock after hydration; the server renders a fixed evening.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(h + Math.floor(m / 15) / 4);
  }, []);
  const now = current(hour);
  const isNight = hour < 7 || hour >= 19;

  return (
    <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-12 md:mt-24">
      <figure className="enter order-last col-span-8 col-start-5 self-end md:order-none md:col-span-4 md:col-start-1 md:row-start-1" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          <Image src={day} alt="Gravel buggy path into the forest at Elmina West" sizes="(min-width: 768px) 30vw, 60vw" className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${isNight ? "opacity-0" : "opacity-100"}`} />
          <Image src={night} alt="A row of terraced houses at dusk under low cloud" sizes="(min-width: 768px) 30vw, 60vw" className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${isNight ? "opacity-100" : "opacity-0"}`} />
        </div>
        <figcaption className="mt-3 text-sm text-ink-muted">
          {isNight ? "Terraced houses at dusk, Taman Sri Rembau. AyyanD, CC BY-SA 4.0." : "Buggy path, Elmina West. Wiki Farazi, CC0."}
        </figcaption>
      </figure>

      <div className="col-span-12 md:col-span-6 md:col-start-7 md:row-start-1">
        <label className="enter block" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="block text-m font-semibold tabular-nums">
            It&apos;s <output>{spoken(hour)}</output> in Elmina
          </span>
          <input
            type="range"
            min={0}
            max={23.75}
            step={0.25}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            aria-valuetext={spoken(hour)}
            className="day-slider mt-5 w-full"
          />
          <span className="mt-2 flex justify-between text-sm text-ink-muted tabular-nums" aria-hidden>
            <span>00:00</span>
            <span>12:00</span>
            <span>23:45</span>
          </span>
        </label>

        <table className="mt-12 w-full border-separate border-spacing-0">
          <caption className="sr-only">A sample day in City of Elmina</caption>
          <thead className="sr-only">
            <tr>
              <th>Time</th>
              <th>What happens</th>
              <th className="hidden md:table-cell">Who</th>
            </tr>
          </thead>
          {DAY.map((group, g) => (
            <tbody key={g} className="enter" style={{ "--i": g + 1 } as React.CSSProperties}>
              {group.map((r, i) => {
                const on = r === now;
                return (
                  <tr
                    key={r.what}
                    aria-current={on ? "time" : undefined}
                    className={`transition-colors duration-300 ${on ? "bg-surface-2" : ""}`}
                  >
                    <td className={`w-16 py-3 pl-3 align-top tabular-nums md:w-[18%] ${on ? "font-bold" : "text-ink-muted"} ${i === 0 && g > 0 ? "pt-11" : ""}`}>{clock(r.at)}</td>
                    <td className={`py-3 pr-3 align-top md:pr-4 ${i === 0 && g > 0 ? "pt-11" : ""} ${on ? "font-semibold" : ""}`}>
                      <span className={`block font-semibold md:hidden ${WHO_INK[r.who]}`}>
                        {WHO_LABEL[r.who]}
                        {r.pts && <span className="font-normal text-ink-muted tabular-nums"> · {r.pts} pts</span>}
                      </span>
                      {r.what}
                    </td>
                    <td className={`hidden py-3 pr-3 text-right align-top whitespace-nowrap md:table-cell ${i === 0 && g > 0 ? "pt-11" : ""}`}>
                      <span className={`font-semibold ${WHO_INK[r.who]}`}>{WHO_LABEL[r.who]}</span>
                      {r.pts && <span className="block text-sm text-ink-muted tabular-nums">{r.pts} pts</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
