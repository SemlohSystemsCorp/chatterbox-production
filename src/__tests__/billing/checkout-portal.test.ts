import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockGetUser,
  mockAdminFrom,
  mockCheckoutCreate,
  mockPortalCreate,
  mockCustomerCreate,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockCheckoutCreate: vi.fn(),
  mockPortalCreate: vi.fn(),
  mockCustomerCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: mockCustomerCreate },
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAdminSelectSingle(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

// ---------------------------------------------------------------------------

describe("GET /api/billing/checkout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 without boxSlug param", async () => {
    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing boxSlug");
  });

  it("redirects to login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=test01");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 404 when box not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() => mockAdminSelectSingle(null));

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=nope");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the owner", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        name: "Acme",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: null,
        plan: "free",
      })
    );

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=acme0001");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("redirects to settings when already on pro", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        name: "Acme",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: "cus_abc",
        plan: "pro",
      })
    );

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=acme0001");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/box/acme0001/settings");
  });

  it("creates Stripe customer if none exists and redirects to checkout", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });

    const mockChain = mockAdminSelectSingle({
      id: "box-1",
      name: "Acme",
      slug: "acme0001",
      created_by: "user-1",
      stripe_customer_id: null,
      plan: "free",
    });
    mockAdminFrom.mockImplementation(() => mockChain);

    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=acme0001");
    const res = await GET(req);

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "u@t.com" })
    );
    expect(mockCheckoutCreate).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://checkout.stripe.com/session_123");
  });

  it("uses existing Stripe customer if present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        name: "Acme",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: "cus_existing",
        plan: "free",
      })
    );

    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_456" });

    const { GET } = await import("@/app/api/billing/checkout/route");
    const req = new Request("http://localhost/api/billing/checkout?boxSlug=acme0001");
    const res = await GET(req);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
    expect(res.status).toBe(307);
  });
});

// ---------------------------------------------------------------------------

describe("GET /api/billing/portal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 without boxSlug param", async () => {
    const { GET } = await import("@/app/api/billing/portal/route");
    const req = new Request("http://localhost/api/billing/portal");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("redirects to login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/billing/portal/route");
    const req = new Request("http://localhost/api/billing/portal?boxSlug=test01");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 403 when user is not the owner", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-2", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: "cus_abc",
      })
    );

    const { GET } = await import("@/app/api/billing/portal/route");
    const req = new Request("http://localhost/api/billing/portal?boxSlug=acme0001");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("redirects to upgrade when no stripe customer exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: null,
      })
    );

    const { GET } = await import("@/app/api/billing/portal/route");
    const req = new Request("http://localhost/api/billing/portal?boxSlug=acme0001");
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/box/acme0001/upgrade");
  });

  it("creates portal session and redirects", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "u@t.com" } } });
    mockAdminFrom.mockImplementation(() =>
      mockAdminSelectSingle({
        id: "box-1",
        slug: "acme0001",
        created_by: "user-1",
        stripe_customer_id: "cus_abc",
      })
    );

    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/portal_123" });

    const { GET } = await import("@/app/api/billing/portal/route");
    const req = new Request("http://localhost/api/billing/portal?boxSlug=acme0001");
    const res = await GET(req);

    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_abc",
        return_url: expect.stringContaining("/box/acme0001/settings"),
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://billing.stripe.com/portal_123");
  });
});
