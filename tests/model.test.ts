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
  reportListing,
  buyBy,
  quantityOf,
  savingFor,
  simulatePurchase,
  readyAlerts,
  seeReady,
  spottedLabel,
  spottedPhrase,
  statusLabel,
  acceptRequest,
  acceptJoiner,
  declineJoiner,
  removeJoiner,
  requestToJoin,
  joinersOf,
  settleRequests,
  HOST_REPLY_MS,
  migrateJoins,
  pendingRequests,
  nextArrival,
  collectJoiner,
  hostedComplete,
  acceptedJoiners,
} from "../src/model";
import type { State } from "../src/model";
/** Reserve, then have the host accept straight away. */
const joinSplit = (s: State, id: string, quantity?: number) =>
  acceptRequest(reserve(s, id, quantity), id);
describe("Reservation lifecycle", () => {
  it("keeps fresh accounts empty across migrations while retaining browsable deals", () => {
    const s = initialState("fresh");
    expect(addDemoExtras(addDemoHistory(s))).toBe(s);
    expect(s.reservations).toEqual({});
    expect(s.saved).toEqual([]);
    expect(s.messages).toEqual({});
    expect(completedSavings(s)).toBe(0);
    expect(visibleProducts(s).length).toBeGreaterThan(0);
    expect(joinSplit(s, "yog").reservations.yog.status).toBe("ready");
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
    expect(completedSavings(s)).toBe(1770);
    expect(
      past.every((p) => p.closed && p.purchased && p.available === 0),
    ).toBe(true);
    expect(
      visibleProducts({ ...s, radius: 3000 }).some((p) => past.includes(p)),
    ).toBe(false);
    s.reservations[past[0].id].rating = 5;
    s.reservations[past[0].id].reviewComment = "Easy pickup";
    const migrated = addDemoHistory(joinSplit(s, "det"));
    expect(migrated.products).toHaveLength(s.products.length);
    expect(migrated.reservations[past[0].id].reviewComment).toBe("Easy pickup");
    expect(migrated.reservations.det.status).toBe("reserved");
    expect(completedSavings(complete(migrated, "yog", true))).toBe(1805);
  });
  it("starts with yoghurt in the tester’s splits", () => {
    const s = initialState();
    expect(s.reservations.yog.status).toBe("ready");
    expect(total(s.products[0])).toBe(380);
  });
  it("reserves once, reduces availability, and prevents a duplicate hold", () => {
    const s = joinSplit(initialState(), "det");
    expect(s.reservations.det.status).toBe("reserved");
    expect(s.products.find((p) => p.id === "det")!.available).toBe(0);
    expect(reserve(s, "det")).toBe(s);
  });
  it("cancels only before purchase, restoring the portion", () => {
    const s = cancelReservation(joinSplit(initialState(), "det"), "det");
    expect(s.reservations.det.status).toBe("cancelled");
    expect(s.products.find((p) => p.id === "det")!.available).toBe(1);
    expect(joinSplit(s, "det").reservations.det.status).toBe("reserved");
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
  it("notifies you once when the host buys a bundle you've joined", () => {
    const base = initialState();
    const s = {
      ...base,
      reservations: {
        ...base.reservations,
        det: {
          status: "reserved" as const,
          method: "PayNow",
          createdAt: new Date().toISOString(),
        },
      },
    };
    const bought = simulatePurchase(s, "det");
    expect(bought.reservations.det.status).toBe("ready");
    expect(readyAlerts(bought).map((p) => p.id)).toEqual(["det"]);
    expect(bought.messages.det.at(-1)?.body).toMatch(/ready to collect/);
    expect(readyAlerts(seeReady(bought, "det"))).toEqual([]);
  });
  it("hides splits you've completed from discovery", () => {
    const s = initialState();
    const ids = (state: typeof s) => visibleProducts(state).map((p) => p.id);
    expect(ids(s)).toContain("yog");
    const done = {
      ...s,
      reservations: {
        ...s.reservations,
        yog: { ...s.reservations.yog!, status: "completed" as const },
      },
    };
    expect(ids(done)).not.toContain("yog");
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

describe("Hosts approve who joins", () => {
  const hosting = () => {
    const s = initialState();
    s.products.push({
      ...s.products[1],
      id: "hosted",
      owner: true,
      shareCount: 2,
      available: 2,
    });
    return s;
  };
  it("lets the host accept, decline or remove neighbours", () => {
    const s = requestToJoin(
      requestToJoin(hosting(), "hosted", "neighbour-a"),
      "hosted",
      "jerry",
    );
    expect(joinersOf(s, "hosted").map((r) => r.status)).toEqual([
      "requested",
      "requested",
    ]);
    // Asking doesn't take a portion; accepting does.
    expect(s.products.find((p) => p.id === "hosted")!.available).toBe(2);
    const declined = declineJoiner(s, "hosted", "neighbour-a");
    const accepted = acceptJoiner(declined, "hosted", "jerry");
    expect(accepted.products.find((p) => p.id === "hosted")!.available).toBe(1);
    expect(acceptJoiner(accepted, "hosted", "jerry")).toBe(accepted);
    expect(acceptJoiner(accepted, "hosted", "neighbour-a")).toBe(accepted);
    const removed = removeJoiner(accepted, "hosted", "jerry");
    expect(removed.products.find((p) => p.id === "hosted")!.available).toBe(2);
    expect(removed.joinRequests.hosted.map((r) => r.status)).toEqual([
      "declined",
      "removed",
    ]);
    // Someone removed or declined can ask again.
    expect(
      joinersOf(requestToJoin(removed, "hosted", "jerry"), "hosted")[0].status,
    ).toBe("requested");
  });
  it("never accepts more people than there are portions, or joins closed splits", () => {
    let s = hosting();
    for (const person of ["neighbour-a", "jerry", "neighbour-b"])
      s = requestToJoin(s, "hosted", person);
    s = acceptJoiner(
      acceptJoiner(s, "hosted", "jerry"),
      "hosted",
      "neighbour-b",
    );
    expect(acceptJoiner(s, "hosted", "neighbour-a")).toBe(s);
    const closed = {
      ...hosting(),
      products: hosting().products.map((p) => ({ ...p, closed: true })),
    };
    expect(requestToJoin(closed, "hosted", "jerry")).toBe(closed);
    expect(requestToJoin(hosting(), "det", "jerry").joinRequests).toEqual({});
  });
  it("can't remove anyone once the host has bought the bundle", () => {
    const s = acceptJoiner(
      requestToJoin(hosting(), "hosted", "jerry"),
      "hosted",
      "jerry",
    );
    const bought = simulatePurchase(s, "hosted");
    expect(removeJoiner(bought, "hosted", "jerry")).toBe(bought);
  });
  it("lists requests needing an answer and when the next one arrives", () => {
    // A moment from now, so the request made "now" below has arrived.
    const now = Date.now() + 1000,
      later = new Date(now + 60_000).toISOString();
    const s = requestToJoin(
      requestToJoin(hosting(), "hosted", "jerry"),
      "hosted",
      "neighbour-a",
      later,
    );
    expect(pendingRequests(s, now).map((r) => r.request.person)).toEqual([
      "jerry",
    ]);
    expect(nextArrival(s, now)).toBe(Date.parse(later));
    expect(nextArrival(hosting(), now)).toBe(Infinity);
    expect(pendingRequests(acceptJoiner(s, "hosted", "jerry"), now)).toEqual(
      [],
    );
  });
  it("completes the split once everyone accepted has collected", () => {
    const joined = acceptJoiner(
      requestToJoin(hosting(), "hosted", "jerry"),
      "hosted",
      "jerry",
    );
    // No collecting before the host has bought the bundle.
    expect(collectJoiner(joined, "hosted", "jerry")).toBe(joined);
    const done = collectJoiner(
      simulatePurchase(joined, "hosted"),
      "hosted",
      "jerry",
    );
    expect(done.joinRequests.hosted[0].status).toBe("collected");
    const p = done.products.find((q) => q.id === "hosted")!;
    expect(p.closed).toBe(true);
    expect(hostedComplete(done, p)).toBe(true);
    expect(conversationStatus(done, p)).toBe("Completed split");
    expect(acceptedJoiners(done, "hosted")).toHaveLength(1);
  });
  it("hides requests scheduled for later until they arrive", () => {
    const later = new Date(Date.now() + 60_000).toISOString();
    const s = requestToJoin(hosting(), "hosted", "neighbour-a", later);
    expect(joinersOf(s, "hosted")).toEqual([]);
    expect(joinersOf(s, "hosted", Date.now() + 61_000)).toHaveLength(1);
    const undated = requestToJoin(hosting(), "hosted", "neighbour-b", "");
    expect(joinersOf(undated, "hosted")).toHaveLength(1);
  });
});

it("migrates an older save's joined flag into an accepted request", () => {
  const { joinRequests, ...old } = initialState();
  const migrated = migrateJoins({
    ...old,
    joinedHosts: { hosted: true },
  } as State);
  expect(migrated.joinedHosts).toBeUndefined();
  expect(migrated.joinRequests.hosted[0]).toMatchObject({
    person: "jerry",
    status: "accepted",
  });
});

describe("Joining someone else's split", () => {
  it("waits for the host, who accepts once the reply time passes", () => {
    const s = reserve(initialState("fresh"), "det");
    expect(s.reservations.det.status).toBe("requested");
    expect(statusLabel(s.reservations.det)).toBe("Waiting for host");
    expect(settleRequests(s, Date.now())).toBe(s);
    const later = settleRequests(s, Date.now() + HOST_REPLY_MS + 1);
    expect(later.reservations.det.status).toBe("reserved");
    expect(later.reservations.det.decideAt).toBeUndefined();
  });
  it("releases the hold when the host declines or removes you", () => {
    const s = reserve(initialState("fresh"), "det");
    const declined = cancelReservation(s, "det", "declined");
    expect(declined.reservations.det.cancelReason).toBe("declined");
    expect(declined.products.find((p) => p.id === "det")!.available).toBe(1);
    expect(statusLabel(declined.reservations.det)).toBe("Request declined");
    // Removal only happens after acceptance; declining only before.
    expect(cancelReservation(s, "det", "removed")).toBe(s);
    const accepted = acceptRequest(s, "det");
    expect(cancelReservation(accepted, "det", "declined")).toBe(accepted);
    const removed = cancelReservation(accepted, "det", "removed");
    expect(statusLabel(removed.reservations.det)).toBe("Removed by host");
  });
});

describe("Listing reports", () => {
  it("saves, updates and withdraws a report without touching reservations", () => {
    const s = initialState();
    const reported = reportListing(
      s,
      "offer:det",
      "Deal has expired",
      "  Ended Sunday ",
    );
    expect(reported.reports?.["offer:det"]).toMatchObject({
      reason: "Deal has expired",
      note: "Ended Sunday",
    });
    expect(reported.reservations).toBe(s.reservations);
    const updated = reportListing(reported, "offer:det", "Fake or misleading");
    expect(updated.reports?.["offer:det"].reason).toBe("Fake or misleading");
    expect(reportListing(updated, "offer:det", "").reports).toEqual({});
  });
  it("handles saves created before reports existed", () => {
    const { reports, ...old } = initialState();
    expect(
      reportListing(old, "deal:x", "Out of stock").reports?.["deal:x"].reason,
    ).toBe("Out of stock");
  });
});

describe("Buy-by times", () => {
  it("defaults to an hour before the pickup window opens", () => {
    const cases: Record<string, string> = {
      "6:30–6:45 pm": "5:30 pm",
      "7:00–7:15 pm": "6:00 pm",
      "12:30–1:00 pm": "11:30 am",
      "11:30–12:15 pm": "10:30 am",
      "9:00–9:30 am": "8:00 am",
      "12:15–12:45 am": "11:15 pm",
      Evening: "before pickup",
    };
    for (const [time, expected] of Object.entries(cases))
      expect(buyBy({ time })).toBe(expected);
    expect(buyBy({ time: "6:30–6:45 pm", buyBy: "4:00 pm" })).toBe("4:00 pm");
  });
});

describe("Multiple portions", () => {
  it("reserves, prices and releases several portions together", () => {
    const s = initialState("fresh");
    const id = s.products.find((p) => !p.owner && p.available >= 2)!.id;
    const before = s.products.find((p) => p.id === id)!;
    const held = reserve(s, id, 2);
    expect(quantityOf(held.reservations[id])).toBe(2);
    expect(held.products.find((p) => p.id === id)!.available).toBe(
      before.available - 2,
    );
    // One service fee per reservation, not per portion.
    expect(total(before, 2)).toBe(before.itemCents * 2 + 15);
    expect(reserve(s, id, before.available + 1)).toBe(s);
    expect(reserve(s, id, 0)).toBe(s);
    const released = cancelReservation(held, id);
    expect(released.products.find((p) => p.id === id)!.available).toBe(
      before.available,
    );
    expect(savingFor(before, 2)).toBe(
      Math.max(0, before.retailCents * 2 - total(before, 2)),
    );
  });
});

describe("Buy-by deadline", () => {
  it("releases a waiting hold when the host misses the buy-by time", () => {
    const held = joinSplit(initialState("fresh"), "det");
    const lapsed = cancelReservation(held, "det", "lapsed");
    expect(lapsed.reservations.det).toMatchObject({
      status: "cancelled",
      cancelReason: "lapsed",
    });
    expect(statusLabel(lapsed.reservations.det)).toBe("Hold released");
    expect(lapsed.products.find((p) => p.id === "det")!.available).toBe(1);
    expect(conversationStatus(lapsed, lapsed.products[1])).toBeNull();
  });
  it("marks a waiting reservation ready when the host buys", () => {
    const held = joinSplit(initialState("fresh"), "det");
    const bought = simulatePurchase(held, "det");
    expect(bought.reservations.det.status).toBe("ready");
    expect(bought.products.find((p) => p.id === "det")!.purchased).toBe(true);
    expect(cancelReservation(bought, "det", "lapsed")).toBe(bought);
  });
});

describe("Questions before reserving", () => {
  it("treats messages on an unreserved split as a question", () => {
    const s = initialState("fresh");
    const det = s.products.find((p) => p.id === "det")!;
    expect(conversationStatus(s, det)).toBeNull();
    const asked = {
      ...s,
      messages: {
        det: [{ id: "q", body: "Still available?", mine: true, time: "" }],
      },
    };
    expect(conversationStatus(asked, det)).toBe("Question");
    expect(conversationStatus(reserve(asked, "det"), det)).toBe(
      "Current split",
    );
  });
});

describe("Spotted dates", () => {
  it("describes how recently a deal was spotted", () => {
    const now = new Date(2026, 9, 19, 12).getTime();
    const at = (d: number) => new Date(2026, 9, d, 9).toISOString();
    expect(spottedLabel(at(19), now)).toBe("Today");
    expect(spottedLabel(at(18), now)).toBe("Yesterday");
    expect(spottedLabel(at(15), now)).toBe("4 days ago");
    expect(spottedLabel(at(2), now)).toBe("2 Oct");
    expect(spottedLabel("", now)).toBe("Date unknown");
    expect(spottedPhrase(at(15), now)).toBe("spotted 4 days ago");
    expect(spottedPhrase(at(2), now)).toBe("spotted on 2 Oct");
  });
  it("gives every catalogue deal a recent spotted date", () => {
    for (const d of initialState().deals)
      if (d.sourceFile || d.demo)
        expect(Date.parse(d.createdAt)).toBeGreaterThan(0);
  });
});
