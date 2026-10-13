import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("browse, reserve, change payment, cancel, and reset", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open Chobani blueberry Greek yoghurt" }),
  ).toContainText("In your splits");
  await page
    .getByRole("button", {
      name: "Open TOP liquid laundry detergent",
    })
    .click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  const review = page.getByRole("dialog", { name: "Reserve your portion" });
  await expect(review).toBeVisible();
  await page.getByRole("button", { name: /Payment method · Change/ }).click();
  await page.getByRole("button", { name: /ShareLah wallet/ }).click();
  await page.getByRole("button", { name: "Use payment method" }).click();
  await review.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
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

test("map restores selection and shows ownership", async ({ page }) => {
  await page.goto("/#/map");
  await expect(page.getByLabel("Interactive neighbourhood map")).toBeVisible();
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

  await page.getByRole("button", { name: "Near me" }).click();
  await page
    .getByRole("button", { name: "Select Chobani blueberry Greek yoghurt" })
    .click();
  await expect(page.getByText("In your splits", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-photo-map.png" });
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
    .getByRole("button", {
      name: "Open TOP liquid laundry detergent",
    })
    .click();
  expect(
    await page
      .locator(".page-header")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(64);
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
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
  await page.route("https://tiles.stadiamaps.com/**", async (route) => {
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
  await expect(page.getByRole("link", { name: "Stadia Maps" })).toBeVisible();
  const photoPins = page.locator(".photo-pin");
  expect(await photoPins.count()).toBeGreaterThan(2);
  await expect(photoPins.first().locator(".cropped-photo")).toBeVisible();
  await expect(photoPins.first()).toHaveText("");
  await expect(page.locator(".map-viewport")).not.toContainText("Yours");
  await page
    .getByRole("button", {
      name: "Select TOP liquid laundry detergent",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Select TOP liquid laundry detergent",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Directions", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Select TOP liquid laundry detergent",
    }),
  ).toHaveText("Pickup point");
});

test("radius changes zoom and deal availability", async ({ page }) => {
  await page.route("https://tiles.stadiamaps.com/**", (route) => route.abort());
  await page.goto("/#/map");
  await page.getByRole("button", { name: "1 km radius" }).click();
  await page.getByRole("button", { name: "500 m", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  const zoom = () =>
    page.evaluate(
      () => JSON.parse(sessionStorage.getItem("sharelah-map-view")!).zoom,
    );
  await expect.poll(zoom).toBeGreaterThan(14);
  const nearZoom = await zoom();
  await expect(
    page.getByRole("button", {
      name: "Select The Meat Joint Western BBQ ribeye",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "500 m radius" }).click();
  await page.getByRole("button", { name: "3 km", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect.poll(zoom).toBeLessThan(nearZoom);
  await expect(
    page.getByRole("button", {
      name: "Select The Meat Joint Western BBQ ribeye",
    }),
  ).toBeVisible();
  await page.goto("/");
  await page.screenshot({ path: "/tmp/sharelah-home.png" });
});

test("A/B previews are replayable and never change reservations", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() =>
    localStorage.getItem("sharelah-demo-v1"),
  );
  const lab = page.getByRole("complementary", {
    name: "Confirmation A/B testing",
  });
  await lab.getByRole("button", { name: "B · Receipt" }).click();
  await expect(
    page.getByRole("heading", { name: "Preparing your reservation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Undo reservation", exact: true }),
  ).toBeVisible();
  const undoBounds = await page
    .getByRole("button", { name: "Undo reservation", exact: true })
    .boundingBox();
  expect(undoBounds!.y + undoBounds!.height).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  );
  await page.screenshot({ path: "/tmp/sharelah-ab-mobile.png" });
  await page
    .getByRole("button", { name: "Undo reservation", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Reservation undone.");
  await lab.getByRole("button", { name: "A · Countdown" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirming your split" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Preview complete" }),
  ).toBeVisible({ timeout: 7000 });
  expect(
    await page.evaluate(() => localStorage.getItem("sharelah-demo-v1")),
  ).toBe(before);
  await lab.getByRole("button", { name: "Replay 5 seconds" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await lab.getByRole("button", { name: "Back to app" }).click();
  await expect(
    page.getByRole("button", {
      name: "Open TOP liquid laundry detergent",
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 950 });
  await lab.getByRole("button", { name: "B · Receipt" }).click();
  await lab.getByText("Why test these two?").click();
  await page.screenshot({ path: "/tmp/sharelah-ab-desktop.png" });
});

test("switching variants during checkout preserves its deadline and commits once", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "B · Receipt" }).click();
  await page.getByRole("button", { name: "Back to app" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "B · Receipt" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", {
      name: "Open TOP liquid laundry detergent",
    })
    .click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await expect(
    page.getByRole("heading", { name: "Preparing your reservation" }),
  ).toBeVisible();
  const deadline = await page.evaluate(() => history.state.holdDeadline);
  await page.getByRole("button", { name: "A · Countdown" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirming your split" }),
  ).toBeVisible();
  expect(await page.evaluate(() => history.state.holdDeadline)).toBe(deadline);
  await page.getByRole("button", { name: "B · Receipt" }).click();
  await expect(
    page.getByRole("heading", { name: "My reservation" }),
  ).toBeVisible({ timeout: 7000 });
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(
    state.products.find((p: { id: string }) => p.id === "det").available,
  ).toBe(0);
  expect(state.reservations.det.status).toBe("reserved");
});

test("outside demo controls let Jerry join once and reset the hosted split", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("sharelah-demo-v1")!);
    state.products.push({
      ...state.products[1],
      id: "hosted-test",
      owner: true,
      available: 1,
    });
    localStorage.setItem("sharelah-demo-v1", JSON.stringify(state));
  });
  await page.goto("/#/hosting/hosted-test");
  await page.reload();
  const lab = page.getByRole("complementary");
  await lab.getByText("Demo settings & tools", { exact: true }).click();
  await lab.getByRole("button", { name: "Jerry joins this split" }).click();
  await expect(
    lab.getByRole("button", { name: "Jerry has joined" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Your neighbour is in." }),
  ).toBeVisible();
  await expect(page.locator(".app-frame .sharing-pizza")).toHaveAttribute(
    "aria-label",
    "2 portions, 1 claimed",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your neighbour is in." }),
  ).toBeVisible();
  const available = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("sharelah-demo-v1")!).products.find(
        (p: { id: string }) => p.id === "hosted-test",
      ).available,
  );
  expect(available).toBe(0);
  await lab.getByText("Demo settings & tools", { exact: true }).click();
  await lab.getByLabel("Demo radius").selectOption("3000");
  await lab.getByRole("button", { name: "Reset demo data" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset my demo" })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(lab.getByLabel("Demo radius")).toHaveValue("1000");
});

test("price-tag photos survive reload, can be reused, and are cleared by reset", async ({
  page,
}) => {
  await page.goto("/#/report-deal");
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/assets/deals/IMG_2008.jpg");
  await expect(
    page.getByRole("button", { name: "Retake photo" }),
  ).toBeVisible();
  const photo = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("sharelah-demo-v1")!).createDraft.photo,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retake photo" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use a saved price-tag photo" })
    .click();
  const gallery = page.getByRole("dialog", { name: "Saved price-tag photos" });
  await expect(
    gallery.getByRole("img", { name: "Saved price tag 1" }),
  ).toBeVisible();
  await gallery
    .getByRole("button", { name: "Reuse saved price tag 1" })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sharelah-demo-v1")!).createDraft.photo,
    ),
  ).toBe(photo);
  const lab = page.getByRole("complementary");
  await lab.getByText("Demo settings & tools", { exact: true }).click();
  await lab.getByRole("button", { name: "Reset demo data" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset my demo" })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await lab
    .getByRole("button", { name: "Saved price-tag photos", exact: true })
    .click();
  await expect(
    page.getByText(
      "No saved price tags yet. Photograph or upload a tag to add one.",
    ),
  ).toBeVisible();
});

test("compact item cards fit two complete deals in the mobile browse viewport", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".offer-card");
  await cards.first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  for (let index = 0; index < 2; index++) {
    const card = await cards.nth(index).boundingBox();
    expect(card!.height).toBeLessThan(190);
    const viewport = await page.locator(".page-scroll").boundingBox();
    expect(card!.y).toBeGreaterThanOrEqual(viewport!.y - 1);
    expect(card!.y + card!.height).toBeLessThanOrEqual(
      viewport!.y + viewport!.height + 1,
    );
  }
  await page.screenshot({ path: "/tmp/sharelah-compact.png" });
});

test("receipt progress is a continuous browser animation and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "B · Receipt" }).click();
  const fill = page.locator(".deadline-fill");
  const timing = await fill.evaluate((el) => {
    const animation = el.getAnimations()[0];
    return {
      duration: animation.effect!.getTiming().duration,
      easing: animation.effect!.getTiming().easing,
      state: animation.playState,
    };
  });
  expect(timing).toEqual({
    duration: 5000,
    easing: "linear",
    state: "running",
  });
  await expect(page.locator(".receipt-amount")).toHaveCSS(
    "background-color",
    "rgb(196, 66, 18)",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Replay 5 seconds" }).click();
  await expect(fill).toHaveCSS("animation-name", "none");
  await expect(page.locator(".reduced-deadline")).toBeVisible();
  await page.getByRole("button", { name: "A · Countdown" }).click();
  await expect(page.locator(".sharing-pizza .pepperoni")).toHaveCount(24);
  await page.screenshot({ path: "/tmp/sharelah-pizza-detail.png" });
});

test("varied demo categories, TOP photo and Share entry points work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open TOP liquid laundry detergent" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fashion", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Everyday court sneakers" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Chobani blueberry Greek yoghurt" }),
  ).toHaveCount(0);
  await expect(
    page.locator('.offer-card img[src="/assets/demo/sneakers.jpg"]'),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-fashion.png" });
  await page.getByRole("button", { name: "Tech", exact: true }).click();
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Share a deal/ }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Enter details manually/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Share a split", exact: true }),
  ).toBeVisible();
  await page.goto("/#/deals");
  await page.getByRole("button", { name: "Stationery", exact: true }).click();
  await expect(page.locator(".spotted-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(".spotted-card")).toHaveCount(23);
  await page.screenshot({ path: "/tmp/sharelah-curated.png" });
});

test("map product photos stay inside their slot beside the text", async ({
  page,
}) => {
  await page.route("https://tiles.stadiamaps.com/**", (route) => route.abort());
  await page.goto("/#/map");
  for (const title of [
    "Everyday court sneakers",
    "Pocket wireless earbuds",
    "Everyday dotted notebooks",
  ]) {
    await page
      .getByRole("button", { name: `Select ${title}`, exact: true })
      .click();
    const panel = page.locator(".map-selected");
    const photo = panel.locator(".product-art img");
    await expect(photo).toBeVisible();
    await expect(photo).toHaveJSProperty("complete", true);
    expect(
      await photo.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    const image = (await photo.boundingBox())!;
    const slot = (await panel.locator(".product-art").boundingBox())!;
    const text = (await panel.locator("h3").boundingBox())!;
    expect(image.width).toBeLessThanOrEqual(slot.width);
    expect(image.height).toBeLessThanOrEqual(slot.height);
    expect(image.x + image.width).toBeLessThanOrEqual(text.x);
  }
  await page.locator(".map-selected").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/sharelah-real-photo-map.png" });
});
