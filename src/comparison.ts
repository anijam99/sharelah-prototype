import type { Deal, Product } from "./model";

export type TravelMode = "walk" | "bus" | "mrt";
export type ComparisonOption = {
  id: string;
  title: string;
  store: string;
  same: boolean;
  size: number;
  unit: "g" | "kg";
  singleCents: number;
  bundle?: { count: number; cents: number };
  distance: number;
  minutes: number;
  busCents: number;
  mrtCents: number;
  delivery?: { cents: number; freeFrom?: number; eta: string };
};
// Scenario data for usability testing, not scraped store prices or route fares.
export function comparisonFamily(item: Pick<Deal | Product, "title">) {
  if (/chobani.*blueberry/i.test(item.title)) return "yoghurt";
  if (/TOP liquid laundry/i.test(item.title)) return "detergent";
  return undefined;
}
const place = (
  distance: number,
  minutes: number,
  busCents = 260,
  mrtCents = 280,
) => ({ distance, minutes, busCents, mrtCents });
export const comparisonOptions: Record<
  "yoghurt" | "detergent",
  ComparisonOption[]
> = {
  yoghurt: [
    {
      id: "y-cs",
      title: "Chobani blueberry Greek yoghurt",
      store: "Cold Storage · Bugis Junction",
      same: true,
      size: 160,
      unit: "g",
      singleCents: 415,
      bundle: { count: 2, cents: 730 },
      ...place(650, 12),
    },
    {
      id: "y-fp",
      title: "Chobani blueberry Greek yoghurt",
      store: "FairPrice · City Square Mall",
      same: true,
      size: 160,
      unit: "g",
      singleCents: 395,
      bundle: { count: 2, cents: 690 },
      ...place(2100, 19, 280, 300),
    },
    {
      id: "y-online",
      title: "Chobani blueberry Greek yoghurt",
      store: "Cold Storage · Online",
      same: true,
      size: 160,
      unit: "g",
      singleCents: 390,
      bundle: { count: 2, cents: 700 },
      ...place(0, 0),
      delivery: { cents: 499, freeFrom: 6000, eta: "Next-day delivery" },
    },
    {
      id: "y-meiji",
      title: "Meiji blueberry yoghurt",
      store: "FairPrice · Rochor Centre",
      same: false,
      size: 140,
      unit: "g",
      singleCents: 230,
      bundle: { count: 2, cents: 420 },
      ...place(900, 14),
    },
    {
      id: "y-farmers",
      title: "Farmers Union Greek-style yoghurt",
      store: "RedMart · Online",
      same: false,
      size: 160,
      unit: "g",
      singleCents: 290,
      ...place(0, 0),
      delivery: { cents: 399, freeFrom: 6000, eta: "Tomorrow, 6–8 pm" },
    },
  ],
  detergent: [
    {
      id: "d-fp",
      title: "TOP liquid laundry detergent",
      store: "FairPrice · Bugis Junction",
      same: true,
      size: 2.3,
      unit: "kg",
      singleCents: 1490,
      bundle: { count: 2, cents: 2100 },
      ...place(650, 12),
    },
    {
      id: "d-ss",
      title: "TOP liquid laundry detergent",
      store: "Sheng Siong · Jalan Berseh",
      same: true,
      size: 2.3,
      unit: "kg",
      singleCents: 1190,
      bundle: { count: 2, cents: 1990 },
      ...place(1600, 18, 280, 300),
    },
    {
      id: "d-online",
      title: "TOP liquid laundry detergent",
      store: "FairPrice · Online",
      same: true,
      size: 2.3,
      unit: "kg",
      singleCents: 1090,
      ...place(0, 0),
      delivery: { cents: 499, freeFrom: 6000, eta: "Next-day delivery" },
    },
    {
      id: "d-dynamo",
      title: "Dynamo liquid laundry detergent",
      store: "FairPrice · Rochor Centre",
      same: false,
      size: 2.3,
      unit: "kg",
      singleCents: 1390,
      bundle: { count: 2, cents: 2290 },
      ...place(900, 14),
    },
    {
      id: "d-breeze",
      title: "Breeze liquid laundry detergent",
      store: "RedMart · Online",
      same: false,
      size: 2.6,
      unit: "kg",
      singleCents: 990,
      ...place(0, 0),
      delivery: { cents: 399, freeFrom: 6000, eta: "Tomorrow, 6–8 pm" },
    },
  ],
};

export function comparisonCost(
  option: ComparisonOption,
  quantity: number,
  mode: TravelMode,
  override?: number,
) {
  const choices = [{ items: quantity, cents: quantity * option.singleCents }];
  if (option.bundle) {
    const { count, cents } = option.bundle;
    choices.push({
      items: quantity,
      cents:
        Math.floor(quantity / count) * cents +
        (quantity % count) * option.singleCents,
    });
    choices.push({
      items: Math.ceil(quantity / count) * count,
      cents: Math.ceil(quantity / count) * cents,
    });
  }
  const basket = choices.sort(
    (a, b) => a.cents - b.cents || a.items - b.items,
  )[0];
  const fee = option.delivery
    ? option.delivery.freeFrom && basket.cents >= option.delivery.freeFrom
      ? 0
      : (override ?? option.delivery.cents)
    : mode === "walk"
      ? 0
      : (override ?? (mode === "bus" ? option.busCents : option.mrtCents));
  const total = basket.cents + fee;
  return {
    ...basket,
    fee,
    total,
    extra: basket.items - quantity,
    unitCents: Math.round(
      (total / (basket.items * option.size)) * (option.unit === "g" ? 100 : 1),
    ),
  };
}
