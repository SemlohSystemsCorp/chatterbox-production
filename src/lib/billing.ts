/**
 * Billing quota helpers.
 *
 * Use the `assert*` functions in server actions / API routes to gate
 * quota-limited features. They throw `QuotaError` when a limit is hit so
 * callers get a structured, user-friendly error with an upgrade URL.
 *
 * Use the `increment*` functions to record usage after an action succeeds.
 *
 * Use `getBoxQuota` to render usage summaries in the UI.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// ─── Plan limits ─────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    seats: 20,
    callMinutesPerMonth: 5_000,
    storageBytes: 1 * 1024 * 1024 * 1024,   // 1 GB
    historyDays: 90,
  },
  pro: {
    seats: Infinity,
    callMinutesPerMonth: Infinity,
    storageBytes: 20 * 1024 * 1024 * 1024,  // 20 GB
    historyDays: Infinity,
  },
} as const;

function limits(plan: string) {
  return plan === "pro" ? PLAN_LIMITS.pro : PLAN_LIMITS.free;
}

// ─── Error type ───────────────────────────────────────────────────────────────

export type QuotaCode =
  | "SEAT_LIMIT"
  | "CALL_MINUTES_LIMIT"
  | "STORAGE_LIMIT"
  | "HISTORY_DAYS_LIMIT";

export class QuotaError extends Error {
  readonly code: QuotaCode;
  readonly upgradeUrl: string;
  readonly used: number;
  readonly limit: number;

  constructor(opts: {
    code: QuotaCode;
    message: string;
    upgradeUrl: string;
    used: number;
    limit: number;
  }) {
    super(opts.message);
    this.name = "QuotaError";
    this.code = opts.code;
    this.upgradeUrl = opts.upgradeUrl;
    this.used = opts.used;
    this.limit = opts.limit;
  }
}

// ─── Internal box fetch ───────────────────────────────────────────────────────

async function fetchBox(boxId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("boxes")
    .select(
      "id, slug, plan, max_seats, stripe_subscription_id, call_minutes_used, call_minutes_reset_at, storage_used_bytes"
    )
    .eq("id", boxId)
    .single();

  if (error || !data) throw new Error(`Box not found: ${boxId}`);
  return data;
}

// ─── Assert helpers (throw QuotaError if over limit) ─────────────────────────

/**
 * Call before adding a new box member (join).
 */
export async function assertSeatAvailable(boxId: string) {
  const supabase = createAdminClient();
  const box = await fetchBox(boxId);
  const lim = limits(box.plan);
  if (lim.seats === Infinity) return;

  const { count } = await supabase
    .from("box_members")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId);

  const used = count ?? 0;
  if (used >= lim.seats) {
    throw new QuotaError({
      code: "SEAT_LIMIT",
      message: `This workspace has reached its ${lim.seats}-seat limit on the free plan.`,
      upgradeUrl: `/box/${box.slug}/upgrade`,
      used,
      limit: lim.seats,
    });
  }
}

/**
 * Call before starting or joining a call.
 * @param minutesToAdd - estimated minutes for this call (use 0 to just gate access)
 */
export async function assertCallMinutesAvailable(
  boxId: string,
  minutesToAdd = 0
) {
  const box = await fetchBox(boxId);
  const lim = limits(box.plan);
  if (lim.callMinutesPerMonth === Infinity) return;

  const resetAt = new Date(box.call_minutes_reset_at);
  const used =
    new Date() >= resetAt
      ? 0 // will be reset; treat as zero
      : (box.call_minutes_used ?? 0);

  if (used + minutesToAdd > lim.callMinutesPerMonth) {
    throw new QuotaError({
      code: "CALL_MINUTES_LIMIT",
      message: `This workspace has used ${used} of its ${lim.callMinutesPerMonth.toLocaleString()} monthly call minutes.`,
      upgradeUrl: `/box/${box.slug}/upgrade`,
      used,
      limit: lim.callMinutesPerMonth,
    });
  }
}

/**
 * Call before accepting a file upload.
 * @param fileSizeBytes - size of the file being uploaded
 */
export async function assertStorageAvailable(
  boxId: string,
  fileSizeBytes: number
) {
  const box = await fetchBox(boxId);
  const lim = limits(box.plan);
  if (lim.storageBytes === Infinity) return;

  const used = box.storage_used_bytes ?? 0;
  if (used + fileSizeBytes > lim.storageBytes) {
    const usedMb = Math.round(used / (1024 * 1024));
    const limitMb = Math.round(lim.storageBytes / (1024 * 1024));
    throw new QuotaError({
      code: "STORAGE_LIMIT",
      message: `Storage limit reached (${usedMb} MB used of ${limitMb} MB).`,
      upgradeUrl: `/box/${box.slug}/upgrade`,
      used,
      limit: lim.storageBytes,
    });
  }
}

// ─── Usage increment helpers ─────────────────────────────────────────────────

/**
 * Record call minutes used. Call after a call ends with the actual duration.
 */
export async function incrementCallMinutes(boxId: string, minutes: number) {
  const supabase = createAdminClient();
  const box = await fetchBox(boxId);

  const pastReset = new Date() >= new Date(box.call_minutes_reset_at);
  if (pastReset) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabase
      .from("boxes")
      .update({
        call_minutes_used: minutes,
        call_minutes_reset_at: nextReset.toISOString(),
      })
      .eq("id", boxId);
  } else {
    await supabase.rpc("increment_call_minutes_for_box", {
      box_id: boxId,
      minutes_to_add: minutes,
    });
  }
}

/**
 * Record storage added. Call after a file upload completes.
 */
export async function incrementStorageUsed(boxId: string, bytes: number) {
  const supabase = createAdminClient();
  await supabase.rpc("increment_storage_bytes_for_box", {
    box_id: boxId,
    bytes_to_add: bytes,
  });
}

/**
 * Record storage freed. Call after a file is deleted.
 */
export async function decrementStorageUsed(boxId: string, bytes: number) {
  const supabase = createAdminClient();
  await supabase.rpc("decrement_storage_bytes_for_box", {
    box_id: boxId,
    bytes_to_remove: bytes,
  });
}

// ─── Stripe seat sync ───────────────────────────────────────────────────────

/**
 * Update the Stripe subscription quantity to match the current member count.
 * Call after adding or removing a box member. No-ops for free-plan boxes.
 */
export async function syncStripeSeats(boxId: string) {
  const supabase = createAdminClient();
  const box = await fetchBox(boxId);

  if (box.plan !== "pro" || !box.stripe_subscription_id) return;

  const { count } = await supabase
    .from("box_members")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId);

  const quantity = Math.max(count ?? 1, 1);

  const subscription = await stripe.subscriptions.retrieve(box.stripe_subscription_id);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return;

  await stripe.subscriptions.update(box.stripe_subscription_id, {
    items: [{ id: itemId, quantity }],
    proration_behavior: "create_prorations",
  });
}

// ─── Quota summary (for UI display) ──────────────────────────────────────────

export interface BoxQuota {
  plan: "free" | "pro";
  seats: { used: number; limit: number | null };
  callMinutes: { used: number; limit: number | null; resetsAt: Date };
  storage: { usedBytes: number; limitBytes: number | null };
}

export async function getBoxQuota(boxId: string): Promise<BoxQuota> {
  const supabase = createAdminClient();
  const box = await fetchBox(boxId);
  const { count: memberCount } = await supabase
    .from("box_members")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId);

  const plan = box.plan === "pro" ? "pro" : "free";
  const lim = limits(plan);

  const callUsed =
    new Date() >= new Date(box.call_minutes_reset_at)
      ? 0
      : (box.call_minutes_used ?? 0);

  return {
    plan,
    seats: {
      used: memberCount ?? 0,
      limit: lim.seats === Infinity ? null : lim.seats,
    },
    callMinutes: {
      used: callUsed,
      limit: lim.callMinutesPerMonth === Infinity ? null : lim.callMinutesPerMonth,
      resetsAt: new Date(box.call_minutes_reset_at),
    },
    storage: {
      usedBytes: box.storage_used_bytes ?? 0,
      limitBytes: lim.storageBytes === Infinity ? null : lim.storageBytes,
    },
  };
}
