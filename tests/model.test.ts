import { describe, it, expect } from "vitest";
import {
  initialState,
  addDemoHistory,
  addDemoExtras,
  conversationStatus,
  completedSavings,
  reserve,
  cancelReservation,
  complete,
  reportProblem,
  validateCode,
  allocation,
  visibleProducts,
  total,
} from "../src/model";
describe("Reservation lifecycle", () => {
  it("keeps fresh accounts empty across migrations while retaining browsable deals", () => {
    const s = initialState("fresh");
    expect(addDemoExtras(addDemoHistory(s))).toBe(s);
    expect(s.reservations).toEqual({});
    expect(s.saved).toEqual([]);
    expect(s.messages).toEqual({});
    expect(completedSavings(s)).toBe(0);
    expect(visibleProducts(s).length).toBeGreaterThan(0);
    expect(reserve(s, "yog").reservations.yog.status).toBe("ready");
  });
  it("seeds saved items and threads once without restoring removed saves", () => {
    const s = initialState();
    expect(s.saved).toHaveLength(2);
    expect(
      s.saved.every((id) => s.products.some((p) => p.id === id && !p.closed)),
    ).toBe(true);
    expect(Object.keys(s.messages)).toHaveLength(3);
    expect(
      Object.keys(s.messages).every((id) =>
        conversationStatus(
          s,
          s.products.find((p) => p.id === id)!,
        ),
      ),
    ).toBe(true);
    s.saved = [];
    expect(addDemoExtras(s).saved).toEqual([]);
  });
  it("backs demo savings with closed completed history and preserves edits on reload", () => {
    const s = initialState();
    const past = s.products.filter(
      (p) => s.reservations[p.id]?.status === "completed",
    );
    expect(past).toHaveLength(4);
    expect(completedSavings(s)).toBe(1420);
    expect(
      past.every((p) => p.closed && p.purchased && p.available === 0),
    ).toBe(true);
    expect(
      visibleProducts({ ...s, radius: 3000 }).some((p) => past.includes(p)),
    ).toBe(false);
    s.reservations[past[0].id].rating = 5;
    s.reservations[past[0].id].reviewComment = "Easy pickup";
    const migrated = addDemoHistory(reserve(s, "det"));
    expect(migrated.products).toHaveLength(s.products.length);
    expect(migrated.reservations[past[0].id].reviewComment).toBe("Easy pickup");
    expect(migrated.reservations.det.status).toBe("reserved");
    expect(completedSavings(complete(migrated, "yog", true))).toBe(1455);
  });
  it("starts with yoghurt in the tester’s splits", () => {
    const s = initialState();
    expect(s.reservations.yog.status).toBe("ready");
    expect(total(s.products[0])).toBe(380);
  });
  it("reserves once, reduces availability, and prevents a duplicate hold", () => {
    const s = reserve(initialState(), "det");
    expect(s.reservations.det.status).toBe("reserved");
    expect(s.products.find((p) => p.id === "det")!.available).toBe(0);
    expect(reserve(s, "det")).toBe(s);
  });
  it("cancels only before purchase, restoring the portion", () => {
    const s = cancelReservation(reserve(initialState(), "det"), "det");
    expect(s.reservations.det.status).toBe("cancelled");
    expect(s.products.find((p) => p.id === "det")!.available).toBe(1);
    expect(reserve(s, "det").reservations.det.status).toBe("reserved");
    const ready = initialState();
    expect(cancelReservation(ready, "yog")).toBe(ready);
  });
  it("requires explicit confirmation and rejects repeated release", () => {
    const s = initialState();
    expect(complete(s, "yog", false)).toBe(s);
    const done = complete(s, "yog", true);
    expect(done.reservations.yog.status).toBe("completed");
    expect(complete(done, "yog", true)).toBe(done);
    expect(reserve(done, "yog")).toBe(done);
  });
  it("a report blocks code validation and payment release", () => {
    const s = reportProblem(
      initialState(),
      "yog",
      "Wrong item",
      "Seal was broken",
    );
    expect(s.reservations.yog.status).toBe("reported");
    expect(s.reservations.yog.report?.note).toBe("Seal was broken");
    expect(validateCode(s, "yog", "482913")).toBe(false);
    expect(complete(s, "yog", true)).toBe(s);
  });
  it("accepts only the matching ready split’s code or QR payload", () => {
    const s = initialState();
    expect(validateCode(s, "yog", "482913")).toBe(true);
    expect(validateCode(s, "yog", "sharelah:pickup:yog:482913")).toBe(true);
    for (const v of [
      "111111",
      "635271",
      "sharelah:pickup:det:482913",
      "https://evil.example/482913",
    ])
      expect(validateCode(s, "yog", v)).toBe(false);
    expect(validateCode(s, "det", "635271")).toBe(false);
  });
  it("does not reserve a closed, owned or full listing", () => {
    for (const change of [
      { closed: true },
      { owner: true },
      { available: 0 },
    ]) {
      const s = initialState();
      Object.assign(s.products[1], change);
      expect(reserve(s, "det")).toBe(s);
    }
  });
  it("reconciles odd-cent bundle allocations without rounding loss", () => {
    for (let count = 2; count < 21; count++)
      for (let share = 1; share < count; share++) {
        const p = allocation(1001, count, share);
        expect(p.hostCents + p.itemCents * share).toBe(1001);
        expect(p.neighbourTotal).toBe(p.itemCents + 15);
      }
  });
  it("filters the catalog by query, category, radius and neighbourhood", () => {
    const s = initialState();
    expect(visibleProducts(s, "TOP liquid").map((p) => p.id)).toEqual(["det"]);
    expect(
      visibleProducts({ ...s, radius: 500 }).every((p) => p.distance <= 500),
    ).toBe(true);
    expect(
      visibleProducts(s, "", "Food & drinks").every(
        (p) => p.category === "Food & drinks",
      ),
    ).toBe(true);
    expect(visibleProducts(s, "", "Fashion").length).toBeGreaterThan(0);
    expect(visibleProducts({ ...s, radius: 3000 }, "", "Tech")).toHaveLength(2);
    expect(visibleProducts({ ...s, area: "Tampines" })).toEqual([]);
  });
});

it("Jerry claims exactly one hosted portion and cannot join a full or closed listing", async () => {
  const { joinHostedDeal } = await import("../src/model");
  const s = initialState();
  s.products.push({
    ...s.products[1],
    id: "hosted",
    owner: true,
    shareCount: 2,
    available: 2,
  });
  const joined = joinHostedDeal(s, "hosted");
  expect(joined.joinedHosts.hosted).toBe(true);
  expect(joined.products.find((p) => p.id === "hosted")?.available).toBe(1);
  expect(joinHostedDeal(joined, "hosted")).toBe(joined);
  expect(joinHostedDeal(s, "det")).toBe(s);
  const closed = {
    ...s,
    products: s.products.map((p) => ({ ...p, closed: true })),
  };
  expect(joinHostedDeal(closed, "hosted")).toBe(closed);
  const full = {
    ...s,
    products: s.products.map((p) => ({ ...p, available: 0 })),
  };
  expect(joinHostedDeal(full, "hosted")).toBe(full);
});
