// Fire-and-forget page view tracking. Failures are swallowed silently.
import { supabase } from "@/integrations/supabase/client";

let lastPath: string | null = null;

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (path === lastPath) return;
  lastPath = path;
  try {
    const referrer = document.referrer || null;
    void supabase
      .from("page_views")
      .insert({ path: path.slice(0, 512), referrer: referrer ? referrer.slice(0, 1024) : null })
      .then(() => undefined, () => undefined);
  } catch {
    /* noop */
  }
}
