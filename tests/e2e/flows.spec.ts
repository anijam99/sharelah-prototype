import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("browse, reserve, change payment, cancel, and reset", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open Chobani blueberry Greek yoghurt" }),
  ).toContainText("In your splits");
  await page
    .getByRole("button", { name: "Open Carefree breathable unscented liners" })
    .click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  const review = page.getByRole("dialog", { name: "Reserve your portion" });
  await expect(review).toBeVisible();
  await page.getByRole("button", { name: /Payment method · Change/ }).click();
  await page.getByRole("button", { name: /ShareLah wallet/ }).click();
  await page.getByRole("button", { name: "Use payment method" }).click();
  await review.getByRole("button", { name: "Confirm & hold S$2.10" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Confirming your split",
  );
  await expect(page.getByRole("timer")).toHaveAttribute(
    "aria-label",
    /Confirmation in [1-5] seconds/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My reservation",
    { timeout: 7000 },
  );
  await page.reload();
  await expect(page.getByText("Your portion is reserved.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel reservation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel reservation" })
    .click();
  await page.getByRole("button", { name: "My splits", exact: true }).click();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: /Testing controls/ }).click();
  await page
    .getByRole("button", { name: "Reset my demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset my demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Chobani blueberry Greek yoghurt" }),
  ).toContainText("In your splits");
});

test("uploads a real QR image and releases only after explicit receipt confirmation", async ({
  page,
}) => {
  await page.goto("/#/split/yog");
  await page.getByRole("button", { name: "Collect my portion" }).click();
  const svg = await readFile(
    new URL("../../public/testing/pickup-yog.svg", import.meta.url),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "pickup.svg",
    mimeType: "image/svg+xml",
    buffer: svg,
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Confirm receipt",
  );
  const release = page.getByRole("button", {
    name: "Confirm & release S$3.80",
  });
  await expect(release).toBeDisabled();
  await page.getByRole("checkbox").check();
  await release.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Split complete",
  );
  await page.reload();
  await expect(
    page.getByText("A little shared. A little saved."),
  ).toBeVisible();
});

test("map pans, restores selection and shows ownership", async ({ page }) => {
  await page.goto("/#/map");
  const map = page.getByLabel("Scrollable neighbourhood map");
  await map.evaluate((el) => el.scrollTo({ left: 330, top: 260 }));
  await page
    .getByRole("button", { name: "Select Samyang Buldak bowl noodles" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Samyang Buldak bowl noodles",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Samyang Buldak bowl noodles",
      exact: true,
    }),
  ).toBeVisible();
  expect(await map.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Near me" }).click();
  await page
    .getByRole("button", { name: "Select Chobani blueberry Greek yoghurt" })
    .click();
  await expect(page.getByText("In your splits", { exact: true })).toBeVisible();
});

test("mobile headers stay compact and checkout can be undone during the countdown", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator(".top-header")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(64);
  await page
    .getByRole("button", { name: "Open Carefree breathable unscented liners" })
    .click();
  expect(
    await page
      .locator(".page-header")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(64);
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$2.10" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reserve a portion" }),
  ).toBeVisible();
  await page.waitForTimeout(5200);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sharelah-demo-v1")!).reservations.det,
    ),
  ).toBeUndefined();
});

test("the tile map has accessible offer pins, attribution, zoom and pickup locations", async ({
  page,
}) => {
  // Keep tests deterministic without requesting a community tile service.
  await page.route("https://tile.openstreetmap.org/**", async (route) => {
    await route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRzUAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.goto("/#/map");
  await expect(page.locator(".leaflet-tile").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Select Carefree breathable unscented liners",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Select Carefree breathable unscented liners",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Directions", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Select Carefree breathable unscented liners",
    }),
  ).toHaveText("Pickup point");
});
