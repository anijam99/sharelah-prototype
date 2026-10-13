import { expect, it } from "vitest";
import { comparisonCost, comparisonOptions } from "../src/comparison";

it("chooses singles, bundles or a mix without silently pricing a fraction of a bundle", () => {
  const yoghurt = comparisonOptions.yoghurt[0];
  expect(comparisonCost(yoghurt, 1, "walk")).toMatchObject({
    cents: 415,
    items: 1,
    total: 415,
  });
  expect(comparisonCost(yoghurt, 3, "walk")).toMatchObject({
    cents: 1145,
    items: 3,
  });
  const free = { ...yoghurt, bundle: { count: 3, cents: 415 } };
  expect(comparisonCost(free, 2, "walk")).toMatchObject({
    cents: 415,
    items: 3,
    extra: 1,
  });
});
it("adds the return fare once per trip, supports edits and keeps walking free", () => {
  const option = comparisonOptions.yoghurt[0];
  expect(comparisonCost(option, 2, "bus").total).toBe(990);
  expect(comparisonCost(option, 2, "mrt", 400).total).toBe(1130);
  expect(comparisonCost(option, 2, "walk", 400).total).toBe(730);
});
it("charges delivery instead of travel and only waives it at the basket threshold", () => {
  const option = comparisonOptions.detergent[2];
  expect(comparisonCost(option, 1, "mrt")).toMatchObject({
    fee: 499,
    total: 1589,
  });
  expect(comparisonCost(option, 6, "bus")).toMatchObject({
    fee: 0,
    total: 6540,
  });
  expect(comparisonCost(option, 1, "walk", 200).total).toBe(1290);
});
it("normalizes different pack sizes using total cost and all purchased contents", () => {
  const option = comparisonOptions.yoghurt[3];
  expect(comparisonCost(option, 2, "walk").unitCents).toBe(150);
  expect(comparisonCost(option, 2, "bus").unitCents).toBe(243);
});
