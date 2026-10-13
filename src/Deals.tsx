import { useState } from "react";
import { Search } from "lucide-react";
import { Header, Row, Photo, Empty, Button } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { dealPrice } from "./dealCatalog";
import type { Deal } from "./model";

export function DealRow({ deal }: { deal: Deal }) {
  return (
    <Row
      title={deal.title}
      detail={deal.store + " · " + dealPrice(deal)}
      onClick={() => go("/deal/" + deal.id)}
    >
      {deal.photo && (
        <Photo
          id={deal.photo}
          alt={deal.title + " · source photo"}
          className="deal-thumb"
        />
      )}
    </Row>
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
  const categories = ["All", ...new Set(state.deals.map((d) => d.category))];
  return (
    <>
      <Header title="Spotted deals" />
      <main className="page-scroll">
        <div className="content">
          <span className="eyebrow brand-text">
            SPOTTED ON SHELVES & ONLINE
          </span>
          <h2>Every offer, its own find.</h2>
          <p className="muted">
            Browse photographed offers and neighbours’ reports. Prices reflect
            the pictures; check current availability with the store.
          </p>
          <label className="deal-search">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search spotted deals"
              placeholder="Search items, stores or offers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="chips wrap" role="group" aria-label="Deal categories">
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
