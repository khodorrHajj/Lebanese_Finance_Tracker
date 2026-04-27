"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/types";

const TOUR_STORAGE_KEY = "liratrack_tour_dismissed";
const START_TOUR_EVENT = "liratrack:start-tour";

const SPOTLIGHT_PAD = 8;

const steps = [
  {
    path: "/wallets",
    selector: "[data-tour='nav-wallets']",
    title: { en: "Start with wallets", ar: "ابدأ بالمحافظ" },
    description: {
      en: "Wallets hold your cash, card, and bank balances.",
      ar: "المحافظ تجمع أرصدة النقد والبطاقات والحسابات.",
    },
  },
  {
    path: "/wallets",
    selector: "[data-tour='add-wallet']",
    title: { en: "Add a wallet", ar: "أضف محفظة" },
    description: {
      en: "Create a USD wallet, LBP wallet, or both before tracking money.",
      ar: "أنشئ محفظة دولار أو ليرة أو الاثنين قبل تتبع المال.",
    },
  },
  {
    path: "/transactions",
    selector: "[data-tour='nav-transactions']",
    title: { en: "Track transactions", ar: "تابع المعاملات" },
    description: {
      en: "Transactions show what changed in your wallets.",
      ar: "المعاملات تعرض ما تغيّر في محافظك.",
    },
  },
  {
    path: "/transactions",
    selector: "[data-tour='add-transaction']",
    title: { en: "Add manually", ar: "أضف يدوياً" },
    description: {
      en: "Use quick manual entry for normal income or expenses.",
      ar: "استخدم الإدخال السريع للدخل أو المصروفات العادية.",
    },
  },
  {
    path: "/transactions",
    selector: "[data-tour='review-queue']",
    title: { en: "Review drafts", ar: "راجع المسودات" },
    description: {
      en: "Receipt scans, SMS drafts, and scheduled items wait here before saving.",
      ar: "مسودات الإيصالات والرسائل والمعاملات المجدولة تنتظر هنا قبل الحفظ.",
    },
  },
];

interface AppTourProps {
  locale: Locale;
}

export function AppTour({ locale }: AppTourProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const frameRef = useRef<number | null>(null);
  const scrolledStepRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(0);

  const step = steps[stepIndex];

  useEffect(() => {
    function handleStartTour() {
      window.localStorage.removeItem(TOUR_STORAGE_KEY);
      setStepIndex(0);
      setIsDismissed(false);
      setIsVisible(false);
    }

    window.addEventListener(START_TOUR_EVENT, handleStartTour);
    return () => window.removeEventListener(START_TOUR_EVENT, handleStartTour);
  }, []);

  useEffect(() => {
    if (isDismissed || !step) return;

    if (pathname !== step.path) {
      setIsVisible(false);
      router.push(step.path);
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const settleDelay = isMobile ? 400 : 150;

    function updateTarget(shouldScroll: boolean) {
      const el = document.querySelector(step.selector);
      if (!el) return;

      if (shouldScroll) {
        el.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: isMobile ? "auto" : "smooth",
        });
        scrolledStepRef.current = stepIndex;
      }

      setTargetRect(el.getBoundingClientRect());
      requestAnimationFrame(() => setIsVisible(true));
    }

    const timer = setTimeout(() => {
      updateTarget(scrolledStepRef.current !== stepIndex);
    }, settleDelay);

    function throttledUpdate() {
      const now = performance.now();
      if (now - lastUpdateTimeRef.current < 48) return;
      lastUpdateTimeRef.current = now;

      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const el = document.querySelector(step.selector);
        if (el) setTargetRect(el.getBoundingClientRect());
      });
    }

    window.addEventListener("resize", throttledUpdate);
    window.addEventListener("scroll", throttledUpdate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", throttledUpdate);
      window.removeEventListener("scroll", throttledUpdate, true);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isDismissed, pathname, router, step, stepIndex]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect) {
      return { left: 24, top: 96, width: Math.min(320, window.innerWidth - 32) };
    }

    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const left = Math.min(
      Math.max(targetRect.left, 16),
      Math.max(16, window.innerWidth - tooltipWidth - 16),
    );
    const tooltipHeight = 180;
    const belowTop = targetRect.bottom + SPOTLIGHT_PAD + 10;
    const top =
      belowTop + tooltipHeight > window.innerHeight
        ? Math.max(16, targetRect.top - tooltipHeight - SPOTLIGHT_PAD - 10)
        : belowTop;

    return { left, top, width: tooltipWidth };
  }, [targetRect]);

  if (isDismissed || !step) return null;

  function handleSkip() {
    setIsVisible(false);
    setTimeout(() => {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
      setIsDismissed(true);
    }, 200);
  }

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      handleSkip();
      return;
    }

    setIsVisible(false);
    setTimeout(() => {
      setStepIndex((current) => current + 1);
    }, 200);
  }

  const showOverlay = Boolean(targetRect);

  return (
    <>
      {!isDismissed && (
        <div className="fixed inset-0 z-40" />
      )}
      {showOverlay ? (
        <>
          <div
            className={`fixed inset-x-0 top-0 z-50 bg-slate-950/50 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{ height: Math.max(0, targetRect!.top - SPOTLIGHT_PAD) }}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 bg-slate-950/50 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{ top: targetRect!.bottom + SPOTLIGHT_PAD }}
          />
          <div
            className={`fixed left-0 z-50 bg-slate-950/50 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{
              top: targetRect!.top - SPOTLIGHT_PAD,
              height: targetRect!.height + SPOTLIGHT_PAD * 2,
              width: Math.max(0, targetRect!.left - SPOTLIGHT_PAD),
            }}
          />
          <div
            className={`fixed right-0 z-50 bg-slate-950/50 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{
              top: targetRect!.top - SPOTLIGHT_PAD,
              height: targetRect!.height + SPOTLIGHT_PAD * 2,
              width: Math.max(0, window.innerWidth - targetRect!.right - SPOTLIGHT_PAD),
            }}
          />
          <div
            className={`pointer-events-none fixed z-[51] rounded-2xl border-2 border-amber-400 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{
              left: targetRect!.left - SPOTLIGHT_PAD,
              top: targetRect!.top - SPOTLIGHT_PAD,
              width: targetRect!.width + SPOTLIGHT_PAD * 2,
              height: targetRect!.height + SPOTLIGHT_PAD * 2,
            }}
          />
          <div
            className={`fixed z-[51] transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            style={{
              left: targetRect!.left - SPOTLIGHT_PAD,
              top: targetRect!.top - SPOTLIGHT_PAD,
              width: targetRect!.width + SPOTLIGHT_PAD * 2,
              height: targetRect!.height + SPOTLIGHT_PAD * 2,
            }}
          />
        </>
      ) : null}
      <div
        className={`fixed z-[60] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {step.title[locale]}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {step.description[locale]}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
            aria-label={t("dismiss", locale)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--muted)]">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t("dismiss", locale)}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {stepIndex >= steps.length - 1 ? t("saved", locale) : t("next", locale)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
