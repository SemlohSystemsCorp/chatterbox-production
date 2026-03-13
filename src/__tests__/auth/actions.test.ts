import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted() runs before module resolution, so these
// variables are safe to reference inside vi.mock() factories.
// ---------------------------------------------------------------------------
const {
  mockSignUp,
  mockSignInWithPassword,
  mockSignOut,
  mockResetPasswordForEmail,
  mockSignInWithOAuth,
  mockFrom,
  mockAuthAdmin,
  mockResendSend,
  mockRedirect,
  mockAssertSeatAvailable,
} = vi.hoisted(() => {
  const mockAuthAdmin = {
    listUsers: vi.fn(),
    updateUserById: vi.fn(),
    generateLink: vi.fn(),
  };
  return {
    mockSignUp: vi.fn(),
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockResetPasswordForEmail: vi.fn(),
    mockSignInWithOAuth: vi.fn(),
    mockFrom: vi.fn(),
    mockAuthAdmin,
    mockResendSend: vi.fn(),
    mockRedirect: vi.fn((url: string): never => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockAssertSeatAvailable: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signInWithOAuth: mockSignInWithOAuth,
    },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: mockAuthAdmin },
  })),
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockResendSend } },
}));

vi.mock("@/lib/billing", () => ({
  assertSeatAvailable: mockAssertSeatAvailable,
  syncStripeSeats: vi.fn().mockResolvedValue(undefined),
  QuotaError: class QuotaError extends Error {
    code: string;
    upgradeUrl: string;
    used: number;
    limit: number;
    constructor(opts: { code: string; message: string; upgradeUrl: string; used: number; limit: number }) {
      super(opts.message);
      this.name = "QuotaError";
      this.code = opts.code;
      this.upgradeUrl = opts.upgradeUrl;
      this.used = opts.used;
      this.limit = opts.limit;
    }
  },
}));

vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "test-id-123") }));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: vi.fn(() => "http://localhost:3000") })),
}));

// ---------------------------------------------------------------------------
// Import actions and mocked modules after mocks are registered
// ---------------------------------------------------------------------------

import {
  signUp,
  verifyCode,
  resendVerificationCode,
  signIn,
  joinBoxByCode,
} from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it("returns error when Supabase signUp fails", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "Email already in use" } });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");
    fd.set("firstName", "Jane");
    fd.set("lastName", "Doe");

    const result = await signUp(fd);

    expect(result).toEqual({ error: "Email already in use" });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns error when verification email fails to send", async () => {
    mockSignUp.mockResolvedValue({ error: null, data: { user: { id: "u1" } } });
    mockResendSend.mockRejectedValue(new Error("SMTP timeout"));

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");
    fd.set("firstName", "Jane");
    fd.set("lastName", "Doe");

    const result = await signUp(fd);

    expect(result).toEqual({
      error: "Failed to send verification email. Please try again.",
    });
  });

  it("returns { success, email } when everything succeeds", async () => {
    mockSignUp.mockResolvedValue({ error: null, data: { user: { id: "u1" } } });
    mockResendSend.mockResolvedValue({ id: "email-1" });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");
    fd.set("firstName", "Jane");
    fd.set("lastName", "Doe");

    const result = await signUp(fd);

    expect(result).toEqual({ success: true, email: "test@example.com" });
    expect(mockResendSend).toHaveBeenCalledOnce();
    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.to).toBe("test@example.com");
    expect(emailCall.subject).toMatch(/verify/i);
  });

  it("passes display_name as 'First Last' to Supabase", async () => {
    mockSignUp.mockResolvedValue({ error: null, data: { user: { id: "u1" } } });
    mockResendSend.mockResolvedValue({ id: "email-1" });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");
    fd.set("firstName", "Alice");
    fd.set("lastName", "Smith");

    await signUp(fd);

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ display_name: "Alice Smith" }),
        }),
      })
    );
  });

  it("sends a 6-digit numeric code in the email", async () => {
    mockSignUp.mockResolvedValue({ error: null, data: { user: { id: "u1" } } });
    mockResendSend.mockImplementation(async ({ html }: { html: string }) => {
      const match = html.match(/letter-spacing: 8px[^>]*>(\d{6})</);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/^\d{6}$/);
      return { id: "email-1" };
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");
    fd.set("firstName", "Test");
    fd.set("lastName", "User");

    await signUp(fd);
    expect(mockResendSend).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------

describe("verifyCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when code is not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("code", "000000");

    expect(await verifyCode(fd)).toEqual({ error: "Invalid verification code." });
  });

  it("returns error when code is expired", async () => {
    const expired = new Date(Date.now() - 60_000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "c1", expires_at: expired },
        error: null,
      }),
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("code", "123456");

    expect(await verifyCode(fd)).toEqual({
      error: "Verification code has expired. Please sign up again.",
    });
  });

  it("returns { success, tokenHash } on a valid, unexpired code", async () => {
    const future = new Date(Date.now() + 600_000).toISOString();
    let callCount = 0;

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(async () => {
        if (callCount++ === 0) {
          return { data: { id: "c1", expires_at: future }, error: null };
        }
        return { data: null, error: null };
      }),
    }));

    mockAuthAdmin.listUsers.mockResolvedValue({
      data: { users: [{ id: "u1", email: "test@example.com" }] },
    });
    mockAuthAdmin.updateUserById.mockResolvedValue({ data: {}, error: null });
    mockAuthAdmin.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "tok_abc123" } },
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("code", "123456");

    expect(await verifyCode(fd)).toEqual({ success: true, tokenHash: "tok_abc123" });
    expect(mockAuthAdmin.updateUserById).toHaveBeenCalledWith("u1", {
      email_confirm: true,
    });
  });
});

// ---------------------------------------------------------------------------

describe("resendVerificationCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { success } when email sends", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
    });
    mockResendSend.mockResolvedValue({ id: "email-2" });

    expect(await resendVerificationCode("test@example.com")).toEqual({
      success: true,
    });
    expect(mockResendSend).toHaveBeenCalledOnce();
    expect(mockResendSend.mock.calls[0][0].to).toBe("test@example.com");
  });

  it("returns error when email send fails", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
    });
    mockResendSend.mockRejectedValue(new Error("SMTP error"));

    expect(await resendVerificationCode("test@example.com")).toEqual({
      error: "Failed to send verification email.",
    });
  });
});

// ---------------------------------------------------------------------------

describe("signIn", () => {
  beforeEach(() => vi.clearAllMocks());

  function mockAuthClient(opts: {
    signInResult: { error?: { message: string } | null; data?: { user?: { id: string } | null } };
    fromImpl?: () => unknown;
  }) {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue(opts.signInResult),
      },
      from: opts.fromImpl ? vi.fn().mockImplementation(opts.fromImpl) : mockFrom,
    } as any);
  }

  it("returns error on invalid credentials", async () => {
    mockAuthClient({
      signInResult: { error: { message: "Invalid login credentials" }, data: { user: null } },
    });

    const fd = new FormData();
    fd.set("email", "wrong@example.com");
    fd.set("password", "badpassword");

    expect(await signIn(fd)).toEqual({ error: "Invalid login credentials" });
  });

  it("redirects to /onboarding when user has no username", async () => {
    mockAuthClient({
      signInResult: { error: null, data: { user: { id: "u1" } } },
      fromImpl: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { username: null }, error: null }),
      }),
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");

    await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("redirects to /box/:slug when user has a box", async () => {
    let call = 0;
    mockAuthClient({
      signInResult: { error: null, data: { user: { id: "u1" } } },
      fromImpl: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          call++;
          if (call === 1) return { data: { username: "alice" }, error: null };
          return { data: { boxes: { slug: "acme-ws" } }, error: null };
        }),
      }),
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");

    await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT:/box/acme-ws");
  });

  it("redirects to /onboarding when user has username but no boxes", async () => {
    let call = 0;
    mockAuthClient({
      signInResult: { error: null, data: { user: { id: "u1" } } },
      fromImpl: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          call++;
          if (call === 1) return { data: { username: "alice" }, error: null };
          return { data: null, error: null };
        }),
      }),
    });

    const fd = new FormData();
    fd.set("email", "test@example.com");
    fd.set("password", "password123");

    await expect(signIn(fd)).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });
});

// ---------------------------------------------------------------------------

describe("joinBoxByCode", () => {
  beforeEach(() => vi.clearAllMocks());

  function mockUserClient(user: { id: string; email: string } | null) {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user } })),
      },
      from: mockFrom,
    } as any);
  }

  it("returns error when user is not logged in", async () => {
    mockUserClient(null);
    expect(await joinBoxByCode("some-code")).toEqual({
      error: "You must be logged in.",
    });
  });

  it("returns error when code is blank", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    expect(await joinBoxByCode("   ")).toEqual({
      error: "Please enter an invite code.",
    });
  });

  it("returns error when box not found", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    expect(await joinBoxByCode("badcode1")).toEqual({
      error: "Invalid invite code. Please check and try again.",
    });
  });

  it("returns error when already a member", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    mockFrom
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "box-1", name: "Acme", slug: "acmews01" }, error: null }),
      }))
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "mem-1" }, error: null }),
      }));

    expect(await joinBoxByCode("acmews01")).toEqual({
      error: "You're already a member of this workspace.",
    });
  });

  it("returns { success, boxSlug } on a valid join with no public channels", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    mockFrom
      .mockImplementationOnce(() => ({
        // box lookup
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "box-1", name: "Acme", slug: "acmews01" }, error: null }),
      }))
      .mockImplementationOnce(() => ({
        // membership check → not a member
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        // insert box_members
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        // public channels query → none
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

    expect(await joinBoxByCode("acmews01")).toEqual({ success: true, boxSlug: "acmews01" });
  });

  it("auto-joins public channels on valid join", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    const mockInsertChannelMembers = vi.fn().mockResolvedValue({ data: null, error: null });

    mockFrom
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "box-1", name: "Acme", slug: "acmews01" }, error: null }),
      }))
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        // public channels → 2 channels
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "ch-1" }, { id: "ch-2" }], error: null }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        insert: mockInsertChannelMembers,
      }));

    const result = await joinBoxByCode("acmews01");
    expect(result.error).toBeUndefined();
    expect(result.boxSlug).toBe("acmews01");
  });

  it("returns error when insert fails", async () => {
    mockUserClient({ id: "u1", email: "test@example.com" });
    mockFrom
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "box-1", name: "Acme", slug: "acmews01" }, error: null }),
      }))
      .mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: "DB constraint violation" } }),
      }));

    expect(await joinBoxByCode("acmews01")).toEqual({
      error: "DB constraint violation",
    });
  });
});
