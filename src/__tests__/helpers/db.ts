/**
 * Test database helpers — connects to the LOCAL Supabase instance.
 *
 * Start local Supabase before running E2E/integration tests:
 *   npx supabase start
 *
 * The local URL and service role key are fixed values printed by `supabase start`.
 */
import { createClient } from "@supabase/supabase-js";

const LOCAL_SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_SERVICE_KEY =
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
  // Default key printed by `supabase start` (safe — local only)
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

/** Admin client — bypasses RLS, use only in test setup/teardown */
export const testAdmin = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Fixed test user IDs (match seed.sql) */
export const TEST_IDS = {
  users: {
    alice:   "00000000-0000-0000-0000-000000000001",
    bob:     "00000000-0000-0000-0000-000000000002",
    charlie: "00000000-0000-0000-0000-000000000003",
    newuser: "00000000-0000-0000-0000-000000000004",
  },
  orgs: {
    acme: "10000000-0000-0000-0000-000000000001",
    beta: "10000000-0000-0000-0000-000000000002",
  },
  boxes: {
    main: "20000000-0000-0000-0000-000000000001",
    side: "20000000-0000-0000-0000-000000000002",
  },
  channels: {
    general: "30000000-0000-0000-0000-000000000001",
    random:  "30000000-0000-0000-0000-000000000002",
    eng:     "30000000-0000-0000-0000-000000000003",
    vip:     "30000000-0000-0000-0000-000000000004",
  },
} as const;

/** Test credentials (all seed users share the same password) */
export const TEST_PASSWORD = "Test1234!";

export const TEST_USERS = {
  alice:   { email: "alice@test.com",   password: TEST_PASSWORD },
  bob:     { email: "bob@test.com",     password: TEST_PASSWORD },
  charlie: { email: "charlie@test.com", password: TEST_PASSWORD },
  newuser: { email: "newuser@test.com", password: TEST_PASSWORD },
} as const;

/**
 * Sign in as a test user and return the access token.
 * Useful for seeding authenticated requests in integration tests.
 */
export async function signInAs(user: keyof typeof TEST_USERS) {
  const { email, password } = TEST_USERS[user];
  const { data, error } = await testAdmin.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAs(${user}) failed: ${error.message}`);
  return data.session!.access_token;
}

/**
 * Delete a user by email — useful for cleaning up after signup tests.
 */
export async function deleteUserByEmail(email: string) {
  const { data } = await testAdmin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (user) await testAdmin.auth.admin.deleteUser(user.id);
}

/**
 * Create a fresh verification code for a test email.
 * Returns the code string so tests can submit it without checking email.
 */
export async function createTestVerificationCode(
  email: string,
  options: { expired?: boolean; used?: boolean } = {}
) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = options.expired
    ? new Date(Date.now() - 60_000).toISOString()
    : new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await testAdmin.from("verification_codes").insert({
    id: `test-vc-${Date.now()}`,
    email,
    code,
    type: "signup",
    expires_at: expiresAt,
    used: options.used ?? false,
  });

  return code;
}

/**
 * Get the most recent verification code sent to an email (for asserting it was stored).
 */
export async function getLatestVerificationCode(email: string) {
  const { data } = await testAdmin
    .from("verification_codes")
    .select("code, expires_at, used")
    .eq("email", email)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}
