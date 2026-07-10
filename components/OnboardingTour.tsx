"use client";

import { useEffect, useState, useCallback } from "react";
import { hasTourSeen, markTourSeen } from "@/utils/tour";

type Step = {
  title: string;
  body: string;
  // CSS selector for the element to spotlight. Omit for a centered card
  // (used for the welcome step, and as a graceful fallback wherever the
  // target doesn't exist on the current layout, e.g. the profile box isn't
  // rendered in the mobile header).
  target?: string;
};

const BASE_STEPS: Step[] = [
  {
    title: "Welcome to HalifaQ! 👋",
    body: "A quick 30-second tour of how things work here — skip anytime with the button below.",
  },
  {
    title: "Browse by topic",
    body: "Housing, Jobs, Food, Visa & Immigration, and more. Click any category to see only posts about that topic.",
    target: '[data-tour="categories"]',
  },
  {
    title: "Search anything",
    body: "Look up posts or people. Leave it empty to see what's trending, or press Enter for full results.",
    target: '[data-tour="search"]',
  },
  {
    title: "All / Following / Hot / For You",
    body: '"All" shows everything, "Following" is just people you follow, "Hot" ranks by engagement, and "For You" learns from what you\'ve liked.',
    target: '[data-tour="feed-tabs"]',
  },
  {
    title: "Like, reply, and view posts",
    body: "Tap the heart to like a post, click it to read and reply, and reply to any comment to keep a thread going.",
    target: '[data-tour="posts"]',
  },
  {
    title: "Ask something",
    body: "Tap the + button any time to post a question — add photos or a video, and tag it with categories so the right people see it.",
    target: '[data-tour="new-post"]',
  },
  {
    title: "Your inbox",
    body: "Direct messages, likes, and replies all land here. The red number shows what's new.",
    target: '[data-tour="inbox"]',
  },
  {
    title: "That's you",
    body: 'Click your name to edit your profile (username, school, bio) and pick a color theme. To follow or message someone else, just visit their profile — click any username anywhere on the site.',
    target: '[data-tour="profile-box"]',
  },
];

const ADMIN_STEP: Step = {
  title: "You have admin powers",
  body: "You can delete any post and send warnings to users who break the rules — look for the extra buttons on posts. Your Admin badge shows up next to your name everywhere.",
};

const SPOTLIGHT_PADDING = 8;

export default function OnboardingTour({ isAdmin }: { isAdmin: boolean }) {
  const steps = isAdmin ? [...BASE_STEPS, ADMIN_STEP] : BASE_STEPS;

  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Show the tour once, a beat after the feed has had a chance to render
  // (so target elements actually exist in the DOM to measure).
  useEffect(() => {
    if (hasTourSeen()) return;
    const timeout = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timeout);
  }, []);

  // Let other parts of the app (a "Retake tour" button) reopen this same
  // instance without a page reload.
  useEffect(() => {
    function handleReplay() {
      setStepIndex(0);
      setVisible(true);
    }
    window.addEventListener("halifaq-tour-replay", handleReplay);
    return () => window.removeEventListener("halifaq-tour-replay", handleReplay);
  }, []);

  const measure = useCallback(() => {
    const step = steps[stepIndex];
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      // Target isn't on this layout (e.g. mobile) — fall back to a
      // centered card rather than breaking.
      setRect(null);
    }
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!visible) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [visible, measure]);

  function close() {
    markTourSeen();
    setVisible(false);
  }

  function next() {
    if (stepIndex >= steps.length - 1) {
      close();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!visible) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Position the tooltip card near the spotlighted rect, clamped so it
  // never runs off-screen; falls back to centered when there's no target.
  let cardStyle: React.CSSProperties = {};
  if (rect) {
    const cardWidth = 320;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const top =
      spaceBelow > 220 ? rect.bottom + 16 : Math.max(16, rect.top - 200);
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, viewportW - cardWidth - 16));
    cardStyle = { position: "fixed", top, left, width: cardWidth };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dimmed backdrop with a cut-out "spotlight" around the target,
          made with a giant box-shadow on a transparent box positioned
          exactly over the target's rect — no SVG mask needed. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-cyan-300/80 transition-all duration-300"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/75" />
      )}

      {/* Tooltip / welcome card */}
      <div
        style={rect ? cardStyle : undefined}
        className={
          rect
            ? "z-10 rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            : "fixed left-1/2 top-1/2 z-10 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        }
      >
        <p className="mb-1 text-sm font-semibold text-white">{step.title}</p>
        <p className="text-sm text-gray-300">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={close}
            className="text-xs font-medium text-gray-500 hover:text-gray-300"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">
              {stepIndex + 1} / {steps.length}
            </span>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
            >
              {isLast ? "Got it!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
