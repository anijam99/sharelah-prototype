import { dealCategories } from "./dealCatalog";
import { SplitPrice } from "./DealPrice";
import { DealRow, matchesDeal } from "./Deals";
import { Fragment, useState } from "react";
import { HomeMap } from "./HomeMap";
import { MapPin, Navigation, Search, SlidersHorizontal } from "lucide-react";
import { Art, Button, Card, Empty, TopHeader } from "./ui";
import { go } from "./router";
import { TileMap } from "./TileMap";
import { useStore } from "./store";
import {
  completedSavings,
  money,
  releasedByHost,
  owned,
  statusLabel,
  total,
  visibleProducts,
} from "./model";
export type HomeVariant = "A" | "B" | "C";
export type { OpenModal } from "./Modals";
import type { OpenModal } from "./Modals";
export function Home({
  open,
  search = false,
  saved = false,
  layout = "A",
}: {
  open: OpenModal;
  search?: boolean;
  saved?: boolean;
  layout?: HomeVariant;
}) {
  const { state } = useStore(),
    [category, setCategory] = useState(
      sessionStorage.getItem("sharelah-category") || "All",
    ),
    [query, setQuery] = useState(
      sessionStorage.getItem("sharelah-search") || "",
    );
  const combined = layout !== "A" && !search && !saved;
  const products = saved
    ? state.products.filter((p) => state.saved.includes(p.id))
    : visibleProducts(state, search ? query : "", category);
  const deals = state.deals.filter((d) =>
    matchesDeal(d, search ? query : "", category),
  );
  return (
    <>
      {!search && !saved && <TopHeader />}
      <main className="page-scroll" data-home-layout={layout}>
        <div className="content">
          {!search && !saved && (
            <>
              <h1 className="sr-only" tabIndex={-1}>
                Nearby deals
              </h1>
              <button
                className="home-location"
                onClick={() => open({ kind: "area" })}
              >
                <MapPin size={17} aria-hidden="true" />
                <strong>{state.area}</strong>
                <span>Change area ›</span>
              </button>
            </>
          )}
          {combined && layout === "B" && <HomeMap products={products} />}
          {!saved &&
            (search ? (
              <label className="search-box">
                <Search size={21} />
                <input
                  aria-label="Search splits and deals"
                  value={query}
                  autoFocus
                  placeholder="Search splits and deals"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    sessionStorage.setItem("sharelah-search", e.target.value);
                  }}
                />
              </label>
            ) : (
              <button className="search-box" onClick={() => go("/search")}>
                <Search size={21} />
                <span>Search splits and deals</span>
              </button>
            ))}
          {!saved && (
            <>
              <div className="chips categories">
                {dealCategories.map((c) => (
                  <button
                    key={c}
                    className={"chip " + (category === c ? "selected" : "")}
                    aria-pressed={category === c}
                    onClick={() => {
                      setCategory(c);
                      sessionStorage.setItem("sharelah-category", c);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                className="filter-bar"
                onClick={() => open({ kind: "filters" })}
              >
                <SlidersHorizontal size={17} />
                <span>Filters</span>
                <span>
                  {state.radius < 1000 ? "500 m" : state.radius / 1000 + " km"}
                </span>
                <span>{state.sort}</span>
              </button>
            </>
          )}
          <div className="section-heading">
            <h2>
              {saved
                ? "Saved splits"
                : search
                  ? "Search results"
                  : "Nearby splits"}
            </h2>
            {!saved && !search && (
              <button
                className="text-button"
                onClick={() => open({ kind: "help" })}
              >
                How it works ›
              </button>
            )}
          </div>
          {!saved && !search && (
            <p className="fine section-intro">
              Neighbours are buying in bulk. Reserve a portion and collect it
              nearby.
            </p>
          )}
          {products.map((p, index) => (
            <Fragment key={p.id}>
              <Card p={p} />
              {combined && layout === "C" && index === 2 && (
                <HomeMap products={products} />
              )}
            </Fragment>
          ))}
          {!products.length && !(search && deals.length) && (
            <Empty
              title={
                saved ? "Your good finds, saved here." : "No matching splits"
              }
              action={
                <Button
                  kind="secondary"
                  onClick={() => (saved ? go("/") : open({ kind: "filters" }))}
                >
                  {saved ? "Explore nearby" : "Change filters"}
                </Button>
              }
            >
              {saved
                ? "Save a split to come back to it later."
                : "Try another search, category or distance."}
            </Empty>
          )}
          {combined && layout === "C" && products.length < 3 && (
            <HomeMap products={products} />
          )}
          {!saved && (
            <>
              <div className="section-heading">
                <h2>{search ? "Matching deals" : "Spotted deals"}</h2>
                <button
                  className="text-button"
                  onClick={() => go("/report-deal")}
                >
                  Post a deal ›
                </button>
              </div>
              {!search && (
                <p className="fine section-intro">
                  Prices neighbours spotted in store. You can’t reserve these:
                  buy them yourself, or start a split to share the bundle.
                </p>
              )}
              {(search ? deals : deals.slice(0, 4)).map((d) => (
                <DealRow key={d.id} deal={d} />
              ))}
              {!search && (
                <Button kind="secondary" onClick={() => go("/deals")}>
                  View all {state.deals.length} spotted deals
                </Button>
              )}
              {search && !deals.length && (
                <p className="muted">No matching spotted deals.</p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
export function MapScreen({ open }: { open: OpenModal }) {
  const { state } = useStore(),
    products = visibleProducts(state),
    [selected, setSelected] = useState(
      sessionStorage.getItem("sharelah-map-selected") || "yog",
    ),
    [recenter, setRecenter] = useState(0);
  const p = products.find((p) => p.id === selected) || products[0];
  return (
    <>
      <TopHeader title="Map" />
      <main className="page-scroll">
        <div className="content">
          <div className="map-controls">
            <button className="chip" onClick={() => open({ kind: "area" })}>
              <MapPin size={17} />
              {state.area}⌄
            </button>
            <button className="chip" onClick={() => open({ kind: "filters" })}>
              {state.radius < 1000 ? "500 m" : state.radius / 1000 + " km"}{" "}
              radius⌄
            </button>
          </div>
          <div className="map-heading">
            <span>Drag the map to explore</span>
            <button
              className="text-button"
              onClick={() => setRecenter((n) => n + 1)}
            >
              <Navigation size={16} />
              Near me
            </button>
          </div>
          <TileMap
            products={products}
            reservations={state.reservations}
            selected={p?.id}
            recenter={recenter}
            radius={state.radius}
            remember
            onSelect={(id) => {
              setSelected(id);
              sessionStorage.setItem("sharelah-map-selected", id);
            }}
          />
          {p ? (
            <div className="panel map-selected">
              <div className="product-line">
                <Art p={p} />
                <div>
                  <h3>{p.title}</h3>
                  {owned(state.reservations[p.id]) && (
                    <span className="membership">In your splits</span>
                  )}
                  <p>{p.place}</p>
                  <small>
                    {owned(state.reservations[p.id])
                      ? statusLabel(state.reservations[p.id])
                      : money(total(p)) + " total"}
                  </small>
                </div>
              </div>
              <SplitPrice
                p={p}
                offer={state.deals.find((d) => d.id === p.sourceDealId)}
              />
              <div className="two-buttons">
                <Button
                  onClick={() =>
                    go(
                      "/" +
                        (owned(state.reservations[p.id]) ? "split" : "offer") +
                        "/" +
                        p.id,
                    )
                  }
                >
                  {owned(state.reservations[p.id])
                    ? state.reservations[p.id]?.status === "completed"
                      ? "View receipt"
                      : "View my split"
                    : "View details"}
                </Button>
                <Button
                  kind="secondary"
                  onClick={() => go("/directions/" + p.id)}
                >
                  Directions
                </Button>
              </div>
            </div>
          ) : (
            <Empty
              title="No splits in this area"
              action={
                <Button onClick={() => open({ kind: "area" })}>
                  Choose another area
                </Button>
              }
            >
              Check another neighbourhood or widen your radius.
            </Empty>
          )}
          <h2>More nearby</h2>
          <p className="muted">Browse available splits in this area.</p>
          {products
            .filter((q) => q.id !== p?.id)
            .map((q) => (
              <Card p={q} key={q.id} />
            ))}
        </div>
      </main>
    </>
  );
}
export function Splits() {
  const { state } = useStore(),
    [tab, setTab] = useState(
      sessionStorage.getItem("sharelah-splits-tab") || "Joined",
    );
  const list = state.products.filter((p) =>
    tab === "Hosting"
      ? p.owner && !p.closed
      : tab === "Past"
        ? state.reservations[p.id]?.status === "completed" ||
          releasedByHost(state.reservations[p.id])
        : owned(state.reservations[p.id]) &&
          state.reservations[p.id].status !== "completed",
  );
  const saved = completedSavings(state);
  return (
    <>
      <TopHeader title="Splits" />
      <main className="page-scroll">
        <div className="content">
          <div className="segmented">
            {["Joined", "Hosting", "Past"].map((t) => (
              <button
                key={t}
                className={t === tab ? "selected" : ""}
                onClick={() => {
                  setTab(t);
                  sessionStorage.setItem("sharelah-splits-tab", t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {list.map((p) => (
            <div key={p.id}>
              {!p.owner && (
                <p className="eyebrow brand-text state-caption">
                  {statusLabel(state.reservations[p.id])}
                </p>
              )}
              <Card p={p} />
            </div>
          ))}
          {!list.length && (
            <Empty
              title={
                tab === "Hosting"
                  ? "Something good to share?"
                  : tab === "Past"
                    ? "Your shared wins will live here."
                    : "Find your next little win."
              }
              action={
                <Button
                  onClick={() =>
                    tab === "Hosting" ? go("/create/1") : go("/")
                  }
                >
                  {tab === "Hosting" ? "Start a split" : "Explore nearby"}
                </Button>
              }
            >
              {tab === "Hosting"
                ? "Found a bundle that’s too much for you? Start a split and share the rest."
                : "Browse nearby splits and reserve only what you need."}
            </Empty>
          )}
          <button
            className="savings-card"
            onClick={() => go("/profile/savings")}
          >
            <h3>Small splits add up.</h3>
            <strong>{money(saved)}</strong>
            <span>Your savings ›</span>
            <div className="shared-edge" />
          </button>
        </div>
      </main>
    </>
  );
}
