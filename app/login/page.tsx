import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "./form";

export const metadata: Metadata = { title: "Sign in · Jiran" };

export default function LoginPage() {
  return (
    <div className="landing grid min-h-svh bg-paper text-lg text-ink md:grid-cols-[5fr_7fr]">
      <aside className="relative flex min-h-[38svh] flex-col justify-between overflow-hidden bg-deep p-5 text-on-dark md:min-h-svh md:p-7">
        <p className="relative max-w-[30ch]">Ask your jalan for a hand, help back for points.</p>
        <p className="mask relative">
          <span className="lift block text-mega leading-[0.85] font-extrabold tracking-[-0.05em] text-brand-bright">Jiran</span>
        </p>
      </aside>
      <main className="flex items-center justify-center px-5 py-16 md:px-7">
        <Suspense fallback={<div className="h-[36rem] w-full max-w-[26rem]" />}>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
