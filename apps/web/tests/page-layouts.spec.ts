import { expect, test } from "@playwright/test";

const pages = ["overview", "account", "agent", "activity", "settings"] as const;
for (const size of ["desktop", "tablet", "mobile"] as const) {
  for (const section of pages) {
    test(`${section} layout at ${size} size`, async ({ page }) => {
      await page.setViewportSize(
        size === "desktop"
          ? { width: 1440, height: 1000 }
          : size === "tablet"
            ? { width: 820, height: 1180 }
            : { width: 390, height: 844 },
      );
      await page.goto(`/app/${section}`);
      await expect(page.locator(".app-main h1")).toBeVisible();
      await expect(
        page
          .getByRole("navigation", {
            name: "App navigation",
            includeHidden: true,
          })
          .getByRole("link", { includeHidden: true }),
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
      await expect(
        page.getByRole("heading", {
          name: "Sign in to your Confiance account",
        }),
      ).toBeVisible();
      await expect(page.locator(".authority-card")).toHaveCount(0);
      if (size === "mobile") {
        await expect(
          page.getByRole("navigation", { name: "App navigation" }),
        ).not.toBeVisible();
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await expect(
          page.getByRole("navigation", { name: "App navigation" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Close menu", exact: true })
          .click();
      }
      await page.screenshot({
        path: `proofs/screenshots/pages/${section}-${size}.png`,
        fullPage: true,
      });
    });
  }
}
