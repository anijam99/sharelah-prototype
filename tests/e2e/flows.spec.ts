import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { initialState } from "../../src/model";

// Use a fixed radius for catalogue/flow fixtures, independent of the demo default.
test.beforeEach(async ({ page }) => {
  const state = { ...initialState(), radius: 1000 };
  await page.addInitScript((state) => {
    if (!localStorage.getItem("sharelah-demo-v1"))
      localStorage.setItem("sharelah-demo-v1", JSON.stringify(state));
  }, state);
});

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
    "Request sent",
    { timeout: 7000 },
  );
  await expect(
    page.getByText("Jerry is reviewing your request."),
  ).toBeVisible();
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
    .press("Enter");
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
  await expect(page.getByRole("img", { name: "Your location" })).toBeVisible();
  await expect
    .poll(async () => {
      const center = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("sharelah-map-view")!),
      );
      return Math.abs(center.lat - 1.29572) + Math.abs(center.lng - 103.85096);
    })
    .toBeLessThan(0.0001);
  await page
    .getByRole("button", { name: "Select Chobani blueberry Greek yoghurt" })
    .press("Enter");
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
  await page.route("https://tiles.openfreemap.org/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f4f3ef" },
          },
        ],
      }),
    });
  });
  await page.goto("/#/map");
  // The vector renderer loads lazily and can take a few seconds on a busy machine.
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "OpenStreetMap" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenFreeMap" })).toBeVisible();
  const photoPins = page.locator(".photo-pin");
  expect(await photoPins.count()).toBeGreaterThan(2);
  await expect(photoPins.first().locator(".cropped-photo")).toBeVisible();
  await expect(photoPins.first()).toHaveText("");
  await expect(page.locator(".map-viewport")).not.toContainText("Yours");
  // Keyboard selection remains available when geographically close pins overlap.
  await page
    .getByRole("button", { name: "Select TOP liquid laundry detergent" })
    .press("Enter");
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
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
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

test("confirmation A/B/C selection only sets the next checkout and persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  await page.goto("/");
  const before = await page.evaluate(() =>
    localStorage.getItem("sharelah-demo-v1"),
  );
  for (const name of [
    "B · Extra confirmation",
    "A · Receipt countdown",
    "C · Confirm + countdown",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Open TOP liquid laundry detergent" }),
    ).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("sharelah-demo-v1")),
  ).toBe(before);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "C · Confirm + countdown" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("extra confirmation waits for a decision even after refresh and changing variants", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  await page.goto("/");
  await page.getByRole("button", { name: "B · Extra confirmation" }).click();
  await page
    .getByRole("button", { name: "Open TOP liquid laundry detergent" })
    .click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await expect(
    page.getByRole("heading", { name: "Are you sure?" }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: "C · Confirm + countdown" }).click();
  await page.reload();
  await page.waitForTimeout(5200);
  await expect(
    page.getByRole("heading", { name: "Are you sure?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sharelah-demo-v1")!).reservations.det,
    ),
  ).toBeUndefined();
  await page.screenshot({ path: "/tmp/sharelah-confirm-b.png" });
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reserve a portion" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "B · Extra confirmation" }).click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await page
    .getByRole("button", { name: "Yes, reserve & hold S$10.65" })
    .click();
  await expect(
    page.getByRole("heading", { name: "My reservation" }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(
    state.products.find((p: { id: string }) => p.id === "det").available,
  ).toBe(0);
  expect(state.reservations.det.status).toBe("reserved");
});

test("receipt countdown can skip the wait and changing variants does not interrupt it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await page.getByRole("button", { name: "B · Extra confirmation" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.locator(".receipt-countdown-clock strong")).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-confirm-a.png" });
  await page
    .getByRole("button", { name: "Looks good, proceed", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My reservation" }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(
    state.products.find((p: { id: string }) => p.id === "det").available,
  ).toBe(0);
});

test("confirmation C shows B's question with a top-right countdown and can cancel or proceed early", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  const now = new Date("2026-10-14T12:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "C · Confirm + countdown" }).click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  const heading = page.getByRole("heading", { name: "Are you sure?" });
  const timer = page.getByRole("timer");
  await expect(heading).toBeVisible();
  await expect(timer).toHaveAttribute(
    "aria-label",
    "Confirmation in 5 seconds",
  );
  await expect(
    page.getByText("Reserves automatically when the timer ends.", {
      exact: false,
    }),
  ).toBeVisible();
  const clockBounds = (await timer.boundingBox())!;
  const headingBounds = (await heading.boundingBox())!;
  expect(clockBounds.x).toBeGreaterThan(headingBounds.x + headingBounds.width);
  expect(clockBounds.y).toBeLessThan(headingBounds.y);
  await page.screenshot({ path: "/tmp/sharelah-confirm-c.png" });
  await page.getByRole("button", { name: "B · Extra confirmation" }).click();
  await expect(timer).toBeVisible();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await page.clock.runFor(6000);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sharelah-demo-v1")!).reservations.det,
    ),
  ).toBeUndefined();
  await page.getByRole("button", { name: "C · Confirm + countdown" }).click();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await page
    .getByRole("button", { name: "Yes, reserve & hold S$10.65" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request sent" }),
  ).toBeVisible();
  await page.clock.runFor(6000);
  await expect(
    page.getByRole("heading", { name: "My reservation" }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(
    state.products.find((p: { id: string }) => p.id === "det").available,
  ).toBe(0);
  expect(state.reservations.det.status).toBe("reserved");
});

test("the host reviews Jerry's join request, declines, then accepts when he asks again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
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
  const ask = () => lab.getByRole("button", { name: "Request from Jerry" });
  await ask().click();
  await expect(
    lab.getByRole("button", { name: "Jerry has asked" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Someone wants to join." }),
  ).toBeVisible();
  const requests = page.getByRole("region", { name: "Requests to join" });
  await expect(requests).toContainText("4.7");
  await requests.getByRole("button", { name: "Decline" }).click();
  await expect(
    page.getByRole("heading", { name: "Your split is live." }),
  ).toBeVisible();
  await ask().click();
  await requests.getByRole("button", { name: "Accept" }).click();
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
  await expect(lab.getByLabel("Demo radius")).toHaveValue(
    String(initialState().radius),
  );
});

test("price-tag photos survive reload, can be reused, and are cleared by reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
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
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  const fill = page.locator(".timer-half.right .timer-arc");
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

  await expect(fill).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("timer")).toBeVisible();
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
    page
      .getByRole("dialog")
      .getByRole("button", { name: /Post a spotted deal/ }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Start a split manually/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Start a split", exact: true }),
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
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/#/map");
  for (const title of [
    "Everyday court sneakers",
    "Pocket wireless earbuds",
    "Everyday dotted notebooks",
  ]) {
    await page
      .getByRole("button", { name: `Select ${title}`, exact: true })
      .press("Enter");
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

test("map pins keep their geographic anchors when selection changes after pan and zoom", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/#/map");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.locator(".map-viewport").press("ArrowRight");
  await expect
    .poll(() => page.locator(".leaflet-pan-anim, .leaflet-zoom-anim").count())
    .toBe(0);
  const pins = () =>
    page.locator(".product-marker").evaluateAll((nodes) =>
      nodes.map((node) => ({
        label: node.querySelector("button")?.getAttribute("aria-label"),
        transform: (node as HTMLElement).style.transform,
      })),
    );
  const before = await pins();
  await page
    .getByRole("button", { name: "Select TOP liquid laundry detergent" })
    .press("Enter");
  await expect(page.locator(".map-selected h3")).toHaveText(
    "TOP liquid laundry detergent",
  );
  expect(await pins()).toEqual(before);
  await page
    .getByRole("button", { name: "Select Chobani blueberry Greek yoghurt" })
    .press("Enter");
  await expect(page.locator(".map-selected h3")).toHaveText(
    "Chobani blueberry Greek yoghurt",
  );
  expect(await pins()).toEqual(before);
});

test("compares brands, quantities, return travel and delivery fees", async ({
  page,
}) => {
  await page.goto("/#/deal/photo-chobani-blueberry");
  await expect(
    page.getByText(
      "Sample offer for testing. Prices, stores and availability are illustrative.",
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Compare prices & travel" }).click();
  await expect(page.locator(".compare-card")).toHaveCount(3);
  await page.getByLabel("Items needed").selectOption("2");
  await page.getByRole("button", { name: "Bus", exact: true }).click();
  const fairprice = page.locator(".compare-card").filter({
    has: page.getByRole("heading", { name: "FairPrice · City Square Mall" }),
  });
  await expect(fairprice.locator(".compare-total strong")).toHaveText("S$9.70");
  const online = page.locator(".compare-card").filter({
    has: page.getByRole("heading", { name: "Cold Storage · Online" }),
  });
  await expect(online.locator(".compare-total strong")).toHaveText("S$11.99");
  await page
    .getByLabel("Estimated delivery fee for Cold Storage · Online")
    .fill("0");
  await expect(online.locator(".compare-total strong")).toHaveText("S$7.00");
  await expect(online).toContainText("Lowest total");
  await page.getByRole("button", { name: "Include other brands" }).click();
  await expect(page.locator(".compare-card")).toHaveCount(5);
  await expect(
    page.getByText("Different brand · different pack size"),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-compare.png" });
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "Compare prices & travel" }).click();
  await expect(
    page.getByRole("region", { name: "Current split comparison" }),
  ).toContainText("S$10.65");
  await page.getByLabel("Items needed").selectOption("6");
  const detergentOnline = page
    .locator(".compare-card")
    .filter({ has: page.getByRole("heading", { name: "FairPrice · Online" }) });
  await expect(detergentOnline.locator(".compare-total strong")).toHaveText(
    "S$65.40",
  );
  await expect(detergentOnline).toContainText("applied");
});

test("home layouts A, B and C preserve the feed while changing map placement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f4f3ef" },
          },
        ],
      }),
    }),
  );
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const map = page.getByRole("region", {
    name: "Nearby splits map",
    exact: true,
  });
  const feed = () =>
    page
      .locator(".offer-card")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );
  const original = await feed();
  await expect(map).toHaveCount(0);
  await expect(
    navigation.getByRole("button", { name: "Map", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "B · Map first", exact: true })
    .click();
  await expect(map).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "Map", exact: true }),
  ).toHaveCount(0);
  expect(await feed()).toEqual(original);
  expect(
    await map.evaluate(
      (el) =>
        !!(
          el.compareDocumentPosition(document.querySelector(".offer-card")!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/sharelah-home-b.png" });
  await page.getByRole("button", { name: "Fashion", exact: true }).click();
  const filtered = await page.locator(".offer-card").count();
  await expect(page.locator(".home-map .photo-pin")).toHaveCount(filtered);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page
    .getByRole("button", { name: "C · List first", exact: true })
    .click();
  expect(await feed()).toEqual(original);
  const beforeMap = await map.evaluate(
    (el) =>
      [...document.querySelectorAll(".offer-card")].filter(
        (card) =>
          !!(
            el.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_PRECEDING
          ),
      ).length,
  );
  expect(beforeMap).toBe(3);
  const bounds = (await map.boundingBox())!;
  const viewport = (await page
    .locator(".app-frame .page-scroll")
    .boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(viewport.y + viewport.height);
  await page.screenshot({ path: "/tmp/sharelah-home-c-top.png" });
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeInViewport();
  await page
    .getByRole("button", {
      name: "Select TOP liquid laundry detergent",
      exact: true,
    })
    .press("Enter");
  await expect(
    page.getByRole("button", {
      name: "View selected split: TOP liquid laundry detergent",
    }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-home-c-map.png" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "C · List first" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-home-layout="C"]')).toBeVisible();
  await page.getByRole("button", { name: "A · Separate", exact: true }).click();
  await expect(map).toHaveCount(0);
  await navigation.getByRole("button", { name: "Map", exact: true }).click();
  await page
    .getByRole("button", { name: "B · Map first", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(map).toBeVisible();
});

test("home layout settings stay independent of an active confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 664 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "B · Extra confirmation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "B · Map first", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Open TOP liquid laundry detergent",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Reserve a portion", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm & hold S$10.65", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Are you sure?" }),
  ).toBeVisible();
  const path = page.url();
  await page
    .getByRole("button", { name: "C · List first", exact: true })
    .click();
  expect(page.url()).toBe(path);
  await expect(
    page.getByRole("heading", { name: "Are you sure?" }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "B · Extra confirmation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "C · List first" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await page.goto("/");
  await expect(page.locator('[data-home-layout="C"]')).toBeVisible();
});

test("mobile testing controls live in Profile and fresh accounts stay empty after reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("complementary")).toHaveCount(0);
  const frame = (await page.locator(".app-frame").boundingBox())!;
  expect(frame.y).toBe(0);
  expect(frame.height).toBe(page.viewportSize()!.height);
  await page.screenshot({ path: "/tmp/sharelah-mobile-full-home.png" });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  await page.getByRole("button", { name: /Testing controls/ }).click();
  const lab = page.getByRole("complementary", {
    name: "Prototype testing controls",
  });
  await expect(lab).toBeVisible();
  await expect(page.locator(".app-frame .testing-lab")).toHaveCount(1);
  await page
    .getByRole("button", { name: "C · Confirm + countdown", exact: true })
    .click();
  await page
    .getByRole("button", { name: "B · Map first", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await lab.getByText("Demo settings & tools", { exact: true }).click();
  await page.screenshot({ path: "/tmp/sharelah-mobile-testing.png" });
  await lab
    .getByRole("button", { name: "Start fresh account", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start fresh account", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await page.reload();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(state.accountMode).toBe("fresh");
  expect(state.reservations).toEqual({});
  expect(state.saved).toEqual([]);
  expect(state.messages).toEqual({});
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sharelah-confirmation-variant"),
    ),
  ).toBe("C");
  expect(
    await page.evaluate(() => localStorage.getItem("sharelah-home-variant")),
  ).toBe("B");
  await page.goto("/#/profile");
  await expect(
    page.getByRole("button", { name: "0 Completed splits", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "S$0.00 Total saved", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No reviews yet · View your profile ›"),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sharelah-mobile-fresh-profile.png" });
  await page.goto("/#/messages");
  await expect(
    page.getByRole("heading", { name: "No conversations yet" }),
  ).toBeVisible();
  await page.goto("/#/profile/testing");
  await page
    .getByRole("button", { name: "Reset my demo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset my demo", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#/saved");
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.goto("/#/messages");
  await expect(page.locator(".inbox-group .row-card")).toHaveCount(3);
  await expect(
    page.getByRole("region", { name: "Current splits" }).getByRole("button"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Completed splits" }).getByRole("button"),
  ).toHaveCount(2);
  await page.screenshot({ path: "/tmp/sharelah-mobile-inbox.png" });
  await page
    .getByRole("button", { name: /Jerry · TOP liquid laundry detergent/ })
    .click();
  await expect(
    page.getByText("Completed split · 11 Oct 2026", { exact: true }),
  ).toBeVisible();
});

test("reports a fake or expired listing and remembers it", async ({ page }) => {
  await page.goto("/#/offer/det");
  await page
    .getByRole("button", { name: "Report this split", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Report this split" });
  await expect(
    sheet.getByRole("button", { name: "Submit report" }),
  ).toBeDisabled();
  await sheet.getByText("Fake or misleading").click();
  await sheet.getByRole("button", { name: "Submit report" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("status")).toContainText("fake or misleading");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit your report" }),
  ).toBeVisible();
  await page.goto("/#/deal/photo-chobani-blueberry");
  await page
    .getByRole("button", { name: "Report this deal", exact: true })
    .click();
  await page.getByText("Deal has expired").click();
  await page.getByRole("button", { name: "Submit report" }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sharelah-demo-v1")!),
  );
  expect(Object.keys(state.reports)).toEqual([
    "offer:det",
    "deal:photo-chobani-blueberry",
  ]);
});

test("reserves several portions, then the hold lapses when the host misses the buy-by time", async ({
  page,
}) => {
  await page.goto("/#/offer/sample-demo-tote");
  await expect(page.getByText(/buy it by 6:15 pm today/)).toBeVisible();
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  const sheet = page.getByRole("dialog", { name: "Reserve your portion" });
  await sheet.getByRole("button", { name: "One more portion" }).click();
  await expect(
    sheet.getByRole("button", { name: "One more portion" }),
  ).toBeDisabled();
  const hold = sheet.getByRole("button", { name: /Confirm & hold/ });
  const amount = (await hold.textContent())!.match(/S\$[\d.]+/)![0];
  await hold.click();
  await page.getByRole("button", { name: "Looks good, proceed" }).click();
  await expect(page.getByText("Your 2 portions are reserved.")).toBeVisible();
  await expect(page.getByText(`${amount} held`)).toBeVisible();
  await page.goto("/#/profile/testing");
  await page
    .getByRole("button", { name: "Simulate missed buy-by time" })
    .click();
  await page.goto("/#/split/sample-demo-tote");
  await expect(
    page.getByRole("heading", { name: "Your hold was released" }),
  ).toBeVisible();
  await expect(
    page.getByText(`your ${amount} hold was released`),
  ).toBeVisible();
  await page.goto("/#/offer/sample-demo-tote");
  await expect(page.getByText("2 of 2 left")).toBeVisible();
});

test("asks the host a question before reserving and finds it in the inbox", async ({
  page,
}) => {
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "Ask Jerry" }).click();
  await expect(page.getByText("Asking about this split")).toBeVisible();
  await page.getByRole("button", { name: "Still available?" }).click();
  await expect(page.getByText(/Yes, it’s still available/)).toBeVisible();
  await page.goto("/#/messages");
  await expect(
    page.getByRole("region", { name: "Questions to hosts" }),
  ).toContainText("TOP liquid laundry detergent");
});

test("the host can remove an accepted neighbour before buying", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("sharelah-demo-v1")!);
    state.products.push({
      ...state.products[1],
      id: "hosted-remove",
      owner: true,
      available: 1,
    });
    state.joinRequests["hosted-remove"] = [
      { person: "jerry", quantity: 1, status: "accepted", at: "" },
    ];
    state.products.at(-1).available = 0;
    localStorage.setItem("sharelah-demo-v1", JSON.stringify(state));
  });
  await page.goto("/#/hosting/hosted-remove");
  await page.reload();
  const inSplit = page.getByRole("region", { name: "In this split" });
  await expect(inSplit).toContainText("Jerry");
  await inSplit.getByRole("button", { name: "Remove from split" }).click();
  await page
    .getByRole("dialog", { name: "Remove Jerry?" })
    .getByRole("button", { name: "Remove from split" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your split is live." }),
  ).toBeVisible();
  await expect(page.getByText("1 of 1 portions available")).toBeVisible();
});

test("a declined request releases the hold and explains why", async ({
  page,
}) => {
  await page.goto("/#/offer/det");
  await page.getByRole("button", { name: "Reserve a portion" }).click();
  await page.getByRole("button", { name: "Confirm & hold S$10.65" }).click();
  await page.getByRole("button", { name: "Looks good, proceed" }).click();
  await expect(
    page.getByRole("heading", { name: "Request sent" }),
  ).toBeVisible();
  await page.goto("/#/profile/testing");
  await page.getByRole("button", { name: "Simulate host declining" }).click();
  await page.goto("/#/split/det");
  await expect(
    page.getByRole("heading", { name: "Request declined" }),
  ).toBeVisible();
  await expect(page.getByText(/S\$10\.65 hold was released/)).toBeVisible();
});

test("the prototype lab switches Start a split between steps and one page mid-flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/create/1");
  const lab = page.getByRole("complementary");
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByLabel("Item name").fill("Kirin Ichiban beer six-pack");
  await lab.getByRole("button", { name: "B · One page" }).click();
  await expect(page.getByText("Step 1 of 4")).toHaveCount(0);
  await expect(page.getByLabel("Item name")).toHaveValue(
    "Kirin Ichiban beer six-pack",
  );
  await expect(
    page.getByRole("region", { name: /Portions & price/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    lab.getByRole("button", { name: "B · One page" }),
  ).toHaveAttribute("aria-pressed", "true");
  await lab.getByRole("button", { name: "A · Step by step" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
});
