import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockFrom = vi.fn();
  return { mockFrom, mockRpc };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  assertSeatAvailable,
  assertCallMinutesAvailable,
  assertStorageAvailable,
  incrementCallMinutes,
  incrementStorageUsed,
  decrementStorageUsed,
  getBoxQuota,
  QuotaError,
  PLAN_LIMITS,
} from "@/lib/billing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockBox(overrides: Record<string, unknown> = {}) {
  return {
    id: "box-1",
    slug: "testbox1",
    plan: "free",
    max_seats: 20,
    call_minutes_used: 0,
    call_minutes_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    storage_used_bytes: 0,
    ...overrides,
  };
}

function mockFromSingle(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function mockFromCount(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
}

// ---------------------------------------------------------------------------

describe("assertSeatAvailable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when under free seat limit", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return mockFromSingle(mockBox());
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      };
    });

    await expect(assertSeatAvailable("box-1")).resolves.toBeUndefined();
  });

  it("throws QuotaError when at free seat limit", async () => {
    mockFrom.mockImplementation(() => {
      // Return the same shape for both calls: box fetch returns single, count returns eq
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          // If .single() is called, it's the box fetch
          // If resolved directly, it's the count
          return {
            single: vi.fn().mockResolvedValue({ data: mockBox(), error: null }),
            // count query resolves with { count }
            then: (resolve: any) => resolve({ count: 20, error: null }),
          };
        }),
      };
      return chain;
    });

    // Re-mock cleanly for each assertion
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call % 2 === 1) return mockFromSingle(mockBox());
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 20, error: null }),
      };
    });

    await expect(assertSeatAvailable("box-1")).rejects.toThrow(QuotaError);

    // Reset for second call
    call = 0;
    await expect(assertSeatAvailable("box-1")).rejects.toMatchObject({
      code: "SEAT_LIMIT",
      upgradeUrl: "/box/testbox1/upgrade",
      limit: PLAN_LIMITS.free.seats,
    });
  });

  it("passes without counting seats on pro plan", async () => {
    mockFrom.mockImplementation(() => mockFromSingle(mockBox({ plan: "pro" })));

    await expect(assertSeatAvailable("box-1")).resolves.toBeUndefined();
    // Should only be called once (for the box fetch, not seat count)
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

describe("assertCallMinutesAvailable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when under free call minute limit", async () => {
    mockFrom.mockImplementation(() => mockFromSingle(mockBox({ call_minutes_used: 100 })));

    await expect(assertCallMinutesAvailable("box-1", 10)).resolves.toBeUndefined();
  });

  it("throws QuotaError when over call minute limit", async () => {
    mockFrom.mockImplementation(() =>
      mockFromSingle(mockBox({ call_minutes_used: 4_990 }))
    );

    await expect(assertCallMinutesAvailable("box-1", 20)).rejects.toThrow(QuotaError);
    await expect(assertCallMinutesAvailable("box-1", 20)).rejects.toMatchObject({
      code: "CALL_MINUTES_LIMIT",
    });
  });

  it("treats usage as 0 when reset window has passed", async () => {
    const pastReset = new Date(Date.now() - 1000).toISOString();
    mockFrom.mockImplementation(() =>
      mockFromSingle(mockBox({ call_minutes_used: 5_000, call_minutes_reset_at: pastReset }))
    );

    // Even though call_minutes_used is 5000, past reset means it counts as 0
    await expect(assertCallMinutesAvailable("box-1", 100)).resolves.toBeUndefined();
  });

  it("passes without checking minutes on pro plan", async () => {
    mockFrom.mockImplementation(() => mockFromSingle(mockBox({ plan: "pro" })));

    await expect(assertCallMinutesAvailable("box-1", 999_999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe("assertStorageAvailable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when under free storage limit", async () => {
    mockFrom.mockImplementation(() =>
      mockFromSingle(mockBox({ storage_used_bytes: 500 * 1024 * 1024 }))
    );

    await expect(assertStorageAvailable("box-1", 1024)).resolves.toBeUndefined();
  });

  it("throws QuotaError when upload would exceed free storage limit", async () => {
    const nearLimit = PLAN_LIMITS.free.storageBytes - 100;
    mockFrom.mockImplementation(() =>
      mockFromSingle(mockBox({ storage_used_bytes: nearLimit }))
    );

    await expect(assertStorageAvailable("box-1", 200)).rejects.toThrow(QuotaError);
    await expect(assertStorageAvailable("box-1", 200)).rejects.toMatchObject({
      code: "STORAGE_LIMIT",
    });
  });

  it("passes without checking storage on pro plan", async () => {
    mockFrom.mockImplementation(() => mockFromSingle(mockBox({ plan: "pro" })));

    await expect(assertStorageAvailable("box-1", 999_999_999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe("incrementCallMinutes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls RPC when within reset window", async () => {
    mockFrom.mockImplementation(() => mockFromSingle(mockBox()));

    await incrementCallMinutes("box-1", 30);

    expect(mockRpc).toHaveBeenCalledWith("increment_call_minutes_for_box", {
      box_id: "box-1",
      minutes_to_add: 30,
    });
  });

  it("resets counter directly when past reset window", async () => {
    const pastReset = new Date(Date.now() - 1000).toISOString();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return mockFromSingle(mockBox({ call_minutes_reset_at: pastReset }));
      return { update: mockUpdate, eq: mockEq };
    });

    await incrementCallMinutes("box-1", 45);

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ call_minutes_used: 45 })
    );
  });
});

// ---------------------------------------------------------------------------

describe("incrementStorageUsed / decrementStorageUsed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls increment RPC with correct args", async () => {
    await incrementStorageUsed("box-1", 1024 * 1024);
    expect(mockRpc).toHaveBeenCalledWith("increment_storage_bytes_for_box", {
      box_id: "box-1",
      bytes_to_add: 1024 * 1024,
    });
  });

  it("calls decrement RPC with correct args", async () => {
    await decrementStorageUsed("box-1", 512);
    expect(mockRpc).toHaveBeenCalledWith("decrement_storage_bytes_for_box", {
      box_id: "box-1",
      bytes_to_remove: 512,
    });
  });
});

// ---------------------------------------------------------------------------

describe("getBoxQuota", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns correct quota shape for free plan", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return mockFromSingle(mockBox({ call_minutes_used: 120 }));
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 7, error: null }),
      };
    });

    const quota = await getBoxQuota("box-1");

    expect(quota.plan).toBe("free");
    expect(quota.seats.used).toBe(7);
    expect(quota.seats.limit).toBe(PLAN_LIMITS.free.seats);
    expect(quota.callMinutes.used).toBe(120);
    expect(quota.callMinutes.limit).toBe(PLAN_LIMITS.free.callMinutesPerMonth);
    expect(quota.storage.usedBytes).toBe(0);
    expect(quota.storage.limitBytes).toBe(PLAN_LIMITS.free.storageBytes);
  });

  it("returns null limits for pro plan", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return mockFromSingle(mockBox({ plan: "pro" }));
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 150, error: null }),
      };
    });

    const quota = await getBoxQuota("box-1");

    expect(quota.plan).toBe("pro");
    expect(quota.seats.limit).toBeNull();
    expect(quota.callMinutes.limit).toBeNull();
    // Pro plan has 20 GB storage limit (not infinite)
    expect(quota.storage.limitBytes).toBe(PLAN_LIMITS.pro.storageBytes);
  });
});
