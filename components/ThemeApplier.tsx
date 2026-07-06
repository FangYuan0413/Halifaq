"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { applyTheme, isTheme } from "@/utils/theme";

// Mounted once in the root layout. The inline script in <head> already
// applied whatever theme was cached in localStorage before first paint (so
// there's no flash of the wrong theme); this just reconciles that with
// whatever's actually saved on the signed-in user's profile, in case they
// picked a theme on a different device.
export default function ThemeApplier() {
  const supabase = createClient();

  useEffect(() => {
    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("theme")
        .eq("id", user.id)
        .single();

      if (isTheme(data?.theme)) {
        applyTheme(data.theme);
      }
    }

    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
