import { describe, it, expect } from "vitest";
import {
  initialState,
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
    expect(visibleProducts(s, "liners").map((p) => p.id)).toEqual(["det"]);
    expect(visibleProducts({ ...s, radius: 500 }).map((p) => p.id)).toEqual([
      "yog",
      "det",
    ]);
    expect(visibleProducts(s, "", "Food & drinks").map((p) => p.id)).toEqual([
      "yog",
      "oat",
    ]);
    expect(visibleProducts({ ...s, area: "Tampines" })).toEqual([]);
  });
});
