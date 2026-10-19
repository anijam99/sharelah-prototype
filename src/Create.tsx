import { Pizza } from "./Pizza";
import { dealCategories } from "./dealCatalog";
import { CachedPhotos } from "./CachedPhotos";
import { useState } from "react";
import { Camera } from "./Camera";
import { Art, Button, Header, Photo, PriceRows, Row } from "./ui";
import {
  allocation,
  money,
  parsePrice,
  seedProducts,
  serviceFee,
  type Product,
} from "./model";
import { savePhoto, useStore } from "./store";
import { back, finish, go } from "./router";
const stageNames = ["Item", "Portions", "Pickup", "Review"];
export function Create({
  mode,
  stage,
}: {
  mode: "split" | "deal" | "camera";
  stage: number;
}) {
  const { state, update } = useStore(),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [camera, setCamera] = useState(
      (mode === "camera" || mode === "deal") && !state.createDraft.photo,
    ),
    [cachedPhotos, setCachedPhotos] = useState(false);
  const draft = state.createDraft;
  const p = {
    ...seedProducts[0],
    title: "",
    portion: "",
    store: "",
    art: "bag",
    retailCents: 0,
    bundleCents: 0,
    bundleCount: 2,
    shareCount: 1,
    photo: undefined,
    sourceDealId: undefined,
    area: state.area,
    ...draft,
  };
  function change(values: Partial<Product>) {
    update((s) => ({ ...s, createDraft: { ...s.createDraft, ...values } }));
  }
  async function attach(blob: Blob) {
    setSaving(true);
    try {
      const photo = await savePhoto(blob);
      change({ photo });
      setCamera(false);
      if (mode === "camera") go("/create/1", undefined, true);
    } catch {
      setError(
        "This photo could not be saved. Free some browser storage and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  const count = p.bundleCount || 2,
    share = p.shareCount || 1,
    prices = allocation(p.bundleCents, count, share);
  const jump = (n: number) =>
    go("/create/" + n, stageNames[Math.max(0, stage - 1)]);
  function next() {
    setError("");
    if (!p.title.trim() || !p.portion.trim() || !p.store.trim()) {
      setError("Add an item name, portion size and store.");
      return;
    }
    if (
      stage === 2 &&
      (!Number.isInteger(count) ||
        count < 2 ||
        count > 20 ||
        !Number.isInteger(share) ||
        share < 1 ||
        share >= count ||
        !Number.isSafeInteger(p.bundleCents) ||
        p.bundleCents > 999900 ||
        p.bundleCents < count)
    ) {
      setError(
        "Choose 2–20 items, keep at least one, and enter a valid bundle price.",
      );
      return;
    }
    if (stage === 3 && (!p.place.trim() || !p.date || !p.time.trim())) {
      setError("Choose a pickup point, day and time.");
      return;
    }
    jump(stage + 1);
  }
  function publish() {
    if (
      !p.title.trim() ||
      !p.portion.trim() ||
      !p.store.trim() ||
      !Number.isSafeInteger(p.bundleCents) ||
      p.bundleCents <= 0 ||
      p.bundleCents > 999900
    ) {
      setError("Please complete the item and price details.");
      return;
    }
    const id = crypto.randomUUID();
    if (mode === "deal") {
      update((s) => ({
        ...s,
        deals: [
          {
            id,
            title: p.title.trim(),
            store: p.store.trim(),
            portion: p.portion,
            category: p.category,
            priceCents: p.bundleCents,
            photo: p.photo,
            createdAt: new Date().toISOString(),
            area: s.area,
          },
          ...s.deals,
        ],
        createDraft: {},
      }));
      finish("/deal/" + id, "/");
    } else {
      if (
        !Number.isInteger(count) ||
        count < 2 ||
        count > 20 ||
        !Number.isInteger(share) ||
        share < 1 ||
        share >= count ||
        p.bundleCents < count ||
        !p.place.trim() ||
        !p.address.trim() ||
        !p.time.trim()
      ) {
        setError("Check the portions and pickup details before publishing.");
        return;
      }
      const product: Product = {
        ...p,
        id,
        owner: true,
        host: "Tom",
        itemCents: prices.itemCents,
        available: share,
        shareCount: share,
        purchased: false,
        closed: false,
        code: String(
          100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000),
        ),
      };
      update((s) => ({
        ...s,
        products: [...s.products, product],
        createDraft: {},
      }));
      finish("/hosting/" + id + "?published=1");
    }
  }
  return (
    <>
      {cachedPhotos && (
        <CachedPhotos
          onClose={() => setCachedPhotos(false)}
          onSelect={(photo) => {
            change({ photo });
            setCachedPhotos(false);
            setCamera(false);
            if (mode === "camera") go("/create/1", undefined, true);
          }}
        />
      )}
      <Header
        title={
          camera
            ? "Photograph a price tag"
            : mode === "deal"
              ? "Post a deal"
              : stage === 1
                ? "Start a split"
                : stage === 2
                  ? "Allocate portions"
                  : stage === 3
                    ? "Arrange pickup"
                    : "Review split"
        }
        item={stage > 1 ? p.title : undefined}
        label={
          camera || stage === 1 || mode === "deal"
            ? "Cancel"
            : history.state?.label || stageNames[stage - 2]
        }
        onBack={() =>
          camera && mode === "split"
            ? setCamera(false)
            : back(stage > 1 ? "/create/" + (stage - 1) : "/")
        }
      />
      <main className="page-scroll">
        <div className="content create-content">
          {camera ? (
            <>
              <h2>Found a good deal?</h2>
              <p className="muted">
                Photograph the shelf label, then check and enter the item and
                price.
              </p>
              <button
                className="text-button"
                onClick={() => setCachedPhotos(true)}
              >
                Use a saved price-tag photo
              </button>
              <Camera mode="photo" onPhoto={(blob) => void attach(blob)} />
              {saving && <p role="status">Saving your photo…</p>}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <Button
                kind="secondary"
                disabled={saving}
                onClick={() => {
                  setCamera(false);
                  if (mode === "camera") go("/create/1", undefined, true);
                }}
              >
                Continue without a photo
              </Button>
            </>
          ) : (
            <>
              {mode === "split" || mode === "camera" ? (
                <>
                  <h2>
                    {stage === 1
                      ? "What are you sharing?"
                      : stage === 2
                        ? "One for you. More to share."
                        : stage === 3
                          ? "When and where?"
                          : null}
                  </h2>
                  <p className="fine">Step {stage} of 4</p>
                  <ol className="steps">
                    {stageNames.map((s, i) => (
                      <li
                        key={s}
                        className={i + 1 <= stage ? "done" : ""}
                        aria-current={i + 1 === stage ? "step" : undefined}
                      >
                        <span>
                          {i + 1} {s}
                        </span>
                        <i />
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="muted">
                  Post a price you spotted in store. Your photo helps neighbours
                  check the deal before they go.
                </p>
              )}
              {(stage === 1 || mode === "deal") && (
                <>
                  <div className="photo-entry">
                    {p.photo ? (
                      <Photo id={p.photo} alt="Photographed price tag" />
                    ) : (
                      <Art p={p} large />
                    )}
                    <button
                      className="text-button"
                      onClick={() => setCamera(true)}
                    >
                      {p.photo ? "Retake photo" : "Add a price-tag photo"}
                    </button>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setCachedPhotos(true)}
                  >
                    Use a saved price-tag photo
                  </button>
                  <div className="chips wrap" aria-label="Use an example item">
                    {seedProducts.slice(0, 3).map((q) => (
                      <button
                        key={q.id}
                        className="chip"
                        onClick={() =>
                          change({
                            title: q.title,
                            portion: q.portion,
                            art: q.art,
                            photo: q.photo,
                            category: q.category,
                            store: q.store,
                            bundleCents: q.bundleCents,
                            bundleCount: q.bundleCount,
                            shareCount: q.shareCount,
                            retailCents: q.retailCents,
                          })
                        }
                      >
                        {q.title}
                      </button>
                    ))}
                  </div>
                  <label>
                    Item name
                    <input
                      value={p.title}
                      maxLength={70}
                      placeholder="e.g. Greek yoghurt"
                      onChange={(e) => change({ title: e.target.value })}
                    />
                  </label>
                  <label>
                    One portion
                    <input
                      value={p.portion}
                      maxLength={70}
                      placeholder="e.g. 1 sealed tub · 150 g"
                      onChange={(e) => change({ portion: e.target.value })}
                    />
                  </label>
                  <p className="fine">
                    Each portion is one sealed item. You’ll choose how many to
                    share next.
                  </p>
                  <label>
                    Store
                    <input
                      value={p.store}
                      maxLength={100}
                      placeholder="Store and branch"
                      onChange={(e) => change({ store: e.target.value })}
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={p.category}
                      onChange={(e) => change({ category: e.target.value })}
                    >
                      {dealCategories
                        .filter((c) => c !== "All")
                        .map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                    </select>
                  </label>
                  {mode === "deal" && (
                    <label>
                      Advertised price (S$)
                      <input
                        type="number"
                        min="0.01"
                        max="9999"
                        step="0.01"
                        defaultValue={p.bundleCents / 100}
                        onChange={(e) =>
                          change({ bundleCents: parsePrice(e.target.value) })
                        }
                      />
                    </label>
                  )}
                </>
              )}
              {stage === 2 && mode !== "deal" && (
                <>
                  <Row title={p.title} detail={p.portion} />
                  <label>
                    Bundle size
                    <select
                      value={count}
                      onChange={(e) =>
                        change({
                          bundleCount: +e.target.value,
                          shareCount: Math.min(share, +e.target.value - 1),
                        })
                      }
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} items
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Bundle price (S$)
                    <input
                      type="number"
                      min="0.01"
                      max="9999"
                      step="0.01"
                      defaultValue={p.bundleCents / 100}
                      onChange={(e) =>
                        change({ bundleCents: parsePrice(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Items to share
                    <select
                      value={share}
                      onChange={(e) => change({ shareCount: +e.target.value })}
                    >
                      {Array.from({ length: count - 1 }, (_, i) => i + 1).map(
                        (n) => (
                          <option key={n} value={n}>
                            {n} item{n !== 1 ? "s" : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <Pizza count={count} taken={share} />
                  <div className="allocation">
                    <div>
                      <small>YOU KEEP</small>
                      <strong>{count - share}</strong>
                      <span>{money(prices.hostCents)}</span>
                    </div>
                    <div>
                      <small>NEIGHBOURS GET</small>
                      <strong>{share}</strong>
                      <span>{money(prices.itemCents)} each</span>
                    </div>
                  </div>
                  <div className="panel tint">
                    <span>Each neighbour pays</span>
                    <h2>{money(prices.neighbourTotal)} per person</h2>
                    <p className="fine">
                      Includes the portion + {serviceFee} service fee
                    </p>
                  </div>
                  <p className="fine">
                    You buy the multipack for {money(p.bundleCents)}. Any
                    rounding difference stays in your share.
                  </p>
                </>
              )}
              {stage === 3 && mode !== "deal" && (
                <>
                  <label>
                    Pickup point
                    <input
                      value={p.place}
                      maxLength={100}
                      onChange={(e) => change({ place: e.target.value })}
                    />
                  </label>
                  <label>
                    Address
                    <input
                      value={p.address}
                      maxLength={150}
                      onChange={(e) => change({ address: e.target.value })}
                    />
                  </label>
                  <label>
                    Day
                    <select
                      value={p.date}
                      onChange={(e) => change({ date: e.target.value })}
                    >
                      <option>Today</option>
                      <option>Tomorrow</option>
                    </select>
                  </label>
                  <label>
                    Time window
                    <input
                      value={p.time}
                      maxLength={60}
                      placeholder="e.g. 6:30–6:45 pm"
                      onChange={(e) => change({ time: e.target.value })}
                    />
                  </label>
                  <label>
                    Meeting note
                    <textarea
                      value={p.note}
                      maxLength={300}
                      onChange={(e) => change({ note: e.target.value })}
                    />
                  </label>
                </>
              )}
              {stage === 4 && mode !== "deal" && (
                <>
                  <Row
                    title={p.title}
                    detail={p.portion}
                    onClick={() => jump(1)}
                  />
                  <div className="panel">
                    <h3>Portions &amp; price</h3>
                    <div className="price-rows">
                      <div>
                        <span>Bundle</span>
                        <strong>
                          {count} items · {money(p.bundleCents)}
                        </strong>
                      </div>
                      <div>
                        <span>You keep</span>
                        <strong>
                          {count - share} items · {money(prices.hostCents)}
                        </strong>
                      </div>
                      <div>
                        <span>Neighbours get</span>
                        <strong>
                          {share} items · {money(prices.itemCents)} each
                        </strong>
                      </div>
                    </div>
                    <PriceRows p={{ ...p, itemCents: prices.itemCents }} />
                    <button className="text-button" onClick={() => jump(2)}>
                      Edit portions ›
                    </button>
                  </div>
                  <Row
                    title={p.place}
                    detail={
                      <>
                        {p.address}
                        <br />
                        {p.date} · {p.time}
                        <br />
                        {p.note}
                      </>
                    }
                    onClick={() => jump(3)}
                  />
                </>
              )}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </main>
      {!camera && (
        <footer className="action-bar">
          <Button
            disabled={saving}
            onClick={stage === 4 || mode === "deal" ? publish : next}
          >
            {mode === "deal"
              ? "Post deal"
              : stage === 4
                ? "Publish split"
                : stage === 1
                  ? "Set portions & price"
                  : stage === 2
                    ? "Arrange pickup"
                    : "Review split"}
          </Button>
        </footer>
      )}
    </>
  );
}
