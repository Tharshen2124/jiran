"use client";

import { useEffect, useState } from "react";

// Sample favours for the landing page; not live data.
const FAVOURS = [
  { pts: 30, what: "Groceries from Elmina Lakeside Mall", where: "Jalan Elmina 7" },
  { pts: 15, what: "Parcel collected from the guardhouse", where: "Jalan Elmina 3" },
  { pts: 50, what: "Sofa carried up to the first floor", where: "Jalan Elmina 9" },
  { pts: 25, what: "Porch plants watered over the weekend", where: "Jalan Elmina 12" },
  { pts: 40, what: "Jump-start for a flat car battery", where: "Jalan Elmina 3" },
  { pts: 35, what: "Loose cabinet hinge fixed", where: "Jalan Elmina 5" },
];

export function Headline() {
  const [i, setI] = useState(0);
  const f = FAVOURS[i];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((i + 1) % FAVOURS.length), 3200);
    return () => clearTimeout(t);
  }, [i]);

  return (
    <>
      <h1 className="text-[11vw] md:text-[min(12.5vw,240px)] leading-[0.95] font-extrabold tracking-[-0.045em]">
        <span className="mask block">
          <span className="lift block">Ask next door,</span>
        </span>
        <span className="mask block">
          <span className="lift block" style={{ animationDelay: "380ms" }}>
            help back{" "}
            <button
              type="button"
              onClick={() => setI((i + 1) % FAVOURS.length)}
              aria-label={`${f.pts} points. Show another favour`}
              className="press inline-flex h-[0.8em] translate-y-[-0.04em] cursor-pointer items-baseline justify-center gap-[0.08em] overflow-hidden rounded-[0.16em] bg-gold px-[0.24em] pt-[0.1em] align-baseline text-deep transition-colors duration-200 hover:bg-white"
            >
              <span key={i} className="tick text-[0.62em] tabular-nums">+{f.pts}</span>
              <span className="text-[0.28em] tracking-normal">pts</span>
            </button>
          </span>
        </span>
      </h1>
      <p key={i} className="tick mt-6 min-h-[3.2em] text-lg md:mt-8 md:min-h-0 md:text-xl" aria-live="polite">
        <span className="font-semibold">{f.what}</span>
        <span className="hidden md:inline"> · </span>
        <span className="block md:inline">{f.where}</span>
      </p>
    </>
  );
}
