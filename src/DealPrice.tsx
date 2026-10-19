import {
  money,
  savingFor,
  serviceFee,
  total,
  type Deal,
  type Product,
} from "./model";
import { dealPrice } from "./dealCatalog";

export function DealPrice({ deal: d }: { deal: Deal }) {
  const saving =
    d.originalCents && d.priceCents > 0 ? d.originalCents - d.priceCents : 0;
  return (
    <span className="deal-glance">
      <span className="offer-type">{d.offerType || "Reported offer"}</span>
      <span className="deal-price-line">
        {d.originalCents ? (
          <del>{money(d.originalCents)}</del>
        ) : (
          <span className="price-unknown">Original price not shown</span>
        )}{" "}
        <strong>
          {d.demo && d.priceCents > 0
            ? `${money(d.priceCents)}${d.bundleCount ? " / bundle" : ""}`
            : dealPrice(d)}
        </strong>
      </span>
      <span className={saving > 0 ? "saving-label" : "price-unknown"}>
        {saving > 0
          ? `Save ${money(saving)} (${Math.round((saving / d.originalCents!) * 100)}%) · ${d.bundleCount ? "whole bundle" : "per item"}`
          : "Savings depend on the eligible offer"}
      </span>
    </span>
  );
}
export function SplitPrice({ p, offer }: { p: Product; offer?: Deal }) {
  const saving = savingFor(p);
  return (
    <div className="deal-glance split-glance">
      <span className="offer-type">
        {offer?.priceLabel ||
          `${p.bundleCount} items for ${money(p.bundleCents)}`}
      </span>
      <span className="deal-price-line">
        {p.retailCents > 0 ? (
          <del>{money(p.retailCents)}</del>
        ) : (
          <span className="price-unknown">Original price not shown</span>
        )}{" "}
        <strong>{money(total(p))} / portion</strong>
      </span>
      <span className="saving-label">
        {saving > 0
          ? `Save ${money(saving)} per portion · incl. ${serviceFee} fee`
          : `Includes ${serviceFee} service fee`}
      </span>
    </div>
  );
}
