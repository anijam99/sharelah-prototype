import { DealPrice } from "./DealPrice";
import { useState } from "react";
import { Search } from "lucide-react";
import { Header, Photo, Empty, Button } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { dealPrice, dealCategories } from "./dealCatalog";
import { spottedPhrase, type Deal } from "./model";

export function DealRow({ deal }: { deal: Deal }) {
  return (
    <button className="spotted-card" onClick={() => go("/deal/" + deal.id)}>
      <span className="spotted-heading">
        <strong>{deal.title}</strong>
        <small>
          {deal.store} · {spottedPhrase(deal.createdAt)}
        </small>
      </span>
      {deal.photo && (
        <Photo
          id={deal.photo}
          alt={deal.title + " · source photo"}
          className="deal-thumb"
        />
      )}
      <DealPrice deal={deal} />
    </button>
  );
}
export const matchesDeal = (d: Deal, query: string, category: string) =>
  (category === "All" || d.category === category) &&
  `${d.title} ${d.store} ${d.portion} ${d.terms || ""} ${dealPrice(d)}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

export function Deals() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const deals = state.deals.filter((d) => matchesDeal(d, query, category));
  const categories = [
    ...new Set([...dealCategories, ...state.deals.map((d) => d.category)]),
  ];
  return (
    <>
      <Header title="Spotted deals" />
      <main className="page-scroll">
        <div className="content">
          <p className="fine">
            Prices neighbours have spotted in store. These aren’t reservable:
            buy them yourself, or start a split to share a bundle.
          </p>
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
          <p className="fine" role="status">
            {deals.length} {deals.length === 1 ? "deal" : "deals"}
          </p>
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
