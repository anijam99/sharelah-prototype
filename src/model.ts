import { seedDeals } from "./dealCatalog";
export type Status =
  "reserved" | "ready" | "reported" | "completed" | "cancelled";
export type Product = {
  demo?: boolean;
  id: string;
  title: string;
  portion: string;
  category: string;
  art: string;
  photo?: string;
  sourceDealId?: string;
  store: string;
  bundleCount: number;
  bundleCents: number;
  itemCents: number;
  retailCents: number;
  shareCount: number;
  available: number;
  host: string;
  owner: boolean;
  purchased: boolean;
  closed: boolean;
  place: string;
  address: string;
  area: string;
  date: string;
  time: string;
  note: string;
  distance: number;
  x: number;
  y: number;
  code: string;
};
export type Reservation = {
  status: Status;
  method: string;
  createdAt: string;
  report?: { reason: string; note: string };
  rating?: number;
  reviewComment?: string;
  reviewedAt?: string;
};
export type Message = { id: string; body: string; mine: boolean; time: string };
export type Deal = {
  demo?: boolean;
  originalCents?: number;
  offerType?: string;
  priceLabel?: string;
  terms?: string;
  sourceFile?: string;
  bundleCount?: number;
  unitPortion?: string;
  id: string;
  title: string;
  store: string;
  priceCents: number;
  portion: string;
  category: string;
  photo?: string;
  createdAt: string;
  area: string;
};
export type State = {
  version: 1;
  products: Product[];
  reservations: Record<string, Reservation>;
  saved: string[];
  messages: Record<string, Message[]>;
  drafts: Record<string, string>;
  deals: Deal[];
  area: string;
  radius: number;
  sort: string;
  payment: string;
  notify: boolean;
  name: string;
  joinedHosts: Record<string, boolean>;
  createDraft: Partial<Product>;
  started: boolean;
};
const common = {
  owner: false,
  closed: false,
  bundleCount: 3,
  shareCount: 1,
  available: 1,
  date: "Today",
  area: "Bugis",
  note: "Meet by the main entrance.",
  purchased: false,
};
function photographedSplit(dealId: string, retailCents: number) {
  const d = seedDeals.find((d) => d.id === "photo-" + dealId)!;
  return {
    demo: d.demo,
    title: d.title,
    portion: d.unitPortion!,
    category: d.category,
    photo: d.photo,
    sourceDealId: d.id,
    store: d.store,
    bundleCount: d.bundleCount!,
    bundleCents: d.priceCents,
    itemCents: Math.floor(d.priceCents / d.bundleCount!),
    retailCents,
  };
}
export const seedProducts: Product[] = [
  {
    ...common,
    ...photographedSplit("chobani-blueberry", 415),
    id: "yog",
    art: "yog",
    host: "Jerry",
    purchased: true,
    available: 0,
    place: "Bugis+ · Level 1 entrance",
    address: "201 Victoria Street",
    time: "6:30–6:45 pm",
    distance: 250,
    x: 192,
    y: 177,
    code: "482913",
  },
  {
    ...common,
    ...photographedSplit("top-reference", 1490),
    id: "det",
    art: "bag",
    host: "Jerry",
    place: "Bras Basah MRT · Exit A",
    address: "65 Bras Basah Road",
    time: "7:00–7:15 pm",
    distance: 350,
    x: 398,
    y: 333,
    code: "635271",
  },
  {
    ...common,
    ...photographedSplit("buldak", 470),
    id: "oat",
    art: "bag",
    host: "Jerry",
    place: "SMU · Li Ka Shing Library",
    address: "70 Stamford Road",
    time: "7:15–7:30 pm",
    distance: 650,
    x: 531,
    y: 463,
    code: "729418",
  },
];
// Extra demo pickup listings use offers from the supplied photo collection.
seedProducts.push(
  {
    ...seedProducts[1],
    ...photographedSplit("diffuser", 1790),
    id: "berry",
    host: "Jerry",
    place: "Bugis Junction · Main entrance",
    address: "200 Victoria Street",
    distance: 450,
    code: "538214",
  },
  {
    ...seedProducts[1],
    ...photographedSplit("laurier", 607),
    id: "laurier",
    host: "Jerry",
    place: "Rochor MRT · Exit A",
    address: "1 Rochor Canal Road",
    distance: 850,
    code: "864219",
  },
  {
    ...seedProducts[1],
    ...photographedSplit("ribeye-bbq", 1390),
    id: "ribeye",
    host: "Jerry",
    place: "Little India MRT · Exit A",
    address: "60 Bukit Timah Road",
    distance: 1400,
    code: "975312",
  },
);

// More sample categories and price points, with pickups spread across the map.
const existingSources = new Set(seedProducts.map((p) => p.sourceDealId));
seedDeals
  .filter((d) => !existingSources.has(d.id))
  .forEach((d, index) => {
    const distances = [420, 580, 780, 920, 1100, 1300, 1600, 1900];
    const pickupPoints = [
      ["Bugis Junction · Fountain", "200 Victoria Street"],
      ["Bugis+ · Main entrance", "201 Victoria Street"],
      ["National Library · Lobby", "100 Victoria Street"],
      ["Rochor MRT · Exit B", "1 Rochor Canal Road"],
    ];
    const [place, address] = pickupPoints[index % pickupPoints.length];
    seedProducts.push({
      ...seedProducts[1],
      id: `sample-${d.id}`,
      sourceDealId: d.id,
      title: d.title,
      portion: d.unitPortion!,
      category: d.category,
      photo: d.photo,
      store: d.store,
      bundleCount: d.bundleCount!,
      bundleCents: d.priceCents,
      itemCents: Math.floor(d.priceCents / d.bundleCount!),
      retailCents: Math.floor(d.originalCents! / d.bundleCount!),
      shareCount: d.bundleCount! - 1,
      available: d.bundleCount! - 1,
      demo: true,
      place,
      address,
      distance: distances[index % distances.length],
      date: index % 3 ? "Today" : "Tomorrow",
      time: ["12:30–1:00 pm", "6:00–6:30 pm", "7:15–7:45 pm"][index % 3],
      code: String(810000 + index),
      note:
        d.category === "Fashion"
          ? "Message me your size or colour before I buy. Demo pickup."
          : "Meet at the entrance. Sample pickup for the demo.",
    });
  });

// Keep stable IDs/codes and reservation progress when an existing demo loads.
// Sample listings refresh without deleting personal listings or reservation progress.
export function refreshSeedProducts(products: Product[]): Product[] {
  const all = [
    ...products,
    ...structuredClone(
      seedProducts.filter((seed) => !products.some((p) => p.id === seed.id)),
    ),
  ];
  return all.map((p) => {
    const seed = !p.owner && seedProducts.find((seed) => seed.id === p.id);
    if (!seed) return p;
    const {
      demo,
      title,
      portion,
      category,
      art,
      photo,
      sourceDealId,
      store,
      bundleCount,
      bundleCents,
      itemCents,
      retailCents,
    } = seed;
    return {
      ...p,
      demo,
      title,
      portion,
      category,
      art,
      photo,
      sourceDealId,
      store,
      bundleCount,
      bundleCents,
      itemCents,
      retailCents,
    };
  });
}
export function initialState(): State {
  return {
    version: 1,
    products: structuredClone(seedProducts),
    reservations: {
      yog: {
        status: "ready",
        method: "Visa •••• 4242",
        createdAt: new Date().toISOString(),
      },
    },
    saved: [],
    messages: {},
    drafts: {},
    deals: structuredClone(seedDeals),
    area: "Bugis",
    radius: 1000,
    sort: "Nearest first",
    payment: "Visa •••• 4242",
    notify: false,
    name: "Tom Chua",
    joinedHosts: {},
    createDraft: {},
    started: false,
  };
}
export const money = (cents: number) => "S$" + (cents / 100).toFixed(2);
export const total = (p: Product) => p.itemCents + 15;
export const owned = (r?: Reservation) => !!r && r.status !== "cancelled";
export function statusLabel(r?: Reservation) {
  return r?.status === "completed"
    ? "Completed"
    : r?.status === "reported"
      ? "Report under review"
      : r?.status === "ready"
        ? "Ready for pickup"
        : r?.status === "reserved"
          ? "Waiting for purchase"
          : "Available";
}
export function reserve(s: State, id: string): State {
  const p = s.products.find((p) => p.id === id);
  if (!p || p.owner || p.closed || p.available < 1 || owned(s.reservations[id]))
    return s;
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id ? { ...p, available: p.available - 1 } : p,
    ),
    reservations: {
      ...s.reservations,
      [id]: {
        status: p.purchased ? "ready" : "reserved",
        method: s.payment,
        createdAt: new Date().toISOString(),
      },
    },
  };
}
export function cancelReservation(s: State, id: string): State {
  if (s.reservations[id]?.status !== "reserved") return s;
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id
        ? { ...p, available: Math.min(p.shareCount, p.available + 1) }
        : p,
    ),
    reservations: {
      ...s.reservations,
      [id]: { ...s.reservations[id], status: "cancelled" },
    },
  };
}
export function reportProblem(
  s: State,
  id: string,
  reason: string,
  note: string,
): State {
  if (!["ready", "reserved"].includes(s.reservations[id]?.status)) return s;
  return {
    ...s,
    reservations: {
      ...s.reservations,
      [id]: {
        ...s.reservations[id],
        status: "reported",
        report: { reason, note },
      },
    },
  };
}
export function complete(s: State, id: string, confirmed: boolean): State {
  if (!confirmed || s.reservations[id]?.status !== "ready") return s;
  return {
    ...s,
    reservations: {
      ...s.reservations,
      [id]: { ...s.reservations[id], status: "completed" },
    },
  };
}
export function validateCode(s: State, id: string, input: string): boolean {
  const p = s.products.find((p) => p.id === id);
  const value = input.trim();
  return (
    !!p &&
    s.reservations[id]?.status === "ready" &&
    (value === p.code || value === `sharelah:pickup:${p.id}:${p.code}`)
  );
}
export function parsePrice(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
export function allocation(bundleCents: number, count: number, share: number) {
  const item = Math.floor(bundleCents / count);
  return {
    itemCents: item,
    neighbourTotal: item + 15,
    hostCents: bundleCents - item * share,
  };
}
export function visibleProducts(s: State, query = "", category = "All") {
  return s.products
    .filter(
      (p) =>
        !p.owner &&
        !p.closed &&
        p.area === s.area &&
        p.distance <= s.radius &&
        (category === "All" || p.category === category) &&
        `${p.title} ${p.store} ${p.host}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      s.sort === "Lowest price"
        ? total(a) - total(b)
        : s.sort === "Biggest savings"
          ? b.retailCents - total(b) - (a.retailCents - total(a))
          : a.distance - b.distance,
    );
}

export function saveReview(
  s: State,
  id: string,
  rating: number,
  comment: string,
): State {
  if (
    s.reservations[id]?.status !== "completed" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  )
    return s;
  return {
    ...s,
    reservations: {
      ...s.reservations,
      [id]: {
        ...s.reservations[id],
        rating,
        reviewComment: comment.trim().slice(0, 1000),
        reviewedAt: new Date().toISOString(),
      },
    },
  };
}

/** A demo neighbour claims one available portion, at most once per listing. */
export function joinHostedDeal(s: State, id: string): State {
  const p = s.products.find((q) => q.id === id);
  if (!p?.owner || p.closed || p.available < 1 || s.joinedHosts[id]) return s;
  return {
    ...s,
    products: s.products.map((q) =>
      q.id === id ? { ...q, available: q.available - 1 } : q,
    ),
    joinedHosts: { ...s.joinedHosts, [id]: true },
  };
}
