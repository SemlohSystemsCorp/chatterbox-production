/**
 * Auth E2E tests
 *
 * Prerequisites:
 *   1. npx supabase start        (local Supabase on port 54321)
 *   2. npm run dev               (Next.js on port 3000)
 *   3. npm run test:e2e
 *
 * Test accounts (seeded by global.setup.ts):
 *   alice@test.com   / Test1234!  — has org + username (fully onboarded)
 *   newuser@test.com / Test1234!  — no username, no org (needs onboarding)
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmitLogin(
  page: Parameters<Parameters<typeof test>[1]>[0],
  email: string,
  password: string
) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------

test.describe("Protected routes", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting /box/* is redirected to /login", async ({ page }) => {
    await page.goto("/box/main");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page is accessible without auth", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("signup page is accessible without auth", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await fillAndSubmitLogin(page, "nobody@test.com", "wrongpassword");
    await expect(page.locator("text=/invalid|incorrect|credentials/i")).toBeVisible({ timeout: 5000 });
  });

  test("shows error on wrong password for existing user", async ({ page }) => {
    await fillAndSubmitLogin(page, "alice@test.com", "wrongpassword");
    await expect(page.locator("text=/invalid|incorrect|credentials/i")).toBeVisible({ timeout: 5000 });
  });

  test("redirects fully-onboarded user to their org", async ({ page }) => {
    await fillAndSubmitLogin(page, "alice@test.com", "Test1234!");
    // Should land somewhere under /org/ or /box/
    await expect(page).toHaveURL(/\/(org|box)\//, { timeout: 10000 });
  });

  test("redirects user with no username to /onboarding", async ({ page }) => {
    await fillAndSubmitLogin(page, "newuser@test.com", "Test1234!");
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
  });

  test("authenticated user visiting /login is redirected away", async ({ page }) => {
    // Sign in first
    await fillAndSubmitLogin(page, "alice@test.com", "Test1234!");
    await expect(page).toHaveURL(/\/(org|box)\//, { timeout: 10000 });

    // Now try to go back to /login — should redirect away
    await page.goto("/login");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

test.describe("Signup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("shows validation error for short password", async ({ page }) => {
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', "newtest@example.com");
    await page.fill('input[name="password"]', "short");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/password|8 char/i")).toBeVisible({ timeout: 5000 });
  });

  test("shows error for already-registered email", async ({ page }) => {
    await page.fill('input[name="firstName"]', "Alice");
    await page.fill('input[name="lastName"]', "Test");
    await page.fill('input[name="email"]', "alice@test.com");
    await page.fill('input[name="password"]', "Test1234!newpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/already|registered|use/i")).toBeVisible({ timeout: 5000 });
  });

  test("successful signup shows verification page", async ({ page }) => {
    const unique = `e2e_${Date.now()}@test.com`;
    await page.fill('input[name="firstName"]', "E2E");
    await page.fill('input[name="lastName"]', "Tester");
    await page.fill('input[name="email"]', unique);
    await page.fill('input[name="password"]', "Test1234!");
    await page.click('button[type="submit"]');
    // Should navigate to /verify
    await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
    await expect(page.locator("text=/verify|code|email/i")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Verify page
// ---------------------------------------------------------------------------

test.describe("Email verification", () => {
  test("shows error for wrong code", async ({ page }) => {
    // Navigate to verify page with a known email
    await page.goto("/verify?email=alice@test.com");
    // Enter a wrong code
    const inputs = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill("0");
    }
    await expect(page.locator("text=/invalid|incorrect|wrong/i")).toBeVisible({ timeout: 5000 });
  });

  test("resend button appears after form is visible", async ({ page }) => {
    await page.goto("/verify?email=alice@test.com");
    await expect(page.locator("text=/resend/i")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

test.describe("Forgot password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("shows success message after valid email submitted", async ({ page }) => {
    await page.fill('input[name="email"]', "alice@test.com");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/check your email/i")).toBeVisible({ timeout: 5000 });
  });

  test("shows success even for unknown email (prevents enumeration)", async ({ page }) => {
    await page.fill('input[name="email"]', "doesnotexist@test.com");
    await page.click('button[type="submit"]');
    // Should not reveal whether email exists
    await expect(page.locator("text=/check your email/i")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

test.describe("Sign out", () => {
  test("signs out and redirects to /login", async ({ page }) => {
    // Sign in first
    await page.goto("/login");
    await fillAndSubmitLogin(page, "alice@test.com", "Test1234!");
    await expect(page).toHaveURL(/\/(org|box)\//, { timeout: 10000 });

    // Click sign out (look for sign out button in the UI)
    await page.click("text=/sign out|log out/i");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

test.describe("Onboarding", () => {
  test("shows username form for user without username", async ({ page }) => {
    await page.goto("/login");
    await fillAndSubmitLogin(page, "newuser@test.com", "Test1234!");
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
    // Username input should be visible
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test("shows error for invalid username (too short)", async ({ page }) => {
    await page.goto("/login");
    await fillAndSubmitLogin(page, "newuser@test.com", "Test1234!");
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });

    await page.fill('input[name="username"]', "ab"); // too short (< 3 chars)
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/3|character|username/i")).toBeVisible({ timeout: 5000 });
  });
});
