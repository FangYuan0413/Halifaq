"use client";
import { useEffect, useState } from "react";
const EVENT = "halifaq-bookmarks-change";
const key = (uid: string) => `halifaq_bookmarks_${uid}`;
function read(uid: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(uid)) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
export function useBookmarks(uid: string | null) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(uid ? read(uid) : []);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [uid]);
  function toggle(id: string) {
    if (!uid) return false;
    try {
      const current = read(uid);
      localStorage.setItem(
        key(uid),
        JSON.stringify(
          current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        ),
      );
      window.dispatchEvent(new Event(EVENT));
      return true;
    } catch {
      return false;
    }
  }
  return { ids, toggle };
}
