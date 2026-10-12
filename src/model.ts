export type Status =
  "reserved" | "ready" | "reported" | "completed" | "cancelled";
export type Product = {
  id: string;
  title: string;
  portion: string;
  category: string;
  art: string;
  photo?: string;
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
};
export type Message = { id: string; body: string; mine: boolean; time: string };
export type Deal = {
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
export const seedProducts: Product[] = [
  {
    ...common,
    id: "yog",
    title: "Greek yoghurt",
    portion: "1 tub · 150 g",
    category: "Food & drinks",
    art: "yog",
    store: "FairPrice · Bugis",
    bundleCents: 500,
    itemCents: 167,
    retailCents: 270,
    host: "Priya",
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
    id: "det",
    title: "Top detergent",
    portion: "1 bottle · 900 ml",
    category: "Household",
    art: "det",
    store: "Sheng Siong · Rochor",
    bundleCount: 2,
    bundleCents: 1590,
    itemCents: 795,
    retailCents: 990,
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
    id: "oat",
    title: "Oat milk",
    portion: "1 carton · 1 L",
    category: "Food & drinks",
    art: "oat",
    store: "FairPrice · Bras Basah",
    bundleCount: 2,
    bundleCents: 600,
    itemCents: 300,
    retailCents: 420,
    host: "Mei",
    place: "SMU · Li Ka Shing Library",
    address: "70 Stamford Road",
    time: "7:15–7:30 pm",
    distance: 650,
    x: 531,
    y: 463,
    code: "729418",
  },
];
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
    deals: [],
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
