import { useState, type ReactNode } from "react";
import { Check, Minus, Plus, Star } from "lucide-react";
import { useStore } from "./store";
import { Button, Row, Sheet } from "./ui";
import { finish, go } from "./router";
import { confirmationVariant } from "./ReservationCountdown";
import { isPerson, people } from "./people";
import {
  acceptedJoiners,
  buyBy,
  cancelReservation,
  removeJoiner,
  money,
  quantityOf,
  saveReview,
  serviceFee,
  total,
  type Product,
} from "./model";

/** Every sheet the app can open. Screens receive `open` and pass one of these. */
export type Modal =
  | { kind: "filters" }
  | { kind: "create" }
  | { kind: "area" }
  | { kind: "help" }
  | { kind: "reset"; fresh?: boolean }
  | { kind: "reserve"; id: string }
  | { kind: "cancel"; id: string }
  | { kind: "close-split"; id: string }
  | { kind: "remove-joiner"; id: string; person: string }
  | { kind: "rating"; id: string };
export type OpenModal = (modal: Modal) => void;

export function Modals({ modal, close }: { modal: Modal; close: () => void }) {
  const { state } = useStore();
  if (!("id" in modal)) {
    if (modal.kind === "filters") return <FilterSheet close={close} />;
    if (modal.kind === "create") return <CreateSheet close={close} />;
    if (modal.kind === "area") return <AreaSheet close={close} />;
    if (modal.kind === "help") return <HelpSheet close={close} />;
    return <ResetSheet fresh={!!modal.fresh} close={close} />;
  }
  const p = state.products.find((p) => p.id === modal.id);
  if (!p) return null;
  if (modal.kind === "reserve") return <ReserveSheet p={p} close={close} />;
  if (modal.kind === "cancel") return <CancelSheet p={p} close={close} />;
  if (modal.kind === "close-split")
    return <CloseSplitSheet p={p} close={close} />;
  if (modal.kind === "remove-joiner")
    return <RemoveJoinerSheet p={p} person={modal.person} close={close} />;
  return <RatingSheet p={p} close={close} />;
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

function ReserveSheet({ p, close }: { p: Product; close: () => void }) {
  const { state, update } = useStore(),
    [choosingPayment, setChoosingPayment] = useState(false),
    [choice, setChoice] = useState(state.payment),
    [quantity, setQuantity] = useState(1),
    amount = total(p, quantity);
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
                holdQuantity: quantity,
                holdVariant: confirmationVariant(
                  localStorage.getItem("sharelah-confirmation-variant"),
                ),
              });
            }}
          >
            Confirm &amp; hold {money(amount)}
          </Button>
        }
      >
        <Row title={p.title} detail={p.portion + " per portion"} />
        {p.available > 1 && (
          <div className="quantity-picker" role="group" aria-label="Portions">
            <span>
              <strong>Portions</strong>
              <small>{p.available} available</small>
            </span>
            <button
              aria-label="One fewer portion"
              disabled={quantity <= 1}
              onClick={() => setQuantity((n) => n - 1)}
            >
              <Minus size={18} />
            </button>
            <output aria-live="polite">{quantity}</output>
            <button
              aria-label="One more portion"
              disabled={quantity >= p.available}
              onClick={() => setQuantity((n) => n + 1)}
            >
              <Plus size={18} />
            </button>
          </div>
        )}
        <div className="checkout-total">
          <span>Total to hold</span>
          <strong>{money(amount)}</strong>
          <small>
            {quantity > 1 ? `${quantity} × ` : ""}
            {money(p.itemCents)} portion + {serviceFee} service fee
          </small>
        </div>
        <Row title={p.place} detail={p.date + " · " + p.time} />
        <Row
          title="Payment method · Change"
          detail={state.payment}
          onClick={() => {
            setChoice(state.payment);
            setChoosingPayment(true);
          }}
        />
        <p className="notice">
          {p.host} checks your profile and accepts requests, usually within
          minutes. If they decline, your hold is released straight away.{" "}
          {p.purchased
            ? `${p.host} has already bought the bundle. `
            : `${p.host} buys by ${buyBy(p)} ${p.date.toLowerCase()}. If not, your hold is released automatically. `}
          Payment goes to {p.host} only after you confirm collection.
        </p>
      </Sheet>
      {choosingPayment && (
        <Sheet
          title="Payment method"
          onClose={() => setChoosingPayment(false)}
          footer={
            <Button
              onClick={() => {
                update((s) => ({ ...s, payment: choice }));
                setChoosingPayment(false);
              }}
            >
              Use payment method
            </Button>
          }
        >
          <Row
            title={p.title}
            detail={p.portion + " · " + money(amount) + " total"}
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
                    : "Balance · S$24.80"}
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

function CreateSheet({ close }: { close: () => void }) {
  const start = (path: string) => () => {
    close();
    go(path);
  };
  return (
    <Sheet title="What would you like to share?" onClose={close}>
      <Row
        title="Start a split from a price tag"
        detail="Photograph a bundle deal, then share portions with neighbours"
        onClick={start("/capture")}
      />
      <Row
        title="Start a split manually"
        detail="Enter a bundle you plan to buy and share"
        onClick={start("/create/1")}
      />
      <Row
        title="Post a spotted deal"
        detail="Tell neighbours about a good price. No pickup needed."
        onClick={start("/report-deal")}
      />
    </Sheet>
  );
}

function AreaSheet({ close }: { close: () => void }) {
  const { state, update } = useStore();
  return (
    <Sheet title="Your neighbourhood" onClose={close}>
      {["Bugis", "Bras Basah", "Tampines"].map((area) => (
        <Row
          key={area}
          title={area}
          detail={
            area !== "Bugis" ? "No splits here yet" : "Explore nearby splits"
          }
          onClick={() => {
            update((s) => ({ ...s, area }));
            close();
          }}
        >
          {area === state.area && <Check />}
        </Row>
      ))}
    </Sheet>
  );
}

function HelpSheet({ close }: { close: () => void }) {
  return (
    <Sheet
      title="Good finds. Better shared."
      onClose={close}
      footer={<Button onClick={close}>Got it</Button>}
    >
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
          "Browse nearby splits and check the portion, price and pickup.",
        ],
        [
          "02",
          "Reserve with confidence",
          "Send a request; hosts check your profile before accepting. Your payment stays held, and you get it back if they decline or don’t buy in time.",
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
        Spotted deals are price tips from neighbours. You buy those yourself in
        store, or start a split to share a bundle.
      </p>
    </Sheet>
  );
}

/** A confirm-or-back sheet for one destructive action. */
function ConfirmSheet({
  title,
  children,
  confirm,
  keep,
  onConfirm,
  close,
}: {
  title: string;
  children: ReactNode;
  confirm: string;
  keep: string;
  onConfirm: () => void;
  close: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={close}
      footer={
        <>
          <Button kind="danger" onClick={onConfirm}>
            {confirm}
          </Button>
          <Button kind="secondary" onClick={close}>
            {keep}
          </Button>
        </>
      }
    >
      {children}
    </Sheet>
  );
}

function CancelSheet({ p, close }: { p: Product; close: () => void }) {
  const { state, update } = useStore(),
    quantity = quantityOf(state.reservations[p.id]);
  return (
    <ConfirmSheet
      title="Cancel your reservation?"
      confirm="Cancel reservation"
      keep="Keep reservation"
      close={close}
      onConfirm={() => {
        update((s) => cancelReservation(s, p.id));
        close();
        finish("/offer/" + p.id);
      }}
    >
      <Row
        title={p.title}
        detail={money(total(p, quantity)) + " currently held"}
      />
      <p>
        {p.host} hasn’t bought the bundle yet. Your{" "}
        {quantity > 1 ? `${quantity} portions` : "portion"} will become
        available again and your hold will be released.
      </p>
    </ConfirmSheet>
  );
}

function CloseSplitSheet({ p, close }: { p: Product; close: () => void }) {
  const { state, update } = useStore();
  return (
    <ConfirmSheet
      title="Close this split?"
      confirm="Close split"
      keep="Keep split open"
      close={close}
      onConfirm={() => {
        update((s) => ({
          ...s,
          products: s.products.map((q) =>
            q.id === p.id && !q.purchased ? { ...q, closed: true } : q,
          ),
        }));
        close();
      }}
    >
      <p>
        {acceptedJoiners(state, p.id).length
          ? "Everyone you accepted will have their hold released."
          : "Neighbours will no longer be able to reserve a portion."}
      </p>
    </ConfirmSheet>
  );
}

function RemoveJoinerSheet({
  p,
  person,
  close,
}: {
  p: Product;
  person: string;
  close: () => void;
}) {
  const { update } = useStore(),
    name = isPerson(person) ? people[person].name : "this neighbour";
  return (
    <ConfirmSheet
      title={`Remove ${name}?`}
      confirm="Remove from split"
      keep="Keep them in"
      close={close}
      onConfirm={() => {
        update((s) => removeJoiner(s, p.id, person));
        close();
      }}
    >
      <p>
        Their hold is released straight away and their portion becomes available
        to other neighbours. You can only remove people before you buy the
        bundle.
      </p>
    </ConfirmSheet>
  );
}

function RatingSheet({ p, close }: { p: Product; close: () => void }) {
  const { state, update } = useStore(),
    r = state.reservations[p.id],
    [rating, setRating] = useState(r?.rating || 0),
    [comment, setComment] = useState(r?.reviewComment || "");
  return (
    <Sheet
      title={"Review " + p.host}
      onClose={close}
      footer={
        <Button
          disabled={!rating || r?.status !== "completed"}
          onClick={() => {
            update((s) => saveReview(s, p.id, rating, comment));
            close();
          }}
        >
          {r?.rating ? "Save review" : "Submit review"}
        </Button>
      }
    >
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
          value={comment}
          maxLength={1000}
          rows={4}
          placeholder="How was the pickup? Share your experience with this neighbour."
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <p className="fine">
        {comment.length}/1000 · Your review appears on {p.host}’s profile.
      </p>
    </Sheet>
  );
}

function ResetSheet({ fresh, close }: { fresh: boolean; close: () => void }) {
  const { reset } = useStore(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Sheet
      title={fresh ? "Start with a fresh account?" : "Restore the seeded demo?"}
      onClose={close}
      footer={
        <>
          <Button
            kind="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await reset(fresh ? "fresh" : "seeded");
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
            {busy
              ? "Resetting…"
              : fresh
                ? "Start fresh account"
                : "Reset my demo"}
          </Button>
          {error && <p role="alert">{error}</p>}
          <Button kind="secondary" onClick={close}>
            Keep my progress
          </Button>
        </>
      }
    >
      <p>
        {fresh
          ? "Start with no reviews, savings, completed splits, saved items or conversations. Nearby splits and deals remain available."
          : "Restore the sample account with savings, completed splits, reviews and saved items."}{" "}
        This replaces this browser’s progress and clears cached photos. Other
        testers are unaffected.
      </p>
    </Sheet>
  );
}
