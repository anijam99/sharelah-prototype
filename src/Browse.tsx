import { useRef, useState } from "react";
import { MapPin, Navigation, Search, SlidersHorizontal } from "lucide-react";
import { Art, Button, Card, Empty, Photo, Row, TopHeader } from "./ui";
import { go } from "./router";
import { useStore } from "./store";
import { money, owned, statusLabel, total, visibleProducts } from "./model";
export type OpenModal = (type: string) => void;
export function Home({
  open,
  search = false,
  saved = false,
}: {
  open: OpenModal;
  search?: boolean;
  saved?: boolean;
}) {
  const { state } = useStore(),
    [category, setCategory] = useState(
      sessionStorage.getItem("sharelah-category") || "All",
    ),
    [query, setQuery] = useState(
      sessionStorage.getItem("sharelah-search") || "",
    );
  const products = saved
    ? state.products.filter((p) => state.saved.includes(p.id))
    : visibleProducts(state, search ? query : "", category);
  return (
    <>
      {!search && !saved && <TopHeader />}
      <main className="page-scroll">
        <div className="content">
          {!search && !saved && (
            <div className="welcome">
              <span className="eyebrow">GOOD THINGS, SHARED NEARBY</span>
              <div className="welcome-line">
                <h1 tabIndex={-1}>
                  Good finds.
                  <br />
                  Better shared.
                </h1>
                <img src="/assets/bag.svg" width="92" height="77" alt="" />
              </div>
              <button onClick={() => open("area")}>
                <strong>{state.area}</strong>
                <small>Change area ›</small>
              </button>
            </div>
          )}
          {!saved &&
            (search ? (
              <label className="search-box">
                <Search size={21} />
                <input
                  aria-label="Search products or deals"
                  value={query}
                  autoFocus
                  placeholder="Search products or deals"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    sessionStorage.setItem("sharelah-search", e.target.value);
                  }}
                />
              </label>
            ) : (
              <button className="search-box" onClick={() => go("/search")}>
                <Search size={21} />
                <span>Search products or deals</span>
              </button>
            ))}
          {!saved && (
            <>
              <div className="chips categories">
                {["All", "Food & drinks", "Household"].map((c) => (
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
              <button className="filter-bar" onClick={() => open("filters")}>
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
              <button className="text-button" onClick={() => open("help")}>
                How it works ›
              </button>
            )}
          </div>
          {products.map((p) => (
            <Card key={p.id} p={p} />
          ))}
          {!products.length && (
            <Empty
              title={
                saved ? "Your good finds, saved here." : "No matching splits"
              }
              action={
                <Button
                  kind="secondary"
                  onClick={() => (saved ? go("/") : open("filters"))}
                >
                  {saved ? "Explore nearby" : "Change filters"}
                </Button>
              }
            >
              {saved
                ? "Save an offer to come back to it later."
                : "Try another search, category or distance."}
            </Empty>
          )}
          {!search && !saved && (
            <>
              <div className="section-heading">
                <h2>Spotted by neighbours</h2>
                <button
                  className="text-button"
                  onClick={() => go("/report-deal")}
                >
                  Report a deal ›
                </button>
              </div>
              {state.deals.map((d) => (
                <Row
                  key={d.id}
                  title={d.title}
                  detail={d.store + " · " + money(d.priceCents)}
                  onClick={() => go("/deal/" + d.id)}
                >
                  {d.photo && <Photo id={d.photo} className="deal-thumb" />}
                </Row>
              ))}
              {!state.deals.length && (
                <div className="panel paper">
                  <h3>Good deals travel by word of mouth.</h3>
                  <p>
                    Spotted a shelf offer? Share a photo and the price with your
                    neighbourhood.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => go("/report-deal")}
                  >
                    Be the first to share ›
                  </button>
                </div>
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
    ref = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const p = products.find((p) => p.id === selected) || products[0];
  return (
    <>
      <TopHeader title="Map" />
      <main className="page-scroll">
        <div className="content">
          <div className="map-controls">
            <button className="chip" onClick={() => open("area")}>
              <MapPin size={17} />
              {state.area}⌄
            </button>
            <button className="chip" onClick={() => open("filters")}>
              {state.radius < 1000 ? "500 m" : state.radius / 1000 + " km"}{" "}
              radius⌄
            </button>
          </div>
          <div className="map-heading">
            <span>Drag the map to explore</span>
            <button
              className="text-button"
              onClick={() =>
                ref.current?.scrollTo({
                  left: 0,
                  top: 0,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                })
              }
            >
              <Navigation size={16} />
              Near me
            </button>
          </div>
          <div
            className="map-viewport"
            ref={(n) => {
              ref.current = n;
              if (n) {
                try {
                  const [l, t] = JSON.parse(
                    sessionStorage.getItem("sharelah-map-scroll") || "[0,0]",
                  );
                  n.scrollLeft = l;
                  n.scrollTop = t;
                } catch {}
              }
            }}
            onScroll={(e) =>
              sessionStorage.setItem(
                "sharelah-map-scroll",
                JSON.stringify([
                  e.currentTarget.scrollLeft,
                  e.currentTarget.scrollTop,
                ]),
              )
            }
            onPointerDown={(e) => {
              if (
                e.pointerType === "mouse" &&
                !(e.target as Element).closest("button")
              ) {
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  l: e.currentTarget.scrollLeft,
                  t: e.currentTarget.scrollTop,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              if (drag.current) {
                e.currentTarget.scrollLeft =
                  drag.current.l - (e.clientX - drag.current.x);
                e.currentTarget.scrollTop =
                  drag.current.t - (e.clientY - drag.current.y);
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            tabIndex={0}
            aria-label="Scrollable neighbourhood map"
          >
            <div className="map-world">
              <img
                src="/assets/map.png"
                width="720"
                height="660"
                alt="Illustrated Bugis neighbourhood street map"
              />
              {products.map((q) => (
                <button
                  key={q.id}
                  className={"map-pin " + (q.id === p?.id ? "selected" : "")}
                  style={{ left: q.x, top: q.y }}
                  onClick={() => {
                    setSelected(q.id);
                    sessionStorage.setItem("sharelah-map-selected", q.id);
                  }}
                  aria-label={"Select " + q.title}
                >
                  {owned(state.reservations[q.id]) ? "Yours · " : ""}
                  {money(total(q))}
                </button>
              ))}
            </div>
          </div>
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
                <Button onClick={() => open("area")}>
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
          <p className="fine">
            Illustrated demo map · locations and walking estimates are sample
            data.
          </p>
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
        ? state.reservations[p.id]?.status === "completed"
        : owned(state.reservations[p.id]) &&
          state.reservations[p.id].status !== "completed",
  );
  const saved =
    1420 +
    state.products.reduce(
      (v, p) =>
        v +
        (state.reservations[p.id]?.status === "completed"
          ? Math.max(0, p.retailCents - total(p))
          : 0),
      0,
    );
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
                  {tab === "Hosting" ? "Create a split" : "Explore nearby"}
                </Button>
              }
            >
              {tab === "Hosting"
                ? "Create a listing for an offer you’ve found."
                : "Browse nearby offers and keep only what you need."}
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
