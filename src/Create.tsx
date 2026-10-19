import { Pizza } from "./Pizza";
import { dealCategories } from "./dealCatalog";
import { CachedPhotos } from "./CachedPhotos";
import { useState, type ReactNode } from "react";
import { Camera } from "./Camera";
import { Art, Button, Header, Photo, PriceRows, Row } from "./ui";
import {
  allocation,
  money,
  parsePrice,
  requestToJoin,
  seedProducts,
  serviceFee,
  type Product,
} from "./model";
import { savePhoto, useStore } from "./store";
import { back, finish, go } from "./router";

/** A/B test: A walks through four steps; B shows every field on one page. */
export type CreateVariant = "A" | "B";
export const createVariant = (value: unknown): CreateVariant =>
  value === "B" ? "B" : "A";

const stageNames = ["Item", "Portions", "Pickup", "Review"];
type Change = (values: Partial<Product>) => void;
type Section = "item" | "portions" | "pickup";

/** Both layouts validate the same rules, so only the layout differs. */
function problems(p: Product): Partial<Record<Section, string>> {
  const count = p.bundleCount || 2,
    share = p.shareCount || 1,
    found: Partial<Record<Section, string>> = {};
  if (!p.title.trim() || !p.portion.trim() || !p.store.trim())
    found.item = "Add an item name, portion size and store.";
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > 20 ||
    !Number.isInteger(share) ||
    share < 1 ||
    share >= count ||
    !Number.isSafeInteger(p.bundleCents) ||
    p.bundleCents > 999900 ||
    p.bundleCents < count
  )
    found.portions =
      "Choose 2–20 items, keep at least one, and enter a valid bundle price.";
  if (!p.place.trim() || !p.address.trim() || !p.date || !p.time.trim())
    found.pickup = "Choose a pickup point, address, day and time.";
  return found;
}

export function Create({
  mode,
  stage,
  layout = "A",
}: {
  mode: "split" | "deal" | "camera";
  stage: number;
  layout?: CreateVariant;
}) {
  const { state, update } = useStore(),
    [error, setError] = useState(""),
    [sectionErrors, setSectionErrors] = useState<
      Partial<Record<Section, string>>
    >({}),
    [saving, setSaving] = useState(false),
    [camera, setCamera] = useState(
      (mode === "camera" || mode === "deal") && !state.createDraft.photo,
    ),
    [cachedPhotos, setCachedPhotos] = useState(false),
    // Remounts the uncontrolled price inputs when an example fills them in.
    [filled, setFilled] = useState(0);
  const onePage = layout === "B" && mode !== "deal";
  const p: Product = {
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
    ...state.createDraft,
  };
  function change(values: Partial<Product>) {
    update((s) => ({ ...s, createDraft: { ...s.createDraft, ...values } }));
  }
  /** Editing a section clears its single-page error. */
  const changeIn =
    (section: Section): Change =>
    (values) => {
      change(values);
      setSectionErrors((e) => ({ ...e, [section]: undefined }));
    };
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
  const jump = (n: number) =>
    go("/create/" + n, stageNames[Math.max(0, stage - 1)]);
  function next() {
    setError("");
    const found = problems(p);
    const message =
      found.item ||
      (stage >= 2 && found.portions) ||
      (stage >= 3 && found.pickup);
    if (message) setError(message);
    else jump(stage + 1);
  }
  function publishDeal() {
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
  }
  function publishSplit() {
    const found = problems(p);
    setSectionErrors(found);
    const first = (["item", "portions", "pickup"] as const).find(
      (s) => found[s],
    );
    if (first) {
      setError(
        onePage
          ? "Some details need attention. Check the highlighted sections."
          : "Check the portions and pickup details before publishing.",
      );
      document
        .getElementById("create-" + first)
        ?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      return;
    }
    const id = crypto.randomUUID(),
      share = p.shareCount || 1;
    const product: Product = {
      ...p,
      id,
      owner: true,
      host: "Tom",
      itemCents: allocation(p.bundleCents, p.bundleCount || 2, share).itemCents,
      available: share,
      shareCount: share,
      purchased: false,
      closed: false,
      code: String(
        100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000),
      ),
    };
    // Jerry asks to join shortly after the split goes live.
    update((s) =>
      requestToJoin(
        { ...s, products: [...s.products, product], createDraft: {} },
        id,
        "jerry",
        new Date(Date.now() + 8000).toISOString(),
      ),
    );
    finish("/hosting/" + id + "?published=1");
  }
  const itemFields = (
    <ItemFields
      key={"item" + filled}
      p={p}
      change={changeIn("item")}
      fillExample={() => {
        setFilled((n) => n + 1);
        setSectionErrors({});
      }}
      takePhoto={() => setCamera(true)}
      chooseSaved={() => setCachedPhotos(true)}
      deal={mode === "deal"}
    />
  );
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
              : onePage || stage === 1
                ? "Start a split"
                : stage === 2
                  ? "Allocate portions"
                  : stage === 3
                    ? "Arrange pickup"
                    : "Review split"
        }
        item={!onePage && stage > 1 ? p.title : undefined}
        label={
          camera || onePage || stage === 1 || mode === "deal"
            ? "Cancel"
            : history.state?.label || stageNames[stage - 2]
        }
        onBack={() =>
          camera && mode === "split"
            ? setCamera(false)
            : back(!onePage && stage > 1 ? "/create/" + (stage - 1) : "/")
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
              <ErrorNotice message={error} />
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
          ) : mode === "deal" ? (
            <>
              <p className="muted">
                Post a price you spotted in store. Your photo helps neighbours
                check the deal before they go.
              </p>
              {itemFields}
              <ErrorNotice message={error} />
            </>
          ) : onePage ? (
            <>
              <h2>What are you sharing?</h2>
              <p className="fine">
                Fill in the three sections below, then publish.
              </p>
              <CreateSection
                n={1}
                id="item"
                title="Item"
                error={sectionErrors.item}
              >
                {itemFields}
              </CreateSection>
              <CreateSection
                n={2}
                id="portions"
                title="Portions & price"
                error={sectionErrors.portions}
              >
                <PortionFields
                  key={"portions" + filled}
                  p={p}
                  change={changeIn("portions")}
                />
              </CreateSection>
              <CreateSection
                n={3}
                id="pickup"
                title="Pickup"
                error={sectionErrors.pickup}
              >
                <PickupFields p={p} change={changeIn("pickup")} />
              </CreateSection>
              <ErrorNotice message={error} />
            </>
          ) : (
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
              {stage === 1 && itemFields}
              {stage === 2 && (
                <>
                  <Row title={p.title} detail={p.portion} />
                  <PortionFields p={p} change={change} />
                </>
              )}
              {stage === 3 && <PickupFields p={p} change={change} />}
              {stage === 4 && <ReviewSummary p={p} jump={jump} />}
              <ErrorNotice message={error} />
            </>
          )}
        </div>
      </main>
      {!camera && (
        <footer className="action-bar">
          <Button
            disabled={saving}
            onClick={
              mode === "deal"
                ? publishDeal
                : onePage || stage === 4
                  ? publishSplit
                  : next
            }
          >
            {mode === "deal"
              ? "Post deal"
              : onePage || stage === 4
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

function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p className="notice error" role="alert">
      {message}
    </p>
  ) : null;
}

/** One numbered block of the single-page form. */
function CreateSection({
  n,
  id,
  title,
  error,
  children,
}: {
  n: number;
  id: Section;
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={"create-" + id}
      className={"create-section" + (error ? " invalid" : "")}
      aria-labelledby={"create-" + id + "-title"}
    >
      <h3 id={"create-" + id + "-title"}>
        <span aria-hidden="true">{n}</span>
        {title}
      </h3>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {children}
    </section>
  );
}

function ItemFields({
  p,
  change,
  fillExample,
  takePhoto,
  chooseSaved,
  deal,
}: {
  p: Product;
  change: Change;
  fillExample: () => void;
  takePhoto: () => void;
  chooseSaved: () => void;
  deal: boolean;
}) {
  return (
    <>
      <div className="photo-entry">
        {p.photo ? (
          <Photo id={p.photo} alt="Photographed price tag" />
        ) : (
          <Art p={p} large />
        )}
        <button className="text-button" onClick={takePhoto}>
          {p.photo ? "Retake photo" : "Add a price-tag photo"}
        </button>
      </div>
      <button className="text-button" onClick={chooseSaved}>
        Use a saved price-tag photo
      </button>
      <div className="chips wrap" aria-label="Use an example item">
        {seedProducts.slice(0, 3).map((q) => (
          <button
            key={q.id}
            className="chip"
            onClick={() => {
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
              });
              fillExample();
            }}
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
        Each portion is one sealed item.
        {deal ? "" : " You’ll choose how many to share."}
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
      {deal && (
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
  );
}

function PortionFields({ p, change }: { p: Product; change: Change }) {
  const count = p.bundleCount || 2,
    share = p.shareCount || 1,
    prices = allocation(p.bundleCents, count, share);
  return (
    <>
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
          onChange={(e) => change({ bundleCents: parsePrice(e.target.value) })}
        />
      </label>
      <label>
        Items to share
        <select
          value={share}
          onChange={(e) => change({ shareCount: +e.target.value })}
        >
          {Array.from({ length: count - 1 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} item{n !== 1 ? "s" : ""}
            </option>
          ))}
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
        <p className="fine">Includes the portion + {serviceFee} service fee</p>
      </div>
      <p className="fine">
        You buy the multipack for {money(p.bundleCents)}. Any rounding
        difference stays in your share.
      </p>
    </>
  );
}

function PickupFields({ p, change }: { p: Product; change: Change }) {
  return (
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
  );
}

function ReviewSummary({ p, jump }: { p: Product; jump: (n: number) => void }) {
  const count = p.bundleCount || 2,
    share = p.shareCount || 1,
    prices = allocation(p.bundleCents, count, share);
  return (
    <>
      <Row title={p.title} detail={p.portion} onClick={() => jump(1)} />
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
  );
}
