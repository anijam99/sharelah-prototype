import { it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { seedDeals } from "../src/dealCatalog";
import {
  allocation,
  initialState,
  refreshSeedProducts,
  seedProducts,
} from "../src/model";
import { dealPhotos, photoSource, resolveDealPhoto } from "../src/dealPhotos";

it("covers every supplied image, ships every linked asset, and keeps offer IDs distinct", () => {
  const files = readdirSync("some images of deals").filter((f) =>
    /\.(jpg|png)$/i.test(f),
  );
  expect([...new Set(seedDeals.map((d) => d.sourceFile))].sort()).toEqual(
    files.sort(),
  );
  expect(new Set(seedDeals.map((d) => d.id)).size).toBe(seedDeals.length);
  for (const d of seedDeals) {
    expect(existsSync("public" + photoSource(d.photo!))).toBe(true);
    const crop = resolveDealPhoto(d.photo!);
    expect(crop).toBeDefined();
    for (const [x, y, width, height] of [crop!.thumbnail, crop!.detail]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(crop!.width);
      expect(y + height).toBeLessThanOrEqual(crop!.height);
    }
  }
  expect(Object.keys(dealPhotos)).toHaveLength(seedDeals.length);
  const frames = seedDeals.map((d) => {
    const crop = resolveDealPhoto(d.photo!)!;
    return crop.source + crop.thumbnail.join(",");
  });
  expect(new Set(frames).size).toBe(seedDeals.length);
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
    expect(p.itemCents * p.bundleCount).toBe(p.bundleCents);
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
    title: "Carefree breathable unscented liners",
    photo: seedProducts[1].photo,
    bundleCents: 390,
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
  const carefree = seedDeals.find((d) => d.id === "photo-carefree")!;
  expect(carefree.priceCents).toBe(390);
  expect(
    allocation(carefree.priceCents, carefree.bundleCount!, 1).neighbourTotal,
  ).toBe(210);
  const sixPack = seedDeals.find((d) => d.id === "photo-kirin-six")!;
  expect(sixPack.bundleCount).toBe(6);
  expect(sixPack.priceCents).toBe(1790);
});
