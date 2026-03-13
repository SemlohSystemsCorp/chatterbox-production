/**
 * Playwright global setup — runs once before all E2E tests.
 * Seeds the local Supabase instance with test data.
 *
 * Requires: npx supabase start (local Supabase running on port 54321)
 */
import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const LOCAL_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";

setup("seed database", async () => {
  const admin = createClient(LOCAL_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Quick connectivity check — skip seeding if local Supabase isn't running
  const { error: pingError } = await admin.from("profiles").select("id").limit(1);
  if (pingError) {
    console.warn(
      "\n⚠️  Local Supabase not reachable — skipping DB seed.\n" +
        "   Run `npx supabase start` before E2E tests.\n"
    );
    return;
  }

  // Wipe existing test users (identified by @test.com emails) to avoid conflicts
  const testEmails = [
    "alice@test.com",
    "bob@test.com",
    "charlie@test.com",
    "newuser@test.com",
  ];

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const toDelete = (existingUsers?.users ?? []).filter((u) =>
    testEmails.includes(u.email ?? "")
  );
  for (const u of toDelete) {
    await admin.auth.admin.deleteUser(u.id);
  }

  // Also wipe test boxes by slug
  await admin.from("boxes").delete().in("slug", ["12345678", "87654321"]);

  // Read and run seed SQL via the Supabase REST API isn't possible directly —
  // so we recreate the seed data programmatically here instead.
  const ALICE_ID   = "00000000-0000-0000-0000-000000000001";
  const BOB_ID     = "00000000-0000-0000-0000-000000000002";
  const CHARLIE_ID = "00000000-0000-0000-0000-000000000003";
  const NEWUSER_ID = "00000000-0000-0000-0000-000000000004";

  // Create auth users
  for (const [id, email, name] of [
    [ALICE_ID,   "alice@test.com",   "Alice Test"],
    [BOB_ID,     "bob@test.com",     "Bob Test"],
    [CHARLIE_ID, "charlie@test.com", "Charlie Test"],
    [NEWUSER_ID, "newuser@test.com", "New User"],
  ] as [string, string, string][]) {
    await admin.auth.admin.createUser({
      email,
      password: "Test1234!",
      email_confirm: true,
      user_metadata: { id, display_name: name },
    });
  }

  // Set usernames for all except newuser
  const { data: users } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(
    (users?.users ?? [])
      .filter((u) => testEmails.includes(u.email ?? ""))
      .map((u) => [u.email!, u.id])
  );

  if (userMap["alice@test.com"]) {
    await admin.from("profiles").update({ username: "alice" }).eq("id", userMap["alice@test.com"]);
  }
  if (userMap["bob@test.com"]) {
    await admin.from("profiles").update({ username: "bob" }).eq("id", userMap["bob@test.com"]);
  }
  if (userMap["charlie@test.com"]) {
    await admin.from("profiles").update({ username: "charlie" }).eq("id", userMap["charlie@test.com"]);
  }

  // Box (top-level entity, no orgs)
  const aliceId = userMap["alice@test.com"];
  if (!aliceId) return;

  const { data: box } = await admin
    .from("boxes")
    .insert({ name: "Acme Workspace", slug: "12345678", created_by: aliceId })
    .select("id")
    .single();

  if (!box) return;

  await admin.from("box_members").insert([
    { box_id: box.id, user_id: aliceId },
    { box_id: box.id, user_id: userMap["bob@test.com"] },
    { box_id: box.id, user_id: userMap["charlie@test.com"] },
  ]);

  // Channels
  const { data: general } = await admin
    .from("channels")
    .insert({ box_id: box.id, name: "general", slug: "general", is_private: false, created_by: aliceId })
    .select("id")
    .single();

  if (general) {
    await admin.from("channel_members").insert([
      { channel_id: general.id, user_id: aliceId },
      { channel_id: general.id, user_id: userMap["bob@test.com"] },
      { channel_id: general.id, user_id: userMap["charlie@test.com"] },
    ]);

    await admin.from("messages").insert([
      { channel_id: general.id, user_id: aliceId, content: "Welcome to the general channel!" },
      { channel_id: general.id, user_id: userMap["bob@test.com"], content: "Hey everyone!" },
    ]);
  }

  console.log("✓ E2E seed data inserted");
});
