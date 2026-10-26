import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Header, Photo, Empty, Button } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { dealPrice, dealCategories } from "./dealCatalog";
import { money, spottedLabel, type Deal } from "./model";

const savingPercent = (d: Deal) =>
  d.originalCents && d.priceCents > 0 && d.originalCents > d.priceCents
    ? Math.round((1 - d.priceCents / d.originalCents) * 100)
    : 0;

/** Photo on the left; offer, price and per-item price on the right. */
export function DealRow({ deal }: { deal: Deal }) {
  const saving = savingPercent(deal),
    each =
      deal.bundleCount && deal.bundleCount > 1 && deal.priceCents > 0
        ? money(Math.round(deal.priceCents / deal.bundleCount))
        : null;
  return (
    <button className="spotted-card" onClick={() => go("/deal/" + deal.id)}>
      {deal.photo ? (
        <Photo
          id={deal.photo}
          alt={deal.title + " · source photo"}
          className="deal-thumb"
        />
      ) : (
        <span className="deal-thumb deal-thumb-empty" aria-hidden="true">
          <Tag size={24} />
        </span>
      )}
      <span className="spotted-body">
        <span className="spotted-heading">
          <strong>{deal.title}</strong>
          <small>
            <span className="spotted-store">{deal.store}</span>
            <span>· {spottedLabel(deal.createdAt)}</span>
          </small>
        </span>
        <span className="spotted-price">
          <span className="offer-type">
            {deal.offerType || "Reported offer"}
          </span>
          <span className="spotted-amount">
            {deal.originalCents ? <del>{money(deal.originalCents)}</del> : null}
            <strong>
              {deal.priceCents > 0 ? money(deal.priceCents) : dealPrice(deal)}
            </strong>
          </span>
        </span>
        {(each || saving > 0) && (
          <span className="spotted-meta">
            {each && <span>{each} each</span>}
            {saving > 0 && <span className="saving-pill">Save {saving}%</span>}
          </span>
        )}
      </span>
    </button>
  );
}
export const matchesDeal = (d: Deal, query: string, category: string) =>
  (category === "All" || d.category === category) &&
  `${d.title} ${d.store} ${d.portion} ${d.terms || ""} ${dealPrice(d)}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

const sorts = {
  Newest: (a: Deal, b: Deal) => b.createdAt.localeCompare(a.createdAt),
  "Biggest saving": (a: Deal, b: Deal) => savingPercent(b) - savingPercent(a),
  "Lowest price": (a: Deal, b: Deal) =>
    (a.priceCents || Infinity) - (b.priceCents || Infinity),
};
type Sort = keyof typeof sorts;

export function Deals() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<Sort>("Newest");
  const deals = state.deals
    .filter((d) => matchesDeal(d, query, category))
    .sort(sorts[sort]);
  const categories = [
    ...new Set([...dealCategories, ...state.deals.map((d) => d.category)]),
  ];
  return (
    <>
      <Header title="Spotted deals" />
      <main className="page-scroll">
        <div className="content deals-content">
          <p className="deals-intro">
            Prices neighbours spotted in store. Buy them yourself, or start a
            split to share the bundle.
          </p>
          {/* Search and categories stay in reach while you scroll the list. */}
          <div className="deal-filters">
            <label className="deal-search">
              <Search size={20} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search spotted deals"
                placeholder="Search items or stores"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div
              className="chips categories"
              role="group"
              aria-label="Deal categories"
            >
              {categories.map((c) => (
                <button
                  key={c}
                  className={"chip " + (category === c ? "selected" : "")}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="deals-toolbar">
            <p role="status">
              {deals.length} {deals.length === 1 ? "deal" : "deals"}
            </p>
            <label className="deals-sort">
              <span className="sr-only">Sort deals</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
              >
                {Object.keys(sorts).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <button className="text-button" onClick={() => go("/report-deal")}>
              <Plus size={16} aria-hidden="true" />
              Post a deal
            </button>
          </div>
          {deals.map((d) => (
            <DealRow key={d.id} deal={d} />
          ))}
          {!deals.length && (
            <Empty
              title="No matching deals"
              action={
                <Button
                  kind="secondary"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                >
                  Clear search and filters
                </Button>
              }
            >
              Try another item, store or category.
            </Empty>
          )}
        </div>
      </main>
    </>
  );
}
