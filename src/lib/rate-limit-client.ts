// Petit client navigateur pour /api/public/auth/rate-check
export async function checkAuthRate(
  identifier: string,
  kind: "signin" | "reset",
  outcome: "attempt" | "success" = "attempt",
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const res = await fetch("/api/public/auth/rate-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
