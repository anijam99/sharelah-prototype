import { Compare, CompareButton } from "./Compare";
import { DemoControls } from "./DemoControls";
import { joinHostedDeal } from "./model";
import { NeighbourDirectory, NeighbourProfile } from "./NeighbourProfiles";
import { profileSummary } from "./people";
import { Deals } from "./Deals";
import { DealPrice } from "./DealPrice";
import { photoSource } from "./dealPhotos";
import {
  ReservationCountdown,
  confirmationVariant,
  type ConfirmationVariant,
} from "./ReservationCountdown";
import { useEffect, useState } from "react";
import {
  Check,
  Camera as CameraIcon,
  PenLine,
  Star,
  RotateCcw,
} from "lucide-react";
import { Provider, useStore } from "./store";
import {
  Header,
  TopHeader,
  Button,
  Empty,
  Icon,
  Photo,
  PriceRows,
  QRCode,
  Row,
  Sheet,
} from "./ui";
import { Home, MapScreen, Splits, type HomeVariant } from "./Browse";
import {
  Chat,
  Directions,
  Hosting,
  MySplit,
  Offer,
  Pickup,
  Problem,
} from "./Journey";
import { Create } from "./Create";
import { finish, go, useRoute } from "./router";
import {
  cancelReservation,
  completedSavings,
  saveReview,
  money,
  owned,
  total,
  type Product,
} from "./model";
function Navigation({
  active,
  open,
  combinedHome = false,
}: {
  active: string;
  open: (s: string) => void;
  combinedHome?: boolean;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {[
        ["home", "Home", "/"],
        ["map", "Map", "/map"],
        ["plus", "Share", ""],
        ["splits", "Splits", "/splits"],
        ["profile", "Profile", "/profile"],
      ]
        .filter(([icon]) => !combinedHome || icon !== "map")
        .map(([icon, label, path]) => (
          <button
            key={label}
            onClick={() => (path ? go(path) : open("create"))}
            className={
              (active === icon ? "active " : "") +
              (icon === "plus" ? "create-nav" : "")
            }
            aria-current={active === icon ? "page" : undefined}
          >
            <span>
              <Icon name={icon} />
            </span>
            <small>{label}</small>
          </button>
        ))}
    </nav>
  );
}
function FilterSheet({ close }: { close: () => void }) {
  const { state, update } = useStore(),
    [radius, setRadius] = useState(state.radius),
    [sort, setSort] = useState(state.sort);
  return (
    <Sheet
      title="Filter and sort"
      onClose={close}
      footer={
        <Button
          onClick={() => {
            update((s) => ({ ...s, radius, sort }));
            close();
          }}
        >
          Apply filters
        </Button>
      }
    >
      <h3>Within walking distance</h3>
      <div className="chips">
        {[500, 1000, 3000].map((n) => (
          <button
            key={n}
            className={"chip " + (radius === n ? "selected" : "")}
            aria-pressed={radius === n}
            onClick={() => setRadius(n)}
          >
            {n === 500 ? "500 m" : n / 1000 + " km"}
          </button>
        ))}
      </div>
      <fieldset>
        <legend>Sort by</legend>
        {["Nearest first", "Lowest price", "Biggest savings"].map((s) => (
          <label key={s} className="choice">
            <input
              type="radio"
              name="sort"
              checked={s === sort}
              onChange={() => setSort(s)}
            />
            {s}
          </label>
        ))}
      </fieldset>
    </Sheet>
  );
}
function ReviewSheet({ p, close }: { p: Product; close: () => void }) {
  const { state, update } = useStore(),
    [payment, setPayment] = useState(false),
    [choice, setChoice] = useState(state.payment);
  return (
    <>
      <Sheet
        title="Reserve your portion"
        onClose={close}
        footer={
          <Button
            onClick={() => {
              close();
              go("/holding/" + p.id, undefined, true, {
                holdDeadline: Date.now() + 5000,
                holdMethod: state.payment,
                holdVariant: confirmationVariant(
                  localStorage.getItem("sharelah-confirmation-variant"),
                ),
              });
            }}
          >
            Confirm &amp; hold {money(total(p))}
          </Button>
        }
      >
        <Row title={p.title} detail={p.portion} />
        <div className="checkout-total">
          <span>Total to hold</span>
          <strong>{money(total(p))}</strong>
          <small>{money(p.itemCents)} portion + S$0.15 service fee</small>
        </div>
        <Row title={p.place} detail={p.date + " · " + p.time} />
        <Row
          title="Payment method · Change"
          detail={state.payment}
          onClick={() => {
            setChoice(state.payment);
            setPayment(true);
          }}
        />
        <p className="notice">
          Held now. Released to {p.host} only after you confirm collection.
        </p>
        <p className="fine">Demo payment · no real charge</p>
      </Sheet>
      {payment && (
        <Sheet
          title="Payment method"
          onClose={() => setPayment(false)}
          footer={
            <Button
              onClick={() => {
                update((s) => ({ ...s, payment: choice }));
                setPayment(false);
              }}
            >
              Use payment method
            </Button>
          }
        >
          <Row
            title={p.title}
            detail={p.portion + " · " + money(total(p)) + " total"}
          />
          {["Visa •••• 4242", "ShareLah wallet"].map((m) => (
            <button
              key={m}
              className="row-card"
              onClick={() => setChoice(m)}
              aria-pressed={choice === m}
            >
              <span>
                <strong>{m}</strong>
                <small>
                  {m.startsWith("Visa")
                    ? "Credit or debit card"
                    : "Demo balance · S$24.80"}
                </small>
              </span>
              {choice === m && <Check className="brand-text" />}
            </button>
          ))}
          <div className="row-card disabled">
            <span>
              <strong>Visa •••• 1188</strong>
              <small>Expired · Choose another method</small>
            </span>
          </div>
        </Sheet>
      )}
    </>
  );
}
function Modals({ type, close }: { type: string; close: () => void }) {
  const { state, update, reset } = useStore(),
    [rating, setRating] = useState(
      () => state.reservations[type.split(":")[1]]?.rating || 0,
    ),
    [reviewComment, setReviewComment] = useState(
      () => state.reservations[type.split(":")[1]]?.reviewComment || "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [name, id] = type.split(":"),
    p = state.products.find((p) => p.id === id);
  if (name === "filters") return <FilterSheet close={close} />;
  if (name === "review" && p) return <ReviewSheet p={p} close={close} />;
  let title = "",
    body,
    footer;
  if (name === "create") {
    title = "What have you found?";
    body = (
      <>
        <Row
          title="Scan a price tag"
          detail="Photograph an offer and share a split"
          onClick={() => {
            close();
            go("/capture");
          }}
        />
        <Row
          title="Enter details manually"
          detail="Share a split from an offer you know"
          onClick={() => {
            close();
            go("/create/1");
          }}
        />
        <Row
          title="Share a deal"
          detail="Share a shelf photo and the price"
          onClick={() => {
            close();
            go("/report-deal");
          }}
        />
      </>
    );
  }
  if (name === "area") {
    title = "Your neighbourhood";
    body = (
      <>
        {["Bugis", "Bras Basah", "Tampines"].map((area) => (
          <Row
            key={area}
            title={area}
            detail={
              area !== "Bugis" ? "No demo offers yet" : "Explore nearby splits"
            }
            onClick={() => {
              update((s) => ({ ...s, area }));
              close();
            }}
          >
            {area === state.area && <Check />}
          </Row>
        ))}
      </>
    );
  }
  if (name === "help") {
    title = "Good finds. Better shared.";
    body = (
      <>
        <img
          className="help-bag"
          src="/assets/bag.svg"
          width="132"
          height="110"
          alt=""
        />
        {[
          [
            "01",
            "Find your portion",
            "Browse nearby offers and check the portion, full price and pickup.",
          ],
          [
            "02",
            "Reserve with confidence",
            "Your payment stays held. Cancel free before the host buys.",
          ],
          [
            "03",
            "Meet, check, confirm",
            "Scan the host’s code and confirm receipt only after you’ve checked your item.",
          ],
        ].map(([n, t, d]) => (
          <div className="help-step" key={n}>
            <b>{n}</b>
            <div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          </div>
        ))}
        <p className="fine">
          Prototype: fictional neighbours and simulated payments. Data stays in
          this browser.
        </p>
      </>
    );
    footer = <Button onClick={close}>Got it</Button>;
  }
  if (name === "cancel" && p) {
    title = "Cancel your reservation?";
    body = (
      <>
        <Row title={p.title} detail={money(total(p)) + " currently held"} />
        <p>
          Your host hasn’t purchased the bundle yet. Your portion will become
          available again and the demo hold will be cancelled.
        </p>
      </>
    );
    footer = (
      <>
        <Button
          kind="danger"
          onClick={() => {
            update((s) => cancelReservation(s, p.id));
            close();
            finish("/offer/" + p.id);
          }}
        >
          Cancel reservation
        </Button>
        <Button kind="secondary" onClick={close}>
          Keep reservation
        </Button>
      </>
    );
  }
  if (name === "close-listing" && p) {
    title = "Close this listing?";
    body = (
      <p>
        {state.joinedHosts[p.id]
          ? "Jerry’s demo reservation will be cancelled."
          : "Neighbours will no longer be able to reserve this split."}
      </p>
    );
    footer = (
      <>
        <Button
          kind="danger"
          onClick={() => {
            update((s) => ({
              ...s,
              products: s.products.map((q) =>
                q.id === p.id && !q.purchased ? { ...q, closed: true } : q,
              ),
            }));
            close();
          }}
        >
          Close listing
        </Button>
        <Button kind="secondary" onClick={close}>
          Keep listing open
        </Button>
      </>
    );
  }
  if (name === "rating" && p) {
    title = "Review " + p.host;
    body = (
      <>
        <Row title={p.title} detail={"With " + p.host} />
        <div className="rating" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={n + " stars"}
              aria-pressed={rating === n}
            >
              <Star fill={n <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <p className="center muted">
          {rating ? rating + " out of 5" : "Choose a rating"}
        </p>
        <label>
          Your comments (optional)
          <textarea
            value={reviewComment}
            maxLength={1000}
            rows={4}
            placeholder="How was the pickup? Share your experience with this neighbour."
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </label>
        <p className="fine">
          {reviewComment.length}/1000 · Your review appears on {p.host}’s
          profile in this demo.
        </p>
      </>
    );
    footer = (
      <Button
        disabled={!rating || state.reservations[p.id]?.status !== "completed"}
        onClick={() => {
          update((s) => saveReview(s, p.id, rating, reviewComment));
          close();
        }}
      >
        {state.reservations[p.id]?.rating ? "Save review" : "Submit review"}
      </Button>
    );
  }
  if (name === "reset") {
    title = "Start a fresh demo?";
    body = (
      <p>
        This clears this browser’s reservations, messages, saved items, listings
        and photos. Other testers are unaffected.
      </p>
    );
    footer = (
      <>
        <Button
          kind="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await reset();
              Object.keys(sessionStorage)
                .filter((k) => k.startsWith("sharelah-"))
                .forEach((k) => sessionStorage.removeItem(k));
              close();
              go("/", "Home", true);
            } catch {
              setError(
                "Could not clear local photos. Try closing other ShareLah tabs and retry.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Resetting…" : "Reset my demo"}
        </Button>
        {error && <p role="alert">{error}</p>}
        <Button kind="secondary" onClick={close}>
          Keep my progress
        </Button>
      </>
    );
  }
  return (
    <Sheet title={title} onClose={close} footer={footer}>
      {body}
    </Sheet>
  );
}
function Profile({
  section,
  open,
}: {
  section?: string;
  open: (s: string) => void;
}) {
  const { state, update } = useStore(),
    completed = state.products.filter(
      (p) => state.reservations[p.id]?.status === "completed",
    ),
    savings = completedSavings(state);
  const summary = profileSummary(state, "tom");
  if (section === "trust") return <NeighbourProfile id="tom" />;
  if (!section)
    return (
      <>
        <TopHeader title="Profile" />
        <main className="page-scroll">
          <div className="content">
            <div className="member-card">
              <span className="eyebrow">SHARELAH NEIGHBOUR</span>
              <div className="member-name">
                <span className="avatar">
                  {state.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <h2>{state.name}</h2>
              </div>
              <button onClick={() => go("/neighbour/tom")}>
                {summary.average} ★ · View your reviews ›
              </button>
              <img src="/assets/brand.svg" alt="" />
              <div className="shared-edge" />
            </div>
            <div className="profile-stats">
              <button onClick={() => go("/profile/savings")}>
                <strong>{money(savings)}</strong>
                <span>Total saved</span>
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem("sharelah-splits-tab", "Past");
                  go("/splits");
                }}
              >
                <strong>{19 + completed.length}</strong>
                <span>Completed splits</span>
              </button>
            </div>
            <Row
              title="Neighbour profiles"
              detail="Meet Jerry and read neighbour reviews"
              onClick={() => go("/neighbours")}
            />
            <Row
              title="Saved splits"
              detail={state.saved.length + " saved for later"}
              onClick={() => go("/saved")}
            />
            <Row
              title="Messages"
              detail="Your split conversations"
              onClick={() => go("/messages")}
            />
            <Row
              title="31 deals checked"
              detail="Your contribution to the neighbourhood"
              onClick={() => go("/profile/activity")}
            />
            <Row
              title="Testing controls"
              detail="Reset demo and explore other states"
              onClick={() => go("/profile/testing")}
            />
            <p className="fine center">
              Independent demo · no real payments or messages
            </p>
          </div>
        </main>
      </>
    );
  return (
    <>
      <Header
        title={
          section === "testing"
            ? "Testing controls"
            : section === "savings"
              ? "Your savings"
              : section === "trust"
                ? "Your trust score"
                : "Your activity"
        }
      />
      <main className="page-scroll">
        <div className="content">
          {section === "testing" ? (
            <>
              <h2>A fresh start, whenever you need.</h2>
              <p className="muted">
                Only this browser is affected. These controls help explore the
                host and pickup flows without another participant.
              </p>
              <Row
                title="Tester persona"
                detail="Tom Chua · Jerry is your demo neighbour"
              />
              <Button kind="secondary" onClick={() => open("reset")}>
                <RotateCcw size={18} />
                Reset my demo
              </Button>
              <h3>Pickup codes</h3>
              {state.products
                .filter((p) => owned(state.reservations[p.id]))
                .map((p) => (
                  <div className="panel" key={p.id}>
                    <h3>{p.title}</h3>
                    <QRCode value={`sharelah:pickup:${p.id}:${p.code}`} />
                    <strong className="pickup-number">{p.code}</strong>
                    {state.reservations[p.id].status === "reserved" && (
                      <Button
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            products: s.products.map((q) =>
                              q.id === p.id ? { ...q, purchased: true } : q,
                            ),
                            reservations: {
                              ...s.reservations,
                              [p.id]: {
                                ...s.reservations[p.id],
                                status: "ready",
                              },
                            },
                          }))
                        }
                      >
                        Simulate host purchase
                      </Button>
                    )}
                  </div>
                ))}
              <h3>Hosted listings</h3>
              {state.products
                .filter((p) => p.owner && !p.closed)
                .map((p) => (
                  <Row
                    key={p.id}
                    title={p.title}
                    detail={
                      state.joinedHosts[p.id]
                        ? "Demo neighbour joined"
                        : "No neighbour yet"
                    }
                    onClick={() => update((s) => joinHostedDeal(s, p.id))}
                  >
                    <span className="brand-text">
                      {state.joinedHosts[p.id] ? "✓" : "Add Jerry"}
                    </span>
                  </Row>
                ))}
              <p className="fine">
                Messages, reservations and photographs are stored locally.
                Camera and QR decoding are real. Payments and other people’s
                actions are simulated.
              </p>
            </>
          ) : section === "savings" ? (
            <>
              <div className="status-hero">
                <span className="eyebrow">SMALL SPLITS ADD UP</span>
                <h2>{money(savings)}</h2>
                <p>Total saved through sharing</p>
                <div className="shared-edge" />
              </div>
              {completed.map((p) => (
                <Row
                  key={p.id}
                  title={p.title}
                  detail={p.date + " · Collected"}
                  onClick={() => go("/split/" + p.id)}
                >
                  {money(Math.max(0, p.retailCents - total(p)))}
                </Row>
              ))}
            </>
          ) : (
            <>
              <h2>A good eye for a good deal.</h2>
              <Row
                title="31 deals checked"
                detail="Sample community contributions"
              />
              {state.deals
                .filter((d) => !d.sourceFile)
                .map((d) => (
                  <Row
                    title={d.title}
                    detail={"Shared at " + d.store}
                    key={d.id}
                    onClick={() => go("/deal/" + d.id)}
                  />
                ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
function DealPage({ id }: { id: string }) {
  const { state, update } = useStore(),
    d = state.deals.find((d) => d.id === id);
  return (
    <>
      <Header title="Neighbourhood find" />
      {d ? (
        <main className="page-scroll">
          <div className="content">
            <span className="eyebrow brand-text">
              {d.demo
                ? "DEMO OFFER"
                : d.sourceFile
                  ? "PHOTOGRAPHED OFFER"
                  : "SHARED DEAL"}
            </span>
            <h2>{d.title}</h2>
            {d.photo && (
              <Photo
                id={d.photo}
                alt={d.title + " · source photo"}
                className="reported-photo"
                detail
              />
            )}
            {d.sourceFile && (
              <a
                className="text-button"
                href={d.photo ? photoSource(d.photo) : undefined}
                target="_blank"
                rel="noopener"
              >
                Open full photo to inspect the offer ↗
              </a>
            )}
            <Row title={d.store} detail={d.sourceFile ? undefined : d.area} />
            <div className="checkout-total">
              <span>Advertised price</span>
              <DealPrice deal={d} />
              <small>{d.portion}</small>
            </div>
            <CompareButton item={d} kind="deal" />
            {d.terms && !d.demo && (
              <div className="panel">
                <h3>Offer details</h3>
                <p>{d.terms}</p>
              </div>
            )}
            {!d.demo && (
              <p className="notice">
                {d.sourceFile
                  ? "Price shown in the photo. Check the store for current price and availability."
                  : "Your deal is saved in this browser’s demo. Store prices and availability haven’t been verified."}
              </p>
            )}
            {(!d.sourceFile || (d.bundleCount && d.priceCents > 0)) && (
              <Button
                onClick={() => {
                  update((s) => ({
                    ...s,
                    createDraft: {
                      title: d.title,
                      portion: d.unitPortion || d.portion,
                      bundleCount: d.bundleCount || 2,
                      shareCount: 1,
                      store: d.store,
                      category: d.category,
                      photo: d.photo,
                      bundleCents: d.priceCents,
                      sourceDealId: d.id,
                      retailCents: d.originalCents
                        ? Math.floor(d.originalCents / (d.bundleCount || 1))
                        : 0,
                    },
                  }));
                  go("/create/1");
                }}
              >
                Share a split from this deal
              </Button>
            )}
            <Button kind="secondary" onClick={() => go("/deals")}>
              Browse spotted deals
            </Button>
          </div>
        </main>
      ) : (
        <Empty title="Deal not found">
          This deal may have been cleared when the demo was reset.
        </Empty>
      )}
    </>
  );
}
function Root() {
  const path = useRoute(),
    { state, storageError } = useStore(),
    [modal, setModal] = useState("");
  const [variant, setVariant] = useState<ConfirmationVariant>(() =>
    confirmationVariant(localStorage.getItem("sharelah-confirmation-variant")),
  );
  const [homeVariant, setHomeVariant] = useState<HomeVariant>(() => {
    const stored = localStorage.getItem("sharelah-home-variant");
    return stored === "B" || stored === "C" ? stored : "A";
  });
  function selectHomeVariant(value: HomeVariant) {
    setHomeVariant(value);
    localStorage.setItem("sharelah-home-variant", value);
    if (path === "/map" && value !== "A") go("/", undefined, true);
  }
  function selectVariant(value: ConfirmationVariant) {
    setVariant(value);
    localStorage.setItem("sharelah-confirmation-variant", value);
  }
  useEffect(() => {
    setModal("");
  }, [path]);
  const [page, id, extra] = path.slice(1).split("/"),
    p = state.products.find((p) => p.id === id?.split("?")[0]);
  const tab = ["", "map", "splits", "profile"].includes(page) && !id;
  let screen;
  let active =
    page === "map" && homeVariant === "A"
      ? "map"
      : page === "splits"
        ? "splits"
        : page === "profile"
          ? "profile"
          : "home";
  if (!page || (page === "map" && homeVariant !== "A"))
    screen = <Home key={homeVariant} open={setModal} layout={homeVariant} />;
  else if (page === "map") screen = <MapScreen open={setModal} />;
  else if (page === "splits") screen = <Splits />;
  else if (page === "neighbours") screen = <NeighbourDirectory />;
  else if (page === "neighbour") screen = <NeighbourProfile id={id} />;
  else if (page === "profile")
    screen = <Profile section={id} open={setModal} />;
  else if (page === "search" || page === "saved")
    screen = (
      <>
        <Header title={page === "search" ? "Search" : "Saved splits"} />
        <Home
          open={setModal}
          search={page === "search"}
          saved={page === "saved"}
        />
      </>
    );
  else if (page === "messages")
    screen = (
      <>
        <Header title="Messages" />
        <main className="page-scroll">
          <div className="content">
            {state.products
              .filter((p) => !p.owner || state.joinedHosts[p.id])
              .map((p) => (
                <Row
                  key={p.id}
                  title={p.owner ? "Jerry" : p.host}
                  detail={p.title}
                  onClick={() => go("/chat/" + p.id)}
                />
              ))}
          </div>
        </main>
      </>
    );
  else if (page === "create" || page === "capture" || page === "report-deal")
    screen = (
      <Create
        key={page === "create" ? "create" : page}
        mode={
          page === "report-deal"
            ? "deal"
            : page === "capture"
              ? "camera"
              : "split"
        }
        stage={
          page === "create" ? Math.min(4, Math.max(1, Number(id) || 1)) : 1
        }
      />
    );
  else if (page === "compare") {
    const item =
      id === "deal"
        ? state.deals.find((d) => d.id === extra)
        : state.products.find((p) => p.id === extra);
    if (item) screen = <Compare key={id + extra} item={item} />;
  } else if (page === "deals") screen = <Deals />;
  else if (page === "deal") screen = <DealPage id={id} />;
  else if (p) {
    if (page === "holding")
      screen = <ReservationCountdown key={p.id} p={p} variant={variant} />;
    if (page === "offer") screen = <Offer p={p} open={setModal} />;
    if (page === "split") screen = <MySplit p={p} open={setModal} />;
    if (["scan", "code", "receipt"].includes(page))
      screen = (
        <Pickup
          key={page + id}
          p={p}
          kind={page as "scan" | "code" | "receipt"}
        />
      );
    if (page === "problem") screen = <Problem p={p} />;
    if (page === "chat") screen = <Chat p={p} />;
    if (page === "directions") screen = <Directions p={p} />;
    if (page === "hosting")
      screen = (
        <Hosting
          p={p}
          open={setModal}
          published={path.includes("published=1")}
        />
      );
  }
  return (
    <div className="app-layout">
      <aside
        className="experiment-panel"
        aria-label="Prototype testing controls"
      >
        <span className="eyebrow">PROTOTYPE LAB · OUTSIDE THE APP</span>
        <h2>Confirmation A/B/C test</h2>
        <div
          className="experiment-options confirmation-options"
          role="group"
          aria-label="Confirmation variant"
        >
          <button
            aria-pressed={variant === "A"}
            onClick={() => selectVariant("A")}
          >
            A · Receipt countdown
          </button>
          <button
            aria-pressed={variant === "B"}
            onClick={() => selectVariant("B")}
          >
            B · Extra confirmation
          </button>
          <button
            aria-pressed={variant === "C"}
            onClick={() => selectVariant("C")}
          >
            C · Confirm + countdown
          </button>
        </div>
        <details className="experiment-rationale">
          <summary>Why test these confirmations?</summary>
          <p>
            <strong>A · Receipt countdown.</strong> Shows the amount and pickup
            steps, then reserves automatically after five seconds. People can
            undo or skip the wait. Test whether the pause gives enough time to
            review without feeling slow.
          </p>
          <p>
            <strong>B · Extra confirmation.</strong> Asks “Are you sure?” and
            waits for an explicit decision. Test whether this gives people more
            control or adds an unnecessary step.
          </p>
          <p>
            <strong>C · Confirm + countdown.</strong> Uses B’s “Are you sure?”
            screen with A’s five-second countdown. People can confirm now or go
            back before it reserves automatically. Test how the time limit
            changes their decision on the same confirmation screen.
          </p>
          <p>
            Compare completion time, accidental reservations and confidence
            about the payment hold.
          </p>
        </details>
        <p className="experiment-caption">
          Sets your next checkout. Selecting an option does not play a preview
          or change a confirmation already in progress.
        </p>
        <section
          className="home-layout-experiment"
          aria-label="Home and map A/B/C testing"
        >
          <h2>Home &amp; map A/B/C test</h2>
          <div
            className="experiment-options"
            role="group"
            aria-label="Home and map layout"
          >
            <button
              aria-pressed={homeVariant === "A"}
              onClick={() => selectHomeVariant("A")}
            >
              A · Separate
            </button>
            <button
              aria-pressed={homeVariant === "B"}
              onClick={() => selectHomeVariant("B")}
            >
              B · Map first
            </button>
            <button
              aria-pressed={homeVariant === "C"}
              onClick={() => selectHomeVariant("C")}
            >
              C · List first
            </button>
          </div>
          <details className="experiment-rationale">
            <summary>Why test these layouts?</summary>
            <p>
              <strong>A · Separate pages.</strong> The current Home feed and Map
              tab. Compare how often people switch between them.
            </p>
            <p>
              <strong>B · Map first.</strong> The map leads the combined Home
              page, followed by filters and listings. Test whether location
              helps people choose a deal.
            </p>
            <p>
              <strong>C · List first.</strong> Three listings lead into the map,
              followed by the remaining listings. Test whether seeing products
              first helps people start browsing.
            </p>
            <p>
              Compare time to find a suitable split, use of the map, and
              scrolling. This selection is independent of the confirmation test.
            </p>
          </details>
          <p className="experiment-caption">
            Changes Home immediately; on other screens it applies when you
            return Home.
          </p>
        </section>
        <DemoControls
          locked={page === "holding"}
          resetDemo={() => setModal("reset")}
        />
      </aside>
      <section className="app-frame">
        {storageError && (
          <div className="storage-error" role="alert">
            {storageError}
          </div>
        )}
        {screen || (
          <>
            <Header title="Page not found" />
            <Empty
              title="Let’s head home."
              action={<Button onClick={() => go("/")}>Go to Home</Button>}
            >
              This screen is no longer available.
            </Empty>
          </>
        )}
        {tab && (
          <Navigation
            active={active}
            open={setModal}
            combinedHome={homeVariant !== "A"}
          />
        )}
      </section>
      {modal && <Modals key={modal} type={modal} close={() => setModal("")} />}
    </div>
  );
}
export default function App() {
  return (
    <Provider>
      <Root />
    </Provider>
  );
}
