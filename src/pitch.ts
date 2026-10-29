import { seedProducts, type Product, type State } from "./model";

/** /pitch shows the app with the pitch deck's example deal. */
export const pitchRoute = (pathname = location.pathname) =>
  /^\/pitch\/?$/i.test(pathname);

/** The pitch deal: ICE Cool Roasted Coconut Water, 3 for S$3.95 (usually S$1.70 each). */
export const pitchSample: Pick<
  Product,
  | "title"
  | "portion"
  | "art"
  | "category"
  | "store"
  | "bundleCents"
  | "bundleCount"
  | "shareCount"
  | "retailCents"
> = {
  title: "ICE Cool Roasted Coconut Water",
  portion: "1 bottle · 500 ml",
  art: "bag",
  category: "Food & drinks",
  store: "Sheng Siong · The Cathay, Basement 1",
  bundleCents: 395,
  bundleCount: 3,
  shareCount: 2,
  retailCents: 170,
};

/** Where the pitch split is collected: the mall the deal is from. */
export const pitchPickup: Pick<Product, "place" | "address"> = {
  place: "The Cathay · Main entrance",
  address: "2 Handy Road",
};

/** The coconut water split you've joined, collected through /scanning. */
export const PITCH_SPLIT = "pitch-coconut";
/** Set by /scanning so the app adds the split before showing its receipt. */
export const PITCH_SCANNED = "sharelah-pitch-scanned";

/** Add (or reset) a ready-to-collect coconut water split that Tom joined. */
export function withPitchSplit(s: State): State {
  const base = seedProducts.find((p) => p.id === "det")!;
  const product: Product = {
    ...base,
    ...pitchSample,
    ...pitchPickup,
    id: PITCH_SPLIT,
    demo: undefined,
    photo: undefined,
    sourceDealId: undefined,
    buyBy: undefined,
    host: "Jerry",
    owner: false,
    purchased: true,
    closed: false,
    itemCents: Math.floor(pitchSample.bundleCents / pitchSample.bundleCount),
    available: pitchSample.shareCount - 1,
    code: "395395",
    distance: 300,
  };
  return {
    ...s,
    products: [...s.products.filter((p) => p.id !== PITCH_SPLIT), product],
    reservations: {
      ...s.reservations,
      [PITCH_SPLIT]: {
        status: "ready",
        method: "Visa •••• 4242",
        createdAt: new Date().toISOString(),
        quantity: 1,
      },
    },
  };
}
