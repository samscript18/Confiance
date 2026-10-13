import { expect, test } from "@playwright/test";
import { createSecp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
test("signed-out workspace hides account details across pages", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Website navigation" })
      .getByRole("link"),
  ).toHaveCount(4);
  await page.getByRole("link", { name: "Open app ↗", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to your Confiance account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payroll Agent", exact: true }),
  ).toHaveCount(0);
  const response = await request.get("/api/state");
  const state = await response.json();
  expect(state.authenticated).toBe(false);
  for (const key of [
    "owner",
    "account",
    "agent",
    "balance",
    "session",
    "recipient",
    "workerTranscript",
    "rejections",
  ])
    expect(state[key]).toBeUndefined();
  expect(state.events).toEqual([]);
  for (const label of ["Account", "Agent", "Activity", "Settings"]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Sign in to your Confiance account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Permissions", exact: true }),
    ).toHaveCount(0);
  }
});
test("mutation endpoints reject unauthenticated and foreign-origin calls", async ({
  request,
}) => {
  const missing = await request.post("/api/agent?action=run", {
    headers: { Origin: "http://localhost:3021" },
  });
  expect(missing.status()).toBe(409);
  const registration = await request.post("/api/cleanverse", {
    headers: { Origin: "http://localhost:3021" },
    data: { action: "register", signature: "0x" },
  });
  expect(registration.status()).toBe(409);
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "proofs/screenshots/landing-mobile.png",
    fullPage: true,
  });
  await page.goto("/app/overview");
  await expect(
    page.getByRole("heading", { name: "Sign in to your Confiance account" }),
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
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: "Agent", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to your Confiance account" }),
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
    const authenticated = await request.get("/api/state");
    expect((await authenticated.json()).authenticated).toBe(true);
    const replay = await request.post("/api/auth", {
      headers: { Origin: "http://localhost:3021" },
      data,
    });
    expect(replay.status()).toBe(401);
    await request.post("/api/auth?action=logout", {
      headers: { Origin: "http://localhost:3021" },
    });
    const signedOut = await request.get("/api/state");
    expect((await signedOut.json()).authenticated).toBe(false);
  } finally {
    session.end();
  }
});

test("landing examples cannot be mistaken for submitted transactions", async ({
  page,
}) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") submissions.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByText("Interactive illustration · simulated activity"),
  ).toBeVisible();
  const proof = page.getByRole("link", { name: "Verify real payment" });
  await expect(proof).toHaveAttribute(
    "href",
    "https://testnet.monadexplorer.com/tx/0x2bfdeac44d85e01c8303bdc181f8231b92332b7d90b4683aef0f32569b1829fc",
  );
  await page.getByRole("button", { name: "Simulate Payment" }).click();
  await expect(
    page.getByText("✓ Simulation complete — no transaction submitted"),
  ).toBeVisible();
  expect(submissions).toEqual([]);
});
