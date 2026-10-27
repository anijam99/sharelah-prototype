import { it, expect } from "vitest";
import { existsSync } from "node:fs";
import { mergePhotoDeals, seedDeals } from "../src/dealCatalog";
import {
  allocation,
  initialState,
  refreshSeedProducts,
  seedProducts,
} from "../src/model";
import { dealPhotos, photoSource, resolveDealPhoto } from "../src/dealPhotos";

it("ships a curated, diverse catalogue with valid images and prices", () => {
  expect(seedDeals).toHaveLength(23);
  expect(new Set(seedDeals.map((d) => d.id)).size).toBe(seedDeals.length);
  for (const d of seedDeals) {
    expect(existsSync("public" + photoSource(d.photo!))).toBe(true);
    expect(d.priceCents).toBeGreaterThan(0);
    expect(d.originalCents!).toBeGreaterThan(d.priceCents);
    const crop = resolveDealPhoto(d.photo!);
    if (crop)
      for (const [x, y, width, height] of [crop.thumbnail, crop.detail]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + width).toBeLessThanOrEqual(crop.width);
        expect(y + height).toBeLessThanOrEqual(crop.height);
      }
  }
  expect(seedProducts.filter((p) => /yoghurt/i.test(p.title))).toHaveLength(1);
  expect(new Set(seedDeals.map((d) => d.category)).size).toBe(9);
  expect(seedDeals.some((d) => d.id === "photo-clearance")).toBe(false);
});

it("uses the same photographed products and bundle details in the main splits", () => {
  for (const p of seedProducts) {
    const d = seedDeals.find((d) => d.id === p.sourceDealId)!;
    expect(d).toBeDefined();
    expect(p.photo).toBe(d.photo);
    expect(p.title).toBe(d.title);
    expect(p.portion).toBe(d.unitPortion);
    expect(p.bundleCents).toBe(d.priceCents);
    expect(p.bundleCount).toBe(d.bundleCount);
    expect(p.itemCents).toBe(Math.floor(p.bundleCents / p.bundleCount));
  }
});

it("refreshes old sample items while retaining progress and personal listings", () => {
  const state = initialState();
  const old = {
    ...state.products[1],
    title: "Top detergent",
    photo: undefined,
    available: 0,
    purchased: true,
    closed: true,
  };
  const personal = { ...old, id: "my-own-listing", owner: true };
  const products = refreshSeedProducts([state.products[0], old, personal]);
  expect(products[1]).toMatchObject({
    title: "TOP liquid laundry detergent",
    photo: seedProducts[1].photo,
    bundleCents: 2100,
    available: 0,
    purchased: true,
    closed: true,
    code: old.code,
    place: old.place,
  });
  expect(products[2]).toBe(personal);
});

it("uses the advertised multibuy totals rather than single-item shelf prices", () => {
  const blueberry = seedDeals.find((d) => d.id === "photo-chobani-blueberry")!;
  expect(blueberry.priceCents).toBe(730);
  expect(blueberry.bundleCount).toBe(2);
  expect(
    allocation(blueberry.priceCents, blueberry.bundleCount!, 1).neighbourTotal,
  ).toBe(380);
  const lemon = seedDeals.find((d) => d.id === "photo-top-reference")!;
  expect(lemon.priceCents).toBe(2100);
  expect(
    allocation(lemon.priceCents, lemon.bundleCount!, 1).neighbourTotal,
  ).toBe(715);
  const sixPack = seedDeals.find((d) => d.id === "photo-kirin-six")!;
  expect(sixPack.bundleCount).toBe(6);
  expect(sixPack.priceCents).toBe(1790);
});

it("removes the retired deal from saved catalogs and adds new splits without losing reservations", () => {
  const retired = { ...seedDeals[0], id: "photo-carefree" };
  expect(mergePhotoDeals([retired]).some((d) => d.id === retired.id)).toBe(
    false,
  );
  const old = { ...seedProducts[1], available: 0 };
  const refreshed = refreshSeedProducts([old]);
  expect(refreshed.find((p) => p.id === old.id)?.available).toBe(0);
  expect(refreshed).toHaveLength(seedProducts.length);
  expect(refreshSeedProducts(refreshed)).toHaveLength(seedProducts.length);
});

it("compares original and offer prices for the same bundle quantity", () => {
  const yogurt = seedDeals.find((d) => d.id === "photo-chobani-blueberry")!;
  expect(yogurt.originalCents! - yogurt.priceCents).toBe(100);
  expect(
    seedDeals.find((d) => d.id === "photo-clearance")?.originalCents,
  ).toBeUndefined();
});
