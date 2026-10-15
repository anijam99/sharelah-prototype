import { it, expect } from "vitest";
import { complete, initialState, saveReview } from "../src/model";
import {
  normalizePersonas,
  people,
  profileSummary,
  reviewsFor,
} from "../src/people";

it("accepts reviews only for completed splits with a valid star rating", () => {
  const initial = initialState();
  expect(saveReview(initial, "yog", 5, "Too early")).toBe(initial);
  const completed = complete(initial, "yog", true);
  for (const rating of [0, 6, 2.5, NaN])
    expect(saveReview(completed, "yog", rating, "No")).toBe(completed);
  const saved = saveReview(completed, "yog", 5, "  Great pickup  ");
  expect(saved.reservations.yog.reviewComment).toBe("Great pickup");
  expect(saved.reservations.yog.reviewedAt).toBeTruthy();
  expect(
    saveReview(completed, "yog", 5, "x".repeat(1200)).reservations.yog
      .reviewComment,
  ).toHaveLength(1000);
});

it("starts fresh profiles with no reviews, rating or completed split count", () => {
  const state = initialState("fresh");
  expect(reviewsFor(state, "tom")).toEqual([]);
  expect(profileSummary(state, "tom")).toEqual({
    average: "—",
    reviews: 0,
    completed: 0,
  });
  const completed = complete(
    {
      ...state,
      reservations: {
        yog: {
          status: "ready",
          method: state.payment,
          createdAt: new Date().toISOString(),
        },
      },
    },
    "yog",
    true,
  );
  expect(profileSummary(completed, "tom").completed).toBe(1);
});

it("combines reviews across Jerry's splits and replaces an edited review", () => {
  let state = saveReview(
    complete(initialState(), "yog", true),
    "yog",
    5,
    "First comment",
  );
  expect(reviewsFor(state, "jerry")).toHaveLength(4);
  expect(profileSummary(state, "jerry").average).toBe("4.8");
  expect(profileSummary(state, "tom").completed).toBe(24);
  state = saveReview(state, "yog", 1, "Changed comment");
  expect(reviewsFor(state, "jerry")).toHaveLength(4);
  expect(profileSummary(state, "jerry").average).toBe("3.8");
  expect(
    reviewsFor(state, "jerry").find((r) => r.id === "review-yog")?.comment,
  ).toBe("Changed comment");
});

it("has only Tom and Jerry and normalizes hosted listings to Tom", () => {
  const state = initialState();
  state.products.push({
    ...state.products[0],
    id: "mine",
    owner: true,
    host: "Other",
  });
  const migrated = normalizePersonas(state);
  expect(Object.keys(people).sort()).toEqual(["jerry", "tom"]);
  expect(migrated.products.find((p) => p.id === "mine")?.host).toBe("Tom");
  expect(
    migrated.products.filter((p) => !p.owner).every((p) => p.host === "Jerry"),
  ).toBe(true);
  for (const id of ["tom", "jerry"] as const)
    expect(reviewsFor(migrated, id).every((r) => r.author in people)).toBe(
      true,
    );
});
