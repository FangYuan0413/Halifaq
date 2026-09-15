"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "./Logo";
import { applyTheme, Theme } from "@/utils/theme";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "./ToastProvider";

export function MikuPortrait() {
  return (
    <Image
      className="miku-button-art"
      src="/miku-theme/portrait-hd.png"
      alt=""
      width={128}
      height={128}
      sizes="64px"
    />
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    Home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
    Explore: "M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    Categories: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
    Notifications: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4",
    Messages: "M3 5h18v14H3ZM3 5l9 8 9-8",
    Bookmarks: "M6 3h12v18l-6-4-6 4Z",
    Profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 5 0 0 1 16 0v3Z",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.Categories} />
    </svg>
  );
}

export function MikuNavigation({
  userId,
  saved,
  onHome,
  onBookmarks,
  onCategories,
}: {
  userId: string | null;
  saved: boolean;
  onHome: () => void;
  onBookmarks: () => void;
  onCategories: () => void;
}) {
  const { showToast } = useToast();
  async function chooseTheme(theme: Theme) {
    applyTheme(theme);
    if (userId) {
      const { error } = await createClient()
        .from("profiles")
        .update({ theme })
        .eq("id", userId);
      if (error)
        showToast(
          "Theme changed on this device; account sync failed.",
          "error",
        );
    }
  }
  const items = [
    { label: "Home", action: onHome, active: !saved },
    { label: "Explore", href: "/search" },
    { label: "Categories", action: onCategories },
    { label: "Notifications", href: "/messages?tab=replies" },
    { label: "Messages", href: "/messages" },
    { label: "Bookmarks", action: onBookmarks, active: saved },
    { label: "Profile", href: userId ? `/profile/${userId}` : "/login" },
  ];
  return (
    <aside className="miku-nav">
      <div className="miku-brand">
        <Logo size="text-4xl" />
        <p>Halifax. Real People. Real Answers.</p>
      </div>
      <nav aria-label="Main navigation">
        {items.map((item) => {
          const content = (
            <>
              <Icon name={item.label} />
              <span>{item.label}</span>
              <MikuPortrait />
            </>
          );
          return item.href ? (
            <Link className="miku-nav-row" href={item.href} key={item.label}>
              {content}
            </Link>
          ) : (
            <button
              className="miku-nav-row"
              type="button"
              key={item.label}
              onClick={item.action}
              aria-current={item.active ? "page" : undefined}
            >
              {content}
            </button>
          );
        })}
      </nav>
      <div className="miku-theme-picker">
        <p>THEME</p>
        {(["light", "dark", "miku"] as Theme[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => chooseTheme(t)}
            aria-pressed={t === "miku"}
          >
            <span aria-hidden="true">
              {t === "light" ? "☼" : t === "dark" ? "☾" : "♪"}
            </span>
            {t[0].toUpperCase() + t.slice(1)}
            {t === "miku" && <span className="miku-theme-check">✓</span>}
          </button>
        ))}
      </div>
      <p className="miku-nav-footer">
        Music connects people.
        <br />
        <strong>初音ミク</strong>
      </p>
    </aside>
  );
}

export function MikuHero() {
  return (
    <div className="miku-hero">
      <Image
        src="/miku-theme/harbour-2k.png"
        alt="Hatsune Miku overlooking Halifax harbour. Same curiosity, a brighter Halifax."
        width={2157}
        height={729}
        sizes="(min-width: 1600px) 1050px, (min-width: 1024px) calc(100vw - 570px), 100vw"
        priority
      />
    </div>
  );
}

export function MikuComposer({
  onCompose,
}: {
  onCompose: (mode: "text" | "photo" | "link") => void;
}) {
  return (
    <section className="miku-composer" aria-label="Create a post">
      <div className="miku-composer-top">
        <span className="miku-composer-avatar">♪</span>
        <button type="button" onClick={() => onCompose("text")}>
          What would you like to ask or share?
        </button>
      </div>
      <div className="miku-composer-tools">
        <div>
          {(["text", "photo", "link"] as const).map((mode) => (
            <button type="button" key={mode} onClick={() => onCompose(mode)}>
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <button className="miku-post" onClick={() => onCompose("text")}>
          Post
        </button>
      </div>
    </section>
  );
}

export function MikuCategories({
  categories,
}: {
  categories: { id: number; slug: string; name: string }[];
}) {
  return (
    <aside className="miku-right" id="miku-popular-categories" tabIndex={-1}>
      <section className="miku-community">
        <h2>Halifax × Hatsune Miku</h2>
        <p>
          Different voices
          <br />A brighter community
        </p>
        <p>— HalifaQ</p>
        <MikuPortrait />
      </section>
      <nav className="miku-category-list" aria-label="Popular categories">
        <h2>Popular Categories</h2>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="miku-category-row"
          >
            <Icon name="Categories" />
            <span>{c.name}</span>
            <MikuPortrait />
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </nav>
      <p className="miku-quote">
        A small question.
        <br />A brighter Halifax.
      </p>
    </aside>
  );
}
