import { Pizza } from "./Pizza";
import { dealCategories } from "./dealCatalog";
import { CachedPhotos } from "./CachedPhotos";
import { useId, useState, type ReactNode } from "react";
import { Images, Sparkles } from "lucide-react";
import { Camera } from "./Camera";
import { Art, Button, Header, Photo } from "./ui";
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
import { studyRoute } from "./studyData";

/** A/B test: A walks through four steps; B shows every field on one page. */
export type CreateVariant = "A" | "B";
export const createVariant = (value: unknown): CreateVariant =>
  value === "B" ? "B" : "A";

const stageNames = ["Item", "Portions", "Pickup", "Review"];
type Change = (values: Partial<Product>) => void;
type Section = "item" | "portions" | "pickup";

/** Section titles and hints, shared by both layouts so only the layout differs. */
const sections: Record<Section, { n: number; title: string; hint: string }> = {
  item: { n: 1, title: "Item", hint: "What you’re buying in bulk, and where." },
  portions: {
    n: 2,
    title: "Portions & price",
    hint: "Keep what you need and share the rest.",
  },
  pickup: { n: 3, title: "Pickup", hint: "Where and when neighbours collect." },
};

/** What the simulated AI price-tag scan "reads" from any photo. */
const sample = seedProducts.find((q) => q.id === "det")!;

/**
 * Simulated AR: the price-tag camera "recognises" the sample's shelf tag and
 * shows the per-item price. Nothing is read from the camera feed.
 */
const scanned: Partial<Product> = {
  title: sample.title,
  portion: sample.portion,
  art: sample.art,
  category: sample.category,
  store: sample.store,
  bundleCents: sample.bundleCents,
  bundleCount: sample.bundleCount,
  shareCount: sample.shareCount,
  retailCents: sample.retailCents,
};
const arSample = {
  title: sample.title,
  deal: `${sample.bundleCount} for ${money(sample.bundleCents)}`,
  unit: money(Math.round(sample.bundleCents / (sample.bundleCount || 2))),
};

/** Lets the A/B study count blocked Next/Publish taps. */
export const VALIDATION_EVENT = "sharelah:validation";
const flagValidation = () => window.dispatchEvent(new Event(VALIDATION_EVENT));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

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
    // "From a price tag" always opens the camera, even if an earlier draft
    // (or the demo autofill) already left a photo behind.
    [camera, setCamera] = useState(mode === "camera" || mode === "deal"),
    // A posted deal starts empty every time (a photo fills it in); it
    // never shares the saved Start-a-split draft.
    [dealDraft, setDealDraft] = useState<Partial<Product>>({}),
    [cachedPhotos, setCachedPhotos] = useState(false),
    // The AI autofill pill opens an explanation of the price-tag scan.
    [scanNote, setScanNote] = useState(false),
    // Remounts the uncontrolled price inputs when an example fills them in.
    [filled, setFilled] = useState(0);
  // B shows the fields and, at the bottom, the same review cards as A's step 4.
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
    ...(mode === "deal" ? dealDraft : state.createDraft),
  };
  function change(values: Partial<Product>) {
    if (mode === "deal") setDealDraft((d) => ({ ...d, ...values }));
    else
      update((s) => ({ ...s, createDraft: { ...s.createDraft, ...values } }));
    // An edit answers the last message, so don't leave it on screen.
    setError("");
  }
  /** Editing a section clears its single-page error. */
  const changeIn =
    (section: Section): Change =>
    (values) => {
      change(values);
      setSectionErrors((e) => ({ ...e, [section]: undefined }));
    };
  function leaveCamera() {
    setCamera(false);
    if (mode === "camera") go("/create/1", undefined, true);
  }
  /** A photo is "scanned" and fills in the item details (simulated AI). */
  function applyPhoto(photo: string) {
    change({ ...scanned, photo });
    setFilled((n) => n + 1);
    setSectionErrors({});
    leaveCamera();
  }
  async function attach(blob: Blob) {
    setSaving(true);
    try {
      applyPhoto(await savePhoto(blob));
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
    if (message) {
      setError(message);
      flagValidation();
    } else jump(stage + 1);
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
    }));
    finish("/deal/" + id, "/");
  }
  /** Flags every incomplete section; true when the split is ready. */
  function checkAll() {
    const found = problems(p);
    setSectionErrors(found);
    const first = (["item", "portions", "pickup"] as const).find(
      (s) => found[s],
    );
    if (first) {
      flagValidation();
      setError(
        onePage
          ? "Some details need attention. Check the highlighted sections."
          : "Check the portions and pickup details before publishing.",
      );
      document
        .getElementById("create-" + first)
        ?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      return false;
    }
    return true;
  }
  function publishSplit() {
    if (!checkAll()) return;
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
        new Date(Date.now() + (studyRoute() ? 3000 : 8000)).toISOString(),
      ),
    );
    finish("/hosting/" + id + "?published=1");
  }
  const itemFields = (
    <ItemFields
      key={"item" + filled}
      p={p}
      change={changeIn("item")}
      takePhoto={() => setCamera(true)}
      chooseSaved={() => setCachedPhotos(true)}
      explainScan={() => setScanNote(true)}
      deal={mode === "deal"}
    />
  );

  return (
    <>
      {cachedPhotos && (
        <CachedPhotos
          onClose={() => setCachedPhotos(false)}
          onSelect={(photo) => {
            setCachedPhotos(false);
            applyPhoto(photo);
          }}
        />
      )}
      {scanNote && (
        <div
          className="narration"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-note-title"
        >
          <div className="ios-alert">
            <div className="ios-alert-text">
              <h2 id="scan-note-title">AI autofill</h2>
              <p>
                AI image detection scanned the product information on your
                price-tag photo and filled in the details for you: the item
                name, portion, store, category and bundle price.
              </p>
              <p>
                <strong>
                  AI can make mistakes, so check every detail and change
                  anything that doesn’t match before you publish.
                </strong>
              </p>
            </div>
            <button onClick={() => setScanNote(false)}>OK</button>
          </div>
        </div>
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
            : back(onePage || stage === 1 ? "/" : "/create/" + (stage - 1))
        }
      />
      <main className={"page-scroll" + (camera ? " capture-page" : "")}>
        <div className="content create-content">
          {camera ? (
            <div className="capture-screen">
              <p className="capture-intro">
                Point at the shelf label, then take a photo.
              </p>
              <Camera
                mode="photo"
                ar={mode === "deal" ? undefined : arSample}
                onPhoto={(blob) => void attach(blob)}
                extra={
                  <button
                    className="secondary"
                    aria-label="Use a saved price-tag photo"
                    onClick={() => setCachedPhotos(true)}
                  >
                    <Images size={19} aria-hidden="true" />
                    Saved photos
                  </button>
                }
              />
              {saving && <p role="status">Saving your photo…</p>}
              <ErrorNotice message={error} />
              <button
                className="text-button capture-skip"
                disabled={saving}
                onClick={leaveCamera}
              >
                Continue without a photo
              </button>
            </div>
          ) : mode === "deal" ? (
            <>
              <p className="muted">
                Post a price you spotted in store. Your photo helps neighbours
                check the deal before they go.
              </p>
              {itemFields}
              <ErrorNotice message={error} />
            </>
          ) : (
            // A shows one section per screen; B stacks the same sections on
            // one scrolling page. Everything else is identical.
            <>
              {onePage ? (
                <p className="create-intro">
                  Fill in the three sections, then publish.
                </p>
              ) : (
                <div className="create-progress">
                  <p className="create-intro">
                    Step {stage} of 4
                    <span className="step-name">
                      {" "}
                      · {stageNames[stage - 1]}
                    </span>
                  </p>
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
                </div>
              )}
              {(onePage || stage === 1) && (
                <CreateSection
                  id="item"
                  error={onePage ? sectionErrors.item : error}
                >
                  {itemFields}
                </CreateSection>
              )}
              {(onePage || stage === 2) && (
                <CreateSection
                  id="portions"
                  error={onePage ? sectionErrors.portions : error}
                >
                  <PortionFields
                    key={"portions" + filled}
                    p={p}
                    change={changeIn("portions")}
                  />
                </CreateSection>
              )}
              {(onePage || stage === 3) && (
                <CreateSection
                  id="pickup"
                  error={onePage ? sectionErrors.pickup : error}
                >
                  <PickupFields p={p} change={changeIn("pickup")} />
                </CreateSection>
              )}
              {!onePage && stage === 4 && <ReviewSummary p={p} jump={jump} />}
              {onePage && (
                <>
                  <p className="create-intro review-heading">
                    Review your split
                  </p>
                  {/* Edit scrolls back up to that section on the same page. */}
                  <ReviewSummary
                    p={p}
                    idPrefix="review-"
                    jump={(n) =>
                      document
                        .getElementById(
                          "create-" +
                            (["item", "portions", "pickup"] as const)[n - 1],
                        )
                        ?.scrollIntoView?.({
                          block: "start",
                          behavior: "smooth",
                        })
                    }
                  />
                </>
              )}
              {(onePage || stage === 4) && <ErrorNotice message={error} />}
            </>
          )}
        </div>
      </main>
      {!camera && (
        <footer className="action-bar create-actions">
          <Button
            disabled={saving}
            onClick={
              mode === "deal"
                ? publishDeal
                : stage === 4
                  ? publishSplit
                  : onePage
                    ? publishSplit
                    : next
            }
          >
            {mode === "deal"
              ? "Post deal"
              : stage === 4
                ? "Publish split"
                : onePage
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

/** One numbered section card, used by both layouts and the review step. */
function CreateSection({
  id,
  idPrefix = "create-",
  error,
  action,
  children,
}: {
  id: Section;
  /** Keeps element ids unique when B shows review cards below the fields. */
  idPrefix?: string;
  error?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { n, title, hint } = sections[id];
  return (
    <section
      id={idPrefix + id}
      className={"create-section" + (error ? " invalid" : "")}
      aria-labelledby={idPrefix + id + "-title"}
    >
      <header>
        <span className="section-number" aria-hidden="true">
          {n}
        </span>
        <div>
          <h3 id={idPrefix + id + "-title"}>{title}</h3>
          {!action && <p>{hint}</p>}
        </div>
        {action}
      </header>
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
  takePhoto,
  chooseSaved,
  explainScan,
  deal,
}: {
  p: Product;
  change: Change;
  takePhoto: () => void;
  chooseSaved: () => void;
  explainScan: () => void;
  deal: boolean;
}) {
  const nameId = useId();
  return (
    <>
      <div className="photo-entry">
        {p.photo ? (
          <Photo id={p.photo} alt="Photographed price tag" />
        ) : (
          <Art p={p} />
        )}
        <div className="photo-actions">
          <strong>Price-tag photo</strong>
          <button className="text-button" onClick={takePhoto}>
            {p.photo ? "Retake photo" : "Add a price-tag photo"}
          </button>
          <button className="text-button" onClick={chooseSaved}>
            Use a saved price-tag photo
          </button>
        </div>
      </div>
      <div className="field">
        <div className="field-label-row">
          <label htmlFor={nameId}>Item name</label>
          {/* Only a scanned photo fills the form, so only then is it "AI". */}
          {p.photo && (
            <button
              className="ai-autofill"
              aria-label="AI autofill: what was filled in"
              onClick={explainScan}
            >
              <Sparkles size={13} aria-hidden="true" />
              AI autofill
            </button>
          )}
        </div>
        <input
          id={nameId}
          value={p.title}
          maxLength={70}
          placeholder="e.g. Greek yoghurt"
          onChange={(e) => change({ title: e.target.value })}
        />
      </div>
      <div className="field">
        <label>
          One portion
          <input
            value={p.portion}
            maxLength={70}
            placeholder="e.g. 1 sealed tub · 150 g"
            aria-describedby="portion-hint"
            onChange={(e) => change({ portion: e.target.value })}
          />
        </label>
        <small id="portion-hint" className="field-hint">
          Each portion is one sealed item.
        </small>
      </div>
      <div className="field-row">
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
      </div>
      {deal && (
        <label>
          Advertised price (S$)
          <input
            type="number"
            min="0.01"
            max="9999"
            step="0.01"
            defaultValue={p.bundleCents ? p.bundleCents / 100 : ""}
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
      <div className="field-row">
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
            inputMode="decimal"
            min="0.01"
            max="9999"
            step="0.01"
            defaultValue={p.bundleCents ? p.bundleCents / 100 : ""}
            onChange={(e) =>
              change({ bundleCents: parsePrice(e.target.value) })
            }
          />
        </label>
      </div>
      <label>
        Items to share
        <select
          value={share}
          onChange={(e) => change({ shareCount: +e.target.value })}
        >
          {Array.from({ length: count - 1 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {plural(n, "item")}
            </option>
          ))}
        </select>
      </label>
      <div className="split-preview">
        <Pizza count={count} taken={share} />
        <dl className="allocation">
          <div>
            <dt>You keep</dt>
            <dd>
              <strong>{count - share}</strong>
              {money(prices.hostCents)}
            </dd>
          </div>
          <div>
            <dt>Neighbours get</dt>
            <dd>
              <strong>{share}</strong>
              {money(prices.itemCents)} each
            </dd>
          </div>
        </dl>
      </div>
      <div className="neighbour-pays">
        <span>Each neighbour pays</span>
        <strong>{money(prices.neighbourTotal)}</strong>
        <small>Their portion + {serviceFee} service fee</small>
      </div>
      <p className="field-hint">
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
      <div className="field-row">
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
      </div>
      <label>
        Meeting note
        <textarea
          value={p.note}
          rows={2}
          maxLength={300}
          onChange={(e) => change({ note: e.target.value })}
        />
      </label>
    </>
  );
}

/** Step 4 of layout A: the same section cards, read-only, each with Edit. */
function ReviewSummary({
  p,
  jump,
  idPrefix,
}: {
  p: Product;
  jump: (n: number) => void;
  idPrefix?: string;
}) {
  const count = p.bundleCount || 2,
    share = p.shareCount || 1,
    prices = allocation(p.bundleCents, count, share);
  const edit = (n: number, what: string) => (
    <button
      className="text-button section-edit"
      aria-label={"Edit " + what}
      onClick={() => jump(n)}
    >
      Edit
    </button>
  );
  return (
    <>
      <CreateSection id="item" idPrefix={idPrefix} action={edit(1, "item")}>
        <div className="review-item">
          {p.photo ? <Photo id={p.photo} alt={p.title} /> : <Art p={p} />}
          <div>
            <strong>{p.title}</strong>
            <span>{p.portion}</span>
            <small>
              {p.store} · {p.category}
            </small>
          </div>
        </div>
      </CreateSection>
      <CreateSection
        id="portions"
        idPrefix={idPrefix}
        action={edit(2, "portions")}
      >
        <div className="price-rows">
          <div>
            <span>Bundle</span>
            <strong>
              {plural(count, "item")} · {money(p.bundleCents)}
            </strong>
          </div>
          <div>
            <span>You keep</span>
            <strong>
              {plural(count - share, "item")} · {money(prices.hostCents)}
            </strong>
          </div>
          <div>
            <span>Neighbours get</span>
            <strong>
              {plural(share, "item")} · {money(prices.itemCents)} each
            </strong>
          </div>
          <div className="total">
            <strong>Each neighbour pays</strong>
            <strong>{money(prices.neighbourTotal)}</strong>
          </div>
        </div>
      </CreateSection>
      <CreateSection id="pickup" idPrefix={idPrefix} action={edit(3, "pickup")}>
        <div className="review-pickup">
          <strong>{p.place}</strong>
          <span>
            {p.address} · {p.date}, {p.time}
          </span>
          {p.note && <small>“{p.note}”</small>}
        </div>
      </CreateSection>
    </>
  );
}
