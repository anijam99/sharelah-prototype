import { dealCategories } from "./dealCatalog";
import { DealRow, matchesDeal } from "./Deals";
import { Fragment, useState } from "react";
import { HomeMap } from "./HomeMap";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AlertBadge, Art, Button, Card, Empty, TopHeader } from "./ui";
import { go } from "./router";
import { TileMap } from "./TileMap";
import { useStore } from "./store";
import {
  completedSavings,
  hostedComplete,
  money,
  pendingRequests,
  readyAlerts,
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
    ? state.products.filter(
        (p) =>
          state.saved.includes(p.id) &&
          state.reservations[p.id]?.status !== "completed",
      )
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
              <LocationControls open={open} filters />
            </>
          )}
          {combined && layout === "B" && <HomeMap products={products} />}
          {!saved && (
            <div className="search-row">
              {search ? (
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
              )}
              {search && <FilterButton open={open} />}
            </div>
          )}
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
const radiusLabel = (radius: number) =>
  radius < 1000 ? radius + " m" : radius / 1000 + " km";

/** Opens the radius and sort sheet. Sits beside search, or beside the area on Map. */
function FilterButton({ open }: { open: OpenModal }) {
  const { state } = useStore();
  return (
    <button
      className="filter-button"
      aria-label={`Filters · ${radiusLabel(state.radius)} radius, ${state.sort}`}
      title="Filters"
      onClick={() => open({ kind: "filters" })}
    >
      <SlidersHorizontal size={20} aria-hidden="true" />
    </button>
  );
}

/** The area picker, shared by Home and Map so both look the same. */
function LocationControls({
  open,
  filters = false,
}: {
  open: OpenModal;
  filters?: boolean;
}) {
  const { state } = useStore();
  return (
    <div className="location-row">
      <button className="home-location" onClick={() => open({ kind: "area" })}>
        <MapPin size={17} aria-hidden="true" />
        <strong>
          {state.area}{" "}
          <span className="location-radius">({radiusLabel(state.radius)})</span>
        </strong>
        <span>Change area ›</span>
      </button>
      {filters && <FilterButton open={open} />}
    </div>
  );
}

/** The split to reselect when returning to the Map from one of its pages. */
const MAP_RETURN = "sharelah-map-return";

export function MapScreen({ open }: { open: OpenModal }) {
  const { state } = useStore();
  // Splits you've joined come first (same order as Splits → Joined) and stay
  // on the map even outside the radius, so it can guide you to each pickup.
  const joined = state.products.filter(
      (p) =>
        owned(state.reservations[p.id]) &&
        state.reservations[p.id].status !== "completed",
    ),
    nearby = visibleProducts(state).filter((p) => !joined.includes(p)),
    products = [...joined, ...nearby],
    // Opens on your first joined split. A tapped pin is only restored when
    // you come back from its details or directions.
    [selected, setSelected] = useState(() => {
      const back = sessionStorage.getItem(MAP_RETURN) || "";
      sessionStorage.removeItem(MAP_RETURN);
      return back;
    });
  const p = products.find((p) => p.id === selected) || joined[0] || products[0];
  const mine = !!p && owned(state.reservations[p.id]);
  const leaveTo = (path: string) => {
    sessionStorage.setItem(MAP_RETURN, p!.id);
    go(path);
  };
  const details = () => leaveTo("/" + (mine ? "split" : "offer") + "/" + p!.id);
  const directions = () => leaveTo("/directions/" + p!.id);
  return (
    <>
      <TopHeader title="Map" />
      <main className="page-scroll map-page">
        <div className="content">
          <div className="map-stage">
            <LocationControls open={open} filters />
            <TileMap
              products={products}
              reservations={state.reservations}
              selected={p?.id}
              route={mine ? p?.id : undefined}
              radius={state.radius}
              remember
              onSelect={setSelected}
            />
            {p ? (
              <div className="panel map-selected">
                <div className="product-line">
                  <Art p={p} />
                  <div>
                    <h3 title={p.title}>{p.title}</h3>
                    <p>
                      {p.place} · {Math.ceil(p.distance / 70)} min walk
                    </p>
                    <small>
                      {mine && (
                        <span className="membership">In your splits</span>
                      )}{" "}
                      {mine
                        ? statusLabel(state.reservations[p.id]) + " · " + p.time
                        : money(total(p)) + " total"}
                    </small>
                  </div>
                </div>
                <div className="two-buttons">
                  {/* For your own splits the map is a way to get there, so
                      Directions leads. */}
                  {mine ? (
                    <>
                      <Button onClick={directions}>Directions</Button>
                      <Button kind="secondary" onClick={details}>
                        View my split
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={details}>View details</Button>
                      <Button kind="secondary" onClick={directions}>
                        Directions
                      </Button>
                    </>
                  )}
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
          </div>
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
          releasedByHost(state.reservations[p.id]) ||
          hostedComplete(state, p)
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
                {t === "Hosting" && (
                  <AlertBadge count={pendingRequests(state).length} />
                )}
                {t === "Joined" && (
                  <AlertBadge count={0} ready={readyAlerts(state).length} />
                )}
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
