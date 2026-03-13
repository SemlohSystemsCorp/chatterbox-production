/**
 * Cloudflare Turnstile CAPTCHA server-side verification.
 *
 * Required env vars:
 *   TURNSTILE_SECRET_KEY        — your Turnstile secret key
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — your Turnstile site key (used by the widget)
 *
 * If TURNSTILE_SECRET_KEY is not set the check is skipped (dev-friendly).
 */
export async function verifyTurnstile(
  token: string | null | undefined
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Skip in dev / CI when secret is not configured
  if (!secret) return { success: true };

  if (!token) {
    return { success: false, error: "Please complete the CAPTCHA challenge." };
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
        cache: "no-store",
      }
    );

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return {
        success: false,
        error: "CAPTCHA verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch {
    // Network error — fail open so legitimate users are not blocked
    return { success: true };
  }
}
