import type { Product } from "./model";

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
