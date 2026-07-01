"use client";

import { Suspense, lazy, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Home,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  MessageCircle,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  Wallet,
} from "lucide-react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export default function GraphCoachPreview() {
  const [active, setActive] = useState(false);

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      {/* Clean graphite background */}
      <div className="pointer-events-none fixed inset-0 bg-[#0B0B0C]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,#0B0B0C_0%,#111113_50%,#0B0B0C_100%)]" />

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/[0.08] bg-[#0B0B0C]/95">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E50914] text-base font-black text-white">
              G
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              GRAPH
            </span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-white/60 md:flex">
            <span className="text-white">Coach</span>
            <span>Plan</span>
            <span>Credit</span>
            <span>Progress</span>
            <span>Resources</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] sm:block">
              Log in
            </button>
            <button className="rounded-full bg-[#E50914] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#c90812]">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Main layout */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left content */}
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
            GRAPH Coach Mode
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl xl:text-7xl">
            Mortgage readiness,
            <span className="mt-2 block text-[#E50914]">
              simplified.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-white/60">
            GRAPH turns your goal into a clean action plan. Tap your coach to
            reveal your next move, understand your blockers, and stay on track
            toward buying a home.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E50914] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c90812]">
              Start your plan
              <ArrowRight size={17} />
            </button>

            <button className="inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.08]">
              See how it works
            </button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <FeaturePill icon={<ShieldCheck size={17} />} label="Secure" />
            <FeaturePill icon={<CalendarDays size={17} />} label="12-month plan" />
            <FeaturePill icon={<Wallet size={17} />} label="Budget-aware" />
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E50914]">
              Current Mission
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-white">
                  Pay card balances below 30% before statement date.
                </p>
                <p className="mt-1 text-sm text-white/45">
                  Estimated impact: +20 to +40 points in 30–45 days.
                </p>
              </div>

              <button className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200">
                Take Action
              </button>
            </div>
          </div>
        </div>

        {/* Right product card */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#141416] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            {/* Product card header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-white">
                  Interactive Coach
                </p>
                <p className="text-sm text-white/45">
                  Click the coach to reveal your financial path.
                </p>
              </div>

              <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60">
                LIVE PREVIEW
              </div>
            </div>

            {/* Coach area */}
            <div className="relative h-[620px] bg-[linear-gradient(to_bottom,#19191C,#101012)]">
              {/* Subtle floor line */}
              <div className="pointer-events-none absolute bottom-24 left-1/2 h-px w-[70%] -translate-x-1/2 bg-white/[0.08]" />

              {/* Floating cards after click */}
              {active && (
                <>
                  <FloatingCard className="left-5 top-6">
                    <CardItem
                      icon={<Home size={16} />}
                      label="Goal"
                      value="Buy a house in 12 months"
                    />
                  </FloatingCard>

                  <FloatingCard className="right-5 top-6">
                    <CardItem
                      icon={<TrendingUp size={16} />}
                      label="Readiness"
                      value="62%"
                      big
                    />
                  </FloatingCard>

                  <FloatingCard className="left-5 bottom-28">
                    <CardItem
                      icon={<AlertTriangle size={16} />}
                      label="Top Blocker"
                      value="High utilization"
                    />
                  </FloatingCard>

                  <FloatingCard className="right-5 bottom-28">
                    <CardItem
                      icon={<CreditCard size={16} />}
                      label="Next Mission"
                      value="Cards below 30%"
                    />
                  </FloatingCard>
                </>
              )}

              {/* Robot */}
              <div
                onClick={() => setActive(!active)}
                className="absolute left-1/2 top-[52%] z-20 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 cursor-pointer transition duration-300 hover:scale-[1.015]"
              >
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/60">
                      Loading GRAPH Coach...
                    </div>
                  }
                >
                  <Spline
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="h-full w-full"
                  />
                </Suspense>
              </div>

              {/* Click button */}
              <button
                onClick={() => setActive(!active)}
                className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/[0.1] bg-[#1C1C1F] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#E50914]/50 hover:bg-[#222225]"
              >
                <MessageCircle size={16} className="text-[#E50914]" />
                {active ? "Hide coach insights" : "Tap GRAPH Coach"}
              </button>
            </div>
          </div>

          {/* Bottom stats card */}
          <div className="relative mx-auto -mt-8 max-w-[90%] rounded-[1.5rem] border border-white/[0.08] bg-[#151518] p-5 shadow-2xl">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoStat title="Readiness" value="62%" />
              <InfoStat title="Timeline" value="12 months" />
              <InfoStat title="Priority" value="Utilization" />
            </div>

            <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#E50914]">
              View full action roadmap
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FloatingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-30 w-[230px] rounded-2xl border border-white/[0.08] bg-[#1B1B1E]/95 p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function CardItem({
  icon,
  label,
  value,
  big = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-[#E50914]">
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
          {label}
        </p>
        <p
          className={
            big
              ? "text-2xl font-black text-white"
              : "text-sm font-semibold text-white"
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#141416] px-4 py-3 text-sm font-medium text-white/65">
      <span className="text-[#E50914]">{icon}</span>
      {label}
    </div>
  );
}

function InfoStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}