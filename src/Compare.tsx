import { useState } from "react";
import {
  ArrowLeftRight,
  MapPin,
  Truck,
  Footprints,
  TrainFront,
  Bus,
} from "lucide-react";
import { Header, Photo, Button } from "./ui";
import { go } from "./router";
import { money, total, type Deal, type Product } from "./model";
import {
  comparisonCost,
  comparisonFamily,
  comparisonOptions,
  type TravelMode,
} from "./comparison";

export function CompareButton({
  item,
  kind,
}: {
  item: Deal | Product;
  kind: "deal" | "offer";
}) {
  if (!comparisonFamily(item)) return null;
  return (
    <Button kind="secondary" onClick={() => go(`/compare/${kind}/${item.id}`)}>
      <ArrowLeftRight size={18} aria-hidden="true" /> Compare prices & travel
    </Button>
  );
}
export function Compare({ item }: { item: Deal | Product }) {
  const [scope, setScope] = useState("same");
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<TravelMode>("walk");
  const [fees, setFees] = useState<Record<string, number>>({});
  const family = comparisonFamily(item);
  if (!family)
    return (
      <>
        <Header title="Compare prices" />
        <p className="content">No comparisons for this item yet.</p>
      </>
    );
  const options = comparisonOptions[family]
    .filter((o) => scope === "all" || o.same)
    .map((option) => ({
      option,
      cost: comparisonCost(
        option,
        quantity,
        mode,
        fees[`${option.id}-${option.delivery ? "delivery" : mode}`],
      ),
    }))
    .sort((a, b) => a.cost.total - b.cost.total);
  const lowest = options[0].cost.total;
  return (
    <>
      <Header title="Compare prices" />
      <main className="page-scroll">
        <div className="content compare-content">
          <div className="compare-product">
            {item.photo && <Photo id={item.photo} alt={item.title} />}
            <div>
              <h2>{item.title}</h2>
              <p className="muted">What will it cost to get it home?</p>
            </div>
          </div>
          <div
            className="segmented"
            role="group"
            aria-label="Comparison products"
          >
            <button
              aria-pressed={scope === "same"}
              className={scope === "same" ? "selected" : ""}
              onClick={() => setScope("same")}
            >
              Same product
            </button>
            <button
              aria-pressed={scope === "all"}
              className={scope === "all" ? "selected" : ""}
              onClick={() => setScope("all")}
            >
              Include other brands
            </button>
          </div>
          <div className="compare-controls panel">
            <label>
              Items needed{" "}
              <select
                aria-label="Items needed"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {[1, 2, 3, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}{" "}
                    {family === "yoghurt"
                      ? n === 1
                        ? "tub"
                        : "tubs"
                      : n === 1
                        ? "bottle"
                        : "bottles"}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Getting there · return trip</legend>
              <div className="chips">
                {(
                  [
                    ["walk", "Walk", Footprints],
                    ["bus", "Bus", Bus],
                    ["mrt", "MRT", TrainFront],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    className={"chip " + (mode === value ? "selected" : "")}
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                  >
                    <Icon size={16} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="fine">From SMU · fares include the return trip.</p>
          </div>
          {"itemCents" in item && (
            <section
              className="panel compare-reference"
              aria-label="Current split comparison"
            >
              <h3>This split · one portion</h3>
              <p>
                {item.place} · {item.distance} m away
              </p>
              <div className="compare-total">
                <span>
                  Pickup total
                  <strong>
                    {money(
                      total(item) +
                        (mode === "walk" ? 0 : mode === "bus" ? 260 : 280),
                    )}
                  </strong>
                </span>
                <span>
                  {money(total(item))} incl. service fee
                  <small>
                    {mode === "walk"
                      ? "Walking · no travel charge"
                      : `${money(mode === "bus" ? 260 : 280)} estimated return ${mode.toUpperCase()}`}
                  </small>
                </span>
              </div>
              <p className="fine">
                {item.closed || item.available < 1
                  ? "No additional portions available."
                  : "One portion per reservation."}
                {quantity > 1
                  ? " Store totals below cover your full requested quantity."
                  : ""}
              </p>
            </section>
          )}
          <p className="fine" role="status">
            {options.length} store options · lowest checkout total first
          </p>
          {options.map(({ option: o, cost }) => (
            <article
              key={o.id}
              className={
                "compare-card panel " + (cost.total === lowest ? "best" : "")
              }
            >
              <div className="compare-card-top">
                <span className="offer-type">
                  {o.delivery ? "Online delivery" : "In store"}
                </span>
                {cost.total === lowest && (
                  <span className="saving-label">Lowest total</span>
                )}
              </div>
              <h3>{o.store}</h3>
              <p>
                {o.title} · {o.size} {o.unit}
              </p>
              {!o.same && (
                <span className="fine">
                  Different brand
                  {(family === "yoghurt" && o.size !== 160) ||
                  (family === "detergent" && o.size !== 2.3)
                    ? " · different pack size"
                    : ""}
                </span>
              )}
              <p className="compare-offer">
                {money(o.singleCents)} each
                {o.bundle
                  ? ` · ${o.bundle.count} for ${money(o.bundle.cents)}`
                  : ""}
              </p>
              <p className="compare-location">
                {o.delivery ? <Truck size={16} /> : <MapPin size={16} />}{" "}
                {o.delivery
                  ? o.delivery.eta
                  : `${o.distance < 1000 ? o.distance + " m" : (o.distance / 1000).toFixed(1) + " km"} · ${mode === "walk" ? Math.ceil(o.distance / 70) : o.minutes} min ${mode === "walk" ? "walk" : "by " + mode.toUpperCase()}`}
              </p>
              <dl className="compare-breakdown">
                <div>
                  <dt>Items × {cost.items}</dt>
                  <dd>{money(cost.cents)}</dd>
                </div>
                <div>
                  <dt>
                    {o.delivery
                      ? "Delivery"
                      : mode === "walk"
                        ? "Walking"
                        : `Return ${mode.toUpperCase()} estimate`}
                  </dt>
                  <dd>{money(cost.fee)}</dd>
                </div>
              </dl>
              {(o.delivery || mode !== "walk") && (
                <label className="compare-fee">
                  Adjust {o.delivery ? "delivery fee" : "return fare"} (S$)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.10"
                    aria-label={`Estimated ${o.delivery ? "delivery fee" : "return fare"} for ${o.store}`}
                    value={
                      (fees[`${o.id}-${o.delivery ? "delivery" : mode}`] ??
                        (o.delivery
                          ? o.delivery.cents
                          : mode === "bus"
                            ? o.busCents
                            : o.mrtCents)) / 100
                    }
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n >= 0 && n <= 100)
                        setFees((f) => ({
                          ...f,
                          [`${o.id}-${o.delivery ? "delivery" : mode}`]:
                            Math.round(n * 100),
                        }));
                    }}
                  />
                </label>
              )}
              {o.delivery?.freeFrom && (
                <p className="fine">
                  Free delivery from {money(o.delivery.freeFrom)} in this basket
                  {cost.cents >= o.delivery.freeFrom
                    ? " · applied"
                    : ` · ${money(o.delivery.freeFrom - cost.cents)} short`}
                  .
                </p>
              )}
              {cost.extra > 0 && (
                <p className="fine">
                  Buy {cost.extra} extra to unlock the lower bundle total.
                </p>
              )}
              <div className="compare-total">
                <span>
                  Total to pay<strong>{money(cost.total)}</strong>
                </span>
                <span>
                  {money(cost.unitCents)} / {o.unit === "g" ? "100 g" : "kg"}
                  <small>including travel or delivery</small>
                </span>
              </div>
              {cost.total > lowest && (
                <p className="fine">
                  {money(cost.total - lowest)} more than the lowest checkout
                  total.
                </p>
              )}
            </article>
          ))}
          <p className="fine">
            Totals compare the selected number of tubs or bottles. Use the price
            per 100 g or kg when pack sizes differ.
          </p>
        </div>
      </main>
    </>
  );
}
