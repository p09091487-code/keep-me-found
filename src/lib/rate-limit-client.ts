// Petit client navigateur pour /api/public/auth/rate-check
import { supabase } from "@/integrations/supabase/client";

export async function checkAuthRate(
  identifier: string,
  kind: "signin" | "reset",
  outcome: "attempt" | "success" = "attempt",
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (outcome === "success") {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch("/api/public/auth/rate-check", {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier, kind, outcome }),
    });
    if (res.status === 429) {
      const data = await res.json();
      return { allowed: false, message: data.message ?? "Trop de tentatives, réessayez plus tard." };
    }
    if (!res.ok) return { allowed: true }; // fail-open : ne pas bloquer si l'endpoint plante
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
