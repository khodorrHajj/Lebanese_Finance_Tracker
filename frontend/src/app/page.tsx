"use client";

import Link from "next/link";
import {
  ArrowRight,
  Landmark,
  Mail,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { contactAdmin } from "@/lib/api";

const highlights = [
  {
    title: "Live USD and LBP visibility",
    description:
      "Track cash, cards, and wallet balances with exchange-rate-aware totals built for Lebanese day-to-day money flow.",
    icon: Wallet,
  },
  {
    title: "Fast transaction control",
    description:
      "Organize spending with categories, recent activity filters, and a cleaner overview of where your money moves.",
    icon: TrendingUp,
  },
  {
    title: "Built for mobile habits",
    description:
      "Use it on desktop or phone to check balances, confirm transactions, and refresh the latest rate in seconds.",
    icon: Smartphone,
  },
  {
    title: "Security-first account design",
    description:
      "Google OAuth, optional 2FA, verification flows, and backend-backed authentication.",
    icon: ShieldCheck,
  },
];

const reviews = [
  {
    name: "Maya A.",
    role: "Freelancer in Beirut",
    quote:
      "Finally an app that treats USD and LBP like real life instead of pretending I only use one currency.",
  },
  {
    name: "Karim H.",
    role: "Small business owner",
    quote:
      "The wallet totals and transaction view make it much easier to see what I actually have available today.",
  },
  {
    name: "Rana S.",
    role: "University student",
    quote: "The exchange-rate dashboard is what made me keep using it.",
  },
];

const aboutPoints = [
  "LiraTrack was designed around the Lebanese reality of switching between currencies.",
  "The product focuses on clarity first: readable balances, exchange-rate context, and fewer steps to capture transactions.",
  "It is meant to feel practical on a normal day, whether you are checking a cash wallet, a card balance, or recent spending from your phone.",
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [contactState, setContactState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleContactSubmit() {
    setContactState("sending");
    try {
      await contactAdmin(contactForm);
      setContactForm({ name: "", email: "", message: "" });
      setContactState("sent");
    } catch {
      setContactState("error");
    }
  }

  if (loading || user) {
    return null;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4efe6] text-slate-950">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(252,211,77,0.55),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(14,116,144,0.22),_transparent_34%),linear-gradient(180deg,_#fff7ed_0%,_#f4efe6_58%,_#f6f6f4_100%)]" />
        <div className="absolute left-[-140px] top-28 -z-10 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute right-[-80px] top-36 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:pb-24">
          <div className="flex items-center justify-between gap-4 rounded-full border border-white/60 bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                LT
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  LiraTrack
                </p>
                <p className="text-xs text-slate-600">
                  Lebanese finance tracking for dual-currency reality
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium !text-white transition hover:bg-slate-800"
              >
                Sign up
                <ArrowRight className="h-4 w-4 text-white" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-4 py-2 text-sm font-medium text-amber-950">
                <Landmark className="h-4 w-4" />
                Built around Lebanon
              </div>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-6xl">
                LiraTrack gives your USD and LBP money a dashboard that finally
                makes sense.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
                Follow wallets, exchange rates, transactions, and day-to-day
                balances in one place. LiraTrack was shaped for people who live
                with both currencies and need a faster read on what they
                actually own.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-medium !text-white transition hover:bg-slate-800"
                >
                  Start with LiraTrack
                  <ArrowRight className="h-4 w-4 text-white" />
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  Go to login
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm text-slate-500">Focus</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    USD + LBP
                  </p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm text-slate-500">Use case</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    Wallet clarity
                  </p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm text-slate-500">Workflow</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    Fast daily checks
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-[2rem] bg-slate-950/10 blur-xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_58%)]" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
                        LiraTrack
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        A clearer daily money view
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 text-amber-300">
                      <Wallet className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/8 p-5 ring-1 ring-white/10">
                      <p className="text-sm text-slate-300">Net worth</p>
                      <p className="mt-3 text-3xl font-semibold">$12,480</p>
                      <p className="mt-2 text-sm text-emerald-300">
                        Updated with the latest rate
                      </p>
                    </div>
                    <div className="rounded-3xl bg-amber-300/15 p-5 ring-1 ring-amber-200/20">
                      <p className="text-sm text-amber-100">
                        Live exchange rate
                      </p>
                      <p className="mt-3 text-3xl font-semibold">89,500 LBP</p>
                      <p className="mt-2 text-sm text-amber-50">
                        Refresh when the market moves
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl bg-white p-5 text-slate-950">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">
                          Recent activity
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          Built for quick daily reading
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Loved by early users
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-medium">Cash USD wallet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Clean balance tracking across accounts
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-medium">
                          Categories and recent filters
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Faster review of where money went this week
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur"
              >
                <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-slate-950">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] bg-[#12343b] p-8 text-white shadow-xl">
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-100">
                About Us
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                LiraTrack exists because Lebanese money management has its own
                rules.
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-slate-200">
                {aboutPoints.map((point) => (
                  <p key={point}>{point}</p>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {reviews.map((review) => (
                <article
                  key={review.name}
                  className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <p className="mt-4 text-lg leading-8 text-slate-700">
                    “{review.quote}”
                  </p>
                  <div className="mt-5">
                    <p className="font-semibold text-slate-950">
                      {review.name}
                    </p>
                    <p className="text-sm text-slate-500">{review.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:pb-24">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                Need onboarding help or want to ask about the app?
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Send a message and the admin inbox will receive it directly. Use
                this for support, questions, or feedback about how LiraTrack
                should evolve.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Contact the LiraTrack team
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Support, onboarding, feedback, or product questions.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Your name"
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
                <textarea
                  value={contactForm.message}
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Tell us what you need."
                  rows={5}
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />

                {contactState === "sent" ? (
                  <p className="text-sm text-emerald-700">
                    Your message was sent.
                  </p>
                ) : null}
                {contactState === "error" ? (
                  <p className="text-sm text-rose-700">
                    Unable to send your message right now.
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleContactSubmit()}
                  disabled={
                    contactState === "sending" ||
                    !contactForm.name ||
                    !contactForm.email ||
                    !contactForm.message
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {contactState === "sending" ? "Sending..." : "Send Message"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200/70 bg-[#efe7d8]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                LiraTrack
              </p>
              <p className="mt-4 max-w-md text-base leading-7 text-slate-700">
                Money tracking shaped for Lebanon&apos;s dual-currency reality,
                with clearer wallet balances, recent activity, and live
                exchange-rate context.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quick Links
              </h2>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700">
                <Link
                  href="/register"
                  className="transition hover:text-slate-950"
                >
                  Create account
                </Link>
                <Link href="/login" className="transition hover:text-slate-950">
                  Login
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    window.scrollTo({
                      top: document.body.scrollHeight,
                      behavior: "smooth",
                    })
                  }
                  className="text-left transition hover:text-slate-950"
                >
                  Contact us
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Why It Fits
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>Built for USD and LBP balances.</p>
                <p>Designed for quick phone checks.</p>
                <p>Made to keep wallet totals readable.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
