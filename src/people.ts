import { acceptedJoiners, type Product, type State } from "./model";
export type PersonId = "jerry" | "tom";
export const people = {
  jerry: {
    name: "Jerry",
    initials: "J",
    bio: "Sharing good finds around Bugis. I’ll keep your portion sealed and meet you at the pickup point.",
    completed: 12,
  },
  tom: {
    name: "Tom Chua",
    initials: "TC",
    bio: "A Bugis neighbour who enjoys finding good deals and sharing just enough.",
    completed: 19,
  },
} satisfies Record<
  PersonId,
  { name: string; initials: string; bio: string; completed: number }
>;
export const hostPerson = (p: Product): PersonId => (p.owner ? "tom" : "jerry");
export const isPerson = (id: string): id is PersonId => id in people;
export type NeighbourReview = {
  id: string;
  subject: PersonId;
  author: PersonId;
  rating: number;
  comment: string;
  split: string;
  date: string;
  sample: boolean;
};
const sampleReviews: NeighbourReview[] = [
  {
    id: "jerry-yoghurt",
    subject: "jerry",
    author: "tom",
    rating: 5,
    comment:
      "Jerry kept the yoghurt sealed and was right on time. Easy pickup!",
    split: "Chobani blueberry Greek yoghurt",
    date: "2026-10-11T10:30:00.000Z",
    sample: true,
  },
  {
    id: "jerry-detergent",
    subject: "jerry",
    author: "tom",
    rating: 5,
    comment:
      "Clear messages and the sealed pack we agreed on. Would split with Jerry again.",
    split: "TOP liquid laundry detergent",
    date: "2026-10-09T11:00:00.000Z",
    sample: true,
  },
  {
    id: "jerry-oat",
    subject: "jerry",
    author: "tom",
    rating: 4,
    comment:
      "Good deal. Pickup ran a few minutes late, but Jerry let me know beforehand.",
    split: "Samyang Buldak bowl noodles",
    date: "2026-10-07T11:15:00.000Z",
    sample: true,
  },
  {
    id: "tom-noodles",
    subject: "tom",
    author: "jerry",
    rating: 5,
    comment:
      "Tom arrived on time and checked his portion before confirming. Smooth handover.",
    split: "Bowl noodles",
    date: "2026-10-10T10:30:00.000Z",
    sample: true,
  },
  {
    id: "tom-yoghurt",
    subject: "tom",
    author: "jerry",
    rating: 5,
    comment:
      "Friendly neighbour and quick to reply when we arranged the pickup.",
    split: "Chobani blueberry Greek yoghurt",
    date: "2026-10-08T10:30:00.000Z",
    sample: true,
  },
  {
    id: "tom-drinks",
    subject: "tom",
    author: "jerry",
    rating: 5,
    comment: "Everything went as agreed. Happy to share another find with Tom.",
    split: "Canned drinks",
    date: "2026-10-06T10:30:00.000Z",
    sample: true,
  },
];
export function reviewsFor(state: State, person: PersonId): NeighbourReview[] {
  const submitted = state.products.flatMap((p): NeighbourReview[] => {
    const r = state.reservations[p.id];
    if (
      hostPerson(p) !== person ||
      r?.status !== "completed" ||
      !Number.isInteger(r.rating) ||
      r.rating! < 1 ||
      r.rating! > 5
    )
      return [];
    return [
      {
        id: "review-" + p.id,
        subject: person,
        author: "tom",
        rating: r.rating!,
        comment: r.reviewComment || "",
        split: p.title,
        date: r.reviewedAt || r.createdAt,
        sample: false,
      },
    ];
  });
  return [
    ...submitted,
    ...sampleReviews.filter(
      (r) => r.subject === person && state.accountMode !== "fresh",
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
export function profileSummary(state: State, person: PersonId) {
  const reviews = reviewsFor(state, person);
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const completed =
    (state.accountMode === "fresh" ? 0 : people[person].completed) +
    state.products.filter(
      (p) =>
        (person === "tom" || hostPerson(p) === person) &&
        state.reservations[p.id]?.status === "completed",
    ).length;
  return {
    average: reviews.length ? average.toFixed(1) : "—",
    reviews: reviews.length,
    completed,
  };
}
// Existing local progress keeps its IDs and reservations, with the two personas applied.
export function normalizePersonas(state: State): State {
  return {
    ...state,
    name: people.tom.name,
    products: state.products.map((p) => ({
      ...p,
      host: p.owner ? "Tom" : "Jerry",
    })),
    createDraft: {
      ...state.createDraft,
      ...(state.createDraft.host ? { host: "Tom" } : {}),
    },
  };
}

/** Who a split's chat is with: the host, or everyone Tom accepted into his split. */
export function chatPartner(state: State, p: Product) {
  if (!p.owner) return { name: p.host, id: hostPerson(p) as PersonId };
  const ids = acceptedJoiners(state, p.id)
    .map((r) => r.person)
    .filter(isPerson);
  return {
    name: ids.length
      ? ids.map((id) => people[id].name.split(" ")[0]).join(", ")
      : "Your split",
    id: ids[0],
  };
}
