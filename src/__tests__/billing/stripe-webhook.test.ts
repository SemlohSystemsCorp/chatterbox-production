import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom, mockRpc, mockConstructEvent, mockSendEmail } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockConstructEvent = vi.fn();
  const mockSendEmail = vi.fn().mockResolvedValue({ id: "email_123" });
  return { mockFrom, mockRpc, mockConstructEvent, mockSendEmail };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
}));

vi.mock("@/lib/resend", () => ({
  resend: {
    emails: { send: mockSendEmail },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((key: string) =>
      key === "stripe-signature" ? "whsec_test_sig" : null
    ),
  })),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body = "{}") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
  });
}

function mockUpdateChain() {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ update });
  return { update, eq };
}

function mockSelectSingleChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when webhook signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed");
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid webhook signature/i);
  });

  it("upgrades box to pro on subscription.created (active)", async () => {
    const { update, eq } = mockUpdateChain();
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          customer: "cus_abc",
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", stripe_subscription_id: "sub_123" })
    );
    expect(eq).toHaveBeenCalledWith("stripe_customer_id", "cus_abc");
  });

  it("downgrades box to free on subscription.created (incomplete)", async () => {
    const { update } = mockUpdateChain();
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: { id: "sub_123", status: "incomplete", customer: "cus_abc" },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free" })
    );
  });

  it("handles subscription.updated", async () => {
    const { update } = mockUpdateChain();
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_123", status: "trialing", customer: "cus_abc" },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro" })
    );
  });

  it("resets box to free on subscription.deleted", async () => {
    const { update, eq } = mockUpdateChain();
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_123", status: "canceled", customer: "cus_abc" },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        max_seats: 20,
        stripe_subscription_id: null,
      })
    );
    expect(eq).toHaveBeenCalledWith("stripe_customer_id", "cus_abc");
  });

  it("resets call minutes and sends receipt email on subscription_cycle payment", async () => {
    let fromCall = 0;
    mockFrom.mockImplementation(() => {
      fromCall++;
      // Call 1: box lookup
      if (fromCall === 1) {
        return mockSelectSingleChain({
          id: "box-1",
          name: "Acme",
          slug: "acme0001",
          created_by: "user-1",
        });
      }
      // Call 2: owner profile lookup
      return mockSelectSingleChain({
        email: "owner@test.com",
        display_name: "Alice",
      });
    });

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "inv_123",
          customer: "cus_abc",
          billing_reason: "subscription_cycle",
          amount_paid: 1200,
          currency: "usd",
          lines: {
            data: [{ period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }],
          },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Should reset call minutes
    expect(mockRpc).toHaveBeenCalledWith("reset_call_minutes_for_box_customer", {
      customer_id: "cus_abc",
    });

    // Should send receipt email
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@test.com",
        subject: expect.stringContaining("$12.00"),
      })
    );
  });

  it("sends receipt email but does NOT reset call minutes on subscription_create payment", async () => {
    let fromCall = 0;
    mockFrom.mockImplementation(() => {
      fromCall++;
      if (fromCall === 1) {
        return mockSelectSingleChain({
          id: "box-1",
          name: "Startup",
          slug: "start001",
          created_by: "user-2",
        });
      }
      return mockSelectSingleChain({
        email: "bob@test.com",
        display_name: "Bob",
      });
    });

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "inv_456",
          customer: "cus_xyz",
          billing_reason: "subscription_create",
          amount_paid: 1200,
          currency: "usd",
          lines: { data: [] },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // subscription_create also triggers reset
    expect(mockRpc).toHaveBeenCalledWith("reset_call_minutes_for_box_customer", {
      customer_id: "cus_xyz",
    });

    // Should still send receipt
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "bob@test.com",
        subject: expect.stringContaining("Startup"),
      })
    );
  });

  it("does NOT reset call minutes or send receipt on non-cycle payment", async () => {
    let fromCall = 0;
    mockFrom.mockImplementation(() => {
      fromCall++;
      if (fromCall === 1) {
        return mockSelectSingleChain({
          id: "box-1",
          name: "Test",
          slug: "test0001",
          created_by: "user-1",
        });
      }
      return mockSelectSingleChain({
        email: "a@test.com",
        display_name: "A",
      });
    });

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "inv_789",
          customer: "cus_abc",
          billing_reason: "manual",
          amount_paid: 0,
          currency: "usd",
          lines: { data: [] },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockRpc).not.toHaveBeenCalled();
    // Receipt should still be sent for any successful payment
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends payment-failed email on invoice.payment_failed", async () => {
    let fromCall = 0;
    mockFrom.mockImplementation(() => {
      fromCall++;
      if (fromCall === 1) {
        return mockSelectSingleChain({
          id: "box-1",
          name: "FailBox",
          slug: "fail0001",
          created_by: "user-fail",
        });
      }
      return mockSelectSingleChain({
        email: "owner@fail.com",
        display_name: "Fail Owner",
      });
    });

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "inv_fail",
          customer: "cus_fail",
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@fail.com",
        subject: expect.stringContaining("Payment failed"),
      })
    );
  });

  it("does not crash if box not found for payment_failed", async () => {
    mockFrom.mockImplementation(() =>
      mockSelectSingleChain(null)
    );

    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: { id: "inv_ghost", customer: "cus_ghost" },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns { received: true } for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });
});
