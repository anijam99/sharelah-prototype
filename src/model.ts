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
  /** When the host will buy the bundle, e.g. "6:00 pm". Derived from pickup when absent. */
  buyBy?: string;
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
  /** Portions in this reservation. Older saves have one. */
  quantity?: number;
  /** Why a cancelled hold ended: by you, or because the host missed the buy-by time. */
  cancelReason?: "you" | "lapsed";
  report?: { reason: string; note: string };
  rating?: number;
  reviewComment?: string;
  reviewedAt?: string;
};
export type ListingReport = {
  reason: string;
  note: string;
  createdAt: string;
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
  accountMode?: "seeded" | "fresh";
  demoExtrasAdded?: boolean;
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
  /** Keyed by "offer:<id>" or "deal:<id>". Older saves may not have it. */
  reports?: Record<string, ListingReport>;
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
// Historical offers are snapshots: their prices stay separate from live listings.
const demoHistory = [
  {
    source: "det",
    id: "past-demo-detergent",
    date: "11 Oct 2026",
    at: "2026-10-11T11:00:00.000Z",
  },
  {
    source: "sample-demo-tumbler",
    id: "past-demo-tumbler",
    date: "9 Oct 2026",
    at: "2026-10-09T10:30:00.000Z",
  },
  {
    source: "sample-demo-socks",
    id: "past-demo-socks",
    date: "7 Oct 2026",
    at: "2026-10-07T11:15:00.000Z",
  },
  {
    source: "oat",
    id: "past-demo-noodles",
    date: "5 Oct 2026",
    at: "2026-10-05T11:30:00.000Z",
    itemCents: 330,
    bundleCents: 660,
  },
];

/** Backfill the demo history once while preserving all existing local progress. */
export function addDemoHistory(state: State): State {
  if (state.accountMode === "fresh") return state;
  const products = [...state.products];
  const reservations = { ...state.reservations };
  for (const entry of demoHistory) {
    if (!products.some((p) => p.id === entry.id)) {
      const source = seedProducts.find((p) => p.id === entry.source)!;
      products.push({
        ...structuredClone(source),
        id: entry.id,
        demo: true,
        sourceDealId: undefined,
        date: entry.date,
        ...(entry.itemCents !== undefined
          ? { itemCents: entry.itemCents, bundleCents: entry.bundleCents! }
          : {}),
        available: 0,
        purchased: true,
        closed: true,
        note: "Collected and payment released.",
      });
    }
    if (!reservations[entry.id]) {
      reservations[entry.id] = {
        status: "completed",
        method:
          entry.id === "past-demo-socks" ? "ShareLah wallet" : "Visa •••• 4242",
        createdAt: entry.at,
      };
    }
  }
  return { ...state, products, reservations };
}

/** Add seeded saves and split threads once, without restoring removed saves. */
export function addDemoExtras(state: State): State {
  if (state.accountMode === "fresh" || state.demoExtrasAdded) return state;
  const thread = (
    id: string,
    date: string,
    first: string,
    reply: string,
  ): Message[] => [
    { id: `demo-${id}-1`, body: first, mine: false, time: date },
    { id: `demo-${id}-2`, body: reply, mine: true, time: date },
  ];
  const messages = { ...state.messages };
  const seeds = {
    yog: thread(
      "yog",
      "2026-10-15T09:42:00.000Z",
      "Your yoghurt is ready! Meet at the Bugis+ entrance at 6:30?",
      "Sounds good, see you there!",
    ),
    "past-demo-detergent": thread(
      "det",
      "2026-10-11T11:00:00.000Z",
      "I’m at Bras Basah Exit A with your sealed bottle.",
      "Collected, thank you for sharing!",
    ),
    "past-demo-tumbler": thread(
      "tumbler",
      "2026-10-09T10:30:00.000Z",
      "I have your tumbler. I’ll wait by the Bugis+ entrance.",
      "Got it—thanks Jerry!",
    ),
  };
  for (const [id, items] of Object.entries(seeds)) {
    if (!messages[id]) messages[id] = items;
  }
  return {
    ...state,
    demoExtrasAdded: true,
    saved: [...new Set([...state.saved, "det", "sample-demo-tumbler"])],
    messages,
  };
}

export function initialState(
  accountMode: "seeded" | "fresh" = "seeded",
): State {
  return addDemoExtras(
    addDemoHistory({
      version: 1,
      accountMode,
      products: structuredClone(seedProducts).map((p) =>
        accountMode === "fresh" && p.id === "yog" ? { ...p, available: 1 } : p,
      ),
      reservations:
        accountMode === "fresh"
          ? {}
          : {
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
      radius: 500,
      sort: "Nearest first",
      payment: "Visa •••• 4242",
      notify: false,
      name: "Tom Chua",
      joinedHosts: {},
      createDraft: {},
      started: false,
      reports: {},
    }),
  );
}
export const money = (cents: number) => "S$" + (cents / 100).toFixed(2);
/** Charged once per reservation, however many portions it holds. */
export const SERVICE_FEE_CENTS = 15;
export const serviceFee = money(SERVICE_FEE_CENTS);
export const quantityOf = (r?: Reservation) => r?.quantity || 1;
export const total = (p: Product, quantity = 1) =>
  p.itemCents * quantity + SERVICE_FEE_CENTS;
export const savingFor = (p: Product, quantity = 1) =>
  Math.max(0, p.retailCents * quantity - total(p, quantity));
export const completedSavings = (s: State) =>
  s.products.reduce(
    (sum, p) =>
      sum +
      (s.reservations[p.id]?.status === "completed"
        ? savingFor(p, quantityOf(s.reservations[p.id]))
        : 0),
    0,
  );
/** The host's buy-by time: explicit, or an hour before the pickup window opens. */
export function buyBy(p: Pick<Product, "buyBy" | "time">) {
  if (p.buyBy) return p.buyBy;
  // Windows look like "6:30–6:45 pm"; the am/pm suffix belongs to the end time.
  const m = p.time.match(/^(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return "before pickup";
  const pm = m[5].toLowerCase() === "pm" ? 12 : 0;
  const end = ((Number(m[3]) % 12) + pm) * 60 + Number(m[4]);
  let start = ((Number(m[1]) % 12) + pm) * 60 + Number(m[2]);
  if (start > end) start -= 12 * 60;
  const at = (start - 60 + 24 * 60) % (24 * 60);
  const hour = Math.floor(at / 60);
  return `${((hour + 11) % 12) + 1}:${String(at % 60).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`;
}
export const owned = (r?: Reservation) => !!r && r.status !== "cancelled";
export function conversationStatus(s: State, p: Product) {
  const r = s.reservations[p.id];
  if (r?.status === "completed" || (p.owner && p.closed && s.joinedHosts[p.id]))
    return "Completed split";
  if (owned(r) || (p.owner && !p.closed && s.joinedHosts[p.id]))
    return "Current split";
  // Messages before reserving are questions to the host.
  if (!p.owner && s.messages[p.id]?.length) return "Question";
  return null;
}
export function statusLabel(r?: Reservation) {
  if (r?.cancelReason === "lapsed") return "Hold released";
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
export function reserve(s: State, id: string, quantity = 1): State {
  const p = s.products.find((p) => p.id === id);
  if (
    !p ||
    p.owner ||
    p.closed ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    p.available < quantity ||
    owned(s.reservations[id])
  )
    return s;
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id ? { ...p, available: p.available - quantity } : p,
    ),
    reservations: {
      ...s.reservations,
      [id]: {
        status: p.purchased ? "ready" : "reserved",
        method: s.payment,
        createdAt: new Date().toISOString(),
        quantity,
      },
    },
  };
}
/** Releases a hold before purchase: cancelled by you, or lapsed when the host missed the buy-by time. */
export function cancelReservation(
  s: State,
  id: string,
  reason: "you" | "lapsed" = "you",
): State {
  const r = s.reservations[id];
  if (r?.status !== "reserved") return s;
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id
        ? {
            ...p,
            available: Math.min(p.shareCount, p.available + quantityOf(r)),
          }
        : p,
    ),
    reservations: {
      ...s.reservations,
      [id]: { ...r, status: "cancelled", cancelReason: reason },
    },
  };
}
/** Demo: the host buys the bundle, so a waiting reservation becomes ready. */
export function simulatePurchase(s: State, id: string): State {
  return {
    ...s,
    products: s.products.map((q) =>
      q.id === id ? { ...q, purchased: true } : q,
    ),
    reservations:
      s.reservations[id]?.status === "reserved"
        ? {
            ...s.reservations,
            [id]: { ...s.reservations[id], status: "ready" },
          }
        : s.reservations,
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
    neighbourTotal: item + SERVICE_FEE_CENTS,
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
          ? savingFor(b) - savingFor(a)
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

export const reportReasons = [
  ["Fake or misleading", "The item, photo or price doesn’t look genuine."],
  ["Deal has expired", "The offer has ended or the price has changed."],
  ["Out of stock", "The store no longer has this item."],
  ["Wrong details", "The price, pack size, store or pickup is incorrect."],
  ["Prohibited or unsafe item", "This shouldn’t be shared on ShareLah."],
  ["Something else", "Tell us what’s wrong below."],
] as const;
/** Saves or replaces this tester's report; an empty reason withdraws it. */
export function reportListing(
  s: State,
  key: string,
  reason: string,
  note = "",
): State {
  const reports = { ...s.reports };
  if (reason)
    reports[key] = {
      reason,
      note: note.trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
    };
  else delete reports[key];
  return { ...s, reports };
}

/** "Today", "Yesterday", "3 days ago", then a short date once it's over a week old. */
export function spottedLabel(iso: string, now = Date.now()) {
  if (!iso) return "Date unknown";
  const day = 24 * 60 * 60 * 1000;
  const start = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const days = Math.round((start(now) - start(Date.parse(iso))) / day);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 8) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}
/** Deals this tester posted, as opposed to sample or photographed demo deals. */
export const postedByYou = (d: Deal) => !d.demo && !d.sourceFile;
/** For running text: "spotted today", "spotted 3 days ago", "spotted on 2 Oct". */
export function spottedPhrase(iso: string, now = Date.now()) {
  const label = spottedLabel(iso, now);
  if (label === "Date unknown") return "date unknown";
  if (label === "Today" || label === "Yesterday")
    return "spotted " + label.toLowerCase();
  return label.endsWith("ago") ? "spotted " + label : "spotted on " + label;
}
