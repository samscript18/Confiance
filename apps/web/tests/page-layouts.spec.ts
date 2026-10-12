import { expect, test } from "@playwright/test";

const pages = ["overview", "account", "agent", "activity", "settings"] as const;
for (const size of ["desktop", "mobile"] as const) {
  for (const section of pages) {
    test(`${section} layout at ${size} size`, async ({ page }) => {
      await page.setViewportSize(
        size === "desktop"
          ? { width: 1440, height: 1000 }
          : { width: 390, height: 844 },
      );
      await page.goto(`/app/${section}`);
      await expect(page.locator(".app-main h1")).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: "App navigation" })
          .getByRole("link"),
      ).toHaveCount(5);
      await expect(page.locator('[aria-current="page"]')).toHaveAttribute(
        "href",
        `/app/${section}`,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (section === "agent") {
        await expect(
          page.getByRole("heading", { name: "Permissions", exact: true }),
        ).toBeVisible();
        await expect(page.locator("#test-permissions")).not.toHaveAttribute(
          "open",
        );
      }
      if (section === "settings") {
        await expect(
          page.getByRole("heading", { name: "Authorized reporter" }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Register with Cleanverse" }),
        ).toBeVisible();
      }
      if (size === "desktop" && section === "account") {
        const funding = await page.locator(".funding-panel").boundingBox();
        const grid = await page.locator(".setup-grid").boundingBox();
        expect(funding?.width).toBeCloseTo(grid?.width ?? 0, 0);
      }
      if (size === "desktop" && section === "activity") {
        const panel = await page.locator(".lower-grid .panel").boundingBox();
        const grid = await page.locator(".lower-grid").boundingBox();
        expect(panel?.width).toBeCloseTo(grid?.width ?? 0, 0);
      }
      await page.screenshot({
        path: `proofs/screenshots/pages/${section}-${size}.png`,
        fullPage: true,
      });
    });
  }
}
