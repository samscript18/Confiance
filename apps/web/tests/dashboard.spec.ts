import { expect, test } from "@playwright/test";
import { createSecp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
test("unconfigured dashboard presents missing state without fabricated balances", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Payroll Agent", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Setup required", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run Payroll Agent" }),
  ).toBeDisabled();
  await expect(
    page.getByText("No confirmed activity to display."),
  ).toBeVisible();
  await page.screenshot({
    path: "proofs/screenshots/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Account & policy" }).click();
  await expect(
    page.getByRole("button", { name: "Create passkey" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Authorize session", exact: true }),
  ).toBeDisabled();
});
test("mutation endpoints reject unauthenticated and foreign-origin calls", async ({
  request,
}) => {
  const missing = await request.post("/api/agent?action=run", {
    headers: { Origin: "http://localhost:3021" },
  });
  expect(missing.status()).toBe(409);
  const foreign = await request.post("/api/auth?action=challenge", {
    headers: { Origin: "https://attacker.example" },
  });
  expect(foreign.status()).toBe(401);
  const fake = await request.post("/api/auth", {
    headers: { Origin: "http://localhost:3021" },
    data: {
      id: "invented",
      owner: "0x1111111111111111111111111111111111111111",
      signature: "0x",
    },
  });
  expect(fake.status()).toBe(401);
});
test("mobile dashboard stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Payroll Agent", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "proofs/screenshots/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Account & policy" }).click();
  await expect(
    page.getByRole("heading", { name: "Set the boundaries." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("owner authentication verifies a Mera signature and consumes the challenge", async ({
  request,
}) => {
  // Known unfunded test fixture, used only for authentication; never for settlement.
  const key = new Uint8Array(32);
  key[31] = 1;
  const session = createSecp256k1SigningSession({ privateKey: key });
  key.fill(0);
  try {
    const account = toViemAccount(session);
    const response = await request.post("/api/auth?action=challenge", {
      headers: { Origin: "http://localhost:3021" },
    });
    expect(response.status()).toBe(200);
    const challenge = (await response.json()) as {
      id: string;
      message: string;
    };
    const signature = await account.signMessage({ message: challenge.message });
    const data = { id: challenge.id, owner: account.address, signature };
    const login = await request.post("/api/auth", {
      headers: { Origin: "http://localhost:3021" },
      data,
    });
    expect(login.status()).toBe(200);
    expect(login.headers()["set-cookie"]).toContain("HttpOnly");
    expect(login.headers()["set-cookie"]).toContain("SameSite=strict");
    const replay = await request.post("/api/auth", {
      headers: { Origin: "http://localhost:3021" },
      data,
    });
    expect(replay.status()).toBe(401);
  } finally {
    session.end();
  }
});
