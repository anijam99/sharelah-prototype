import { DeadlineProgress } from "./DeadlineProgress";
import { ShieldCheck, Clock3, ShoppingBag, MapPin } from "lucide-react";
import { Pizza } from "./Pizza";
import { useEffect, useRef, useState } from "react";
import { Header, Button, Row, Art } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { money, owned, reserve, total, type Product } from "./model";

export type ConfirmationVariant = "A" | "B";
export function ReservationCountdown({
  p,
  variant = "A",
  preview = false,
}: {
  p: Product;
  variant?: ConfirmationVariant;
  preview?: boolean;
}) {
  const { state, update } = useStore();
  const [pending] = useState(() => ({
    deadline: preview
      ? Date.now() + 5000
      : Number(history.state?.holdDeadline) || 0,
    method: preview
      ? state.payment
      : (history.state?.holdMethod as string | undefined),
  }));
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, pending.deadline - Date.now()),
  );
  const [unavailable, setUnavailable] = useState(false);
  const [previewResult, setPreviewResult] = useState("");
  const settled = useRef(false);
  const latest = useRef({ state, update, p });
  latest.current = { state, update, p };

  function complete() {
    if (settled.current) return;
    settled.current = true;
    if (preview) {
      setPreviewResult("Your portion is reserved.");
      return;
    }
    const { state, update, p } = latest.current;
    const current = state.products.find((q) => q.id === p.id);
    if (owned(state.reservations[p.id])) {
      go("/split/" + p.id, undefined, true);
    } else if (
      !current ||
      current.closed ||
      current.owner ||
      current.available < 1
    ) {
      setUnavailable(true);
    } else {
      update((s) => {
        const reserved = reserve(s, p.id);
        if (reserved === s) return s;
        return {
          ...reserved,
          reservations: {
            ...reserved.reservations,
            [p.id]: {
              ...reserved.reservations[p.id],
              method: pending.method || s.payment,
            },
          },
        };
      });
      go("/split/" + p.id, undefined, true);
    }
  }

  function cancel() {
    if (settled.current) return;
    if (Date.now() >= pending.deadline) {
      complete();
      return;
    }
    settled.current = true;
    if (preview) {
      setPreviewResult("Reservation undone.");
      return;
    }
    go("/offer/" + p.id, undefined, true);
  }

  useEffect(() => {
    if (!pending.deadline || !pending.method) {
      go("/offer/" + p.id, undefined, true);
      return;
    }
    const tick = () => {
      const left = Math.max(0, pending.deadline - Date.now());
      setRemaining(left);
      if (!left) complete();
    };
    tick();
    const timer = window.setInterval(tick, 50);
    return () => window.clearInterval(timer);
    // The deadline is fixed for this screen; latest contains the current store.
  }, [pending, p.id]);

  const seconds = Math.ceil(remaining / 1000);
  if (previewResult)
    return (
      <>
        <header className="page-header">
          <div>
            <h1>Preview complete</h1>
          </div>
        </header>
        <main className="page-scroll">
          <div className="content center">
            <Pizza
              count={p.bundleCount}
              taken={previewResult.startsWith("Your") ? 1 : 0}
            />
            <h2 role="status">{previewResult}</h2>
            <p className="muted">
              Preview only. No reservation or payment was changed.
            </p>
          </div>
        </main>
      </>
    );
  const reassurance = variant === "B";
  if (reassurance)
    return (
      <>
        <Header
          title="Preparing your reservation"
          label="Undo"
          onBack={cancel}
        />
        <main className="page-scroll receipt-screen">
          <div className="content receipt-content">
            <div className="receipt-intro">
              <span className="eyebrow">YOUR SHARE, IN ONE PLACE</span>
              <h2>
                {unavailable
                  ? "This portion is no longer available."
                  : "A good deal.\nA clear next step."}
              </h2>
            </div>
            <div className="reservation-receipt">
              <div className="receipt-item">
                <Art p={p} />
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.portion}</p>
                </div>
              </div>
              <div className="receipt-amount">
                <span>
                  Amount to hold<strong>{money(total(p))}</strong>
                </span>
                <ShieldCheck size={30} aria-hidden="true" />
              </div>
              <div className="receipt-payment">
                <span>{pending.method}</span>
                <span>Includes S$0.15 fee</span>
              </div>
              <ol className="receipt-steps">
                <li className="current">
                  <Clock3 size={18} aria-hidden="true" />
                  <div>
                    <strong>Reserving your portion</strong>
                    <span>Five seconds to undo before the hold starts.</span>
                  </div>
                </li>
                <li>
                  <ShoppingBag size={18} aria-hidden="true" />
                  <div>
                    <strong>
                      {p.purchased
                        ? "Your item is ready"
                        : `${p.host} buys the bundle`}
                    </strong>
                    <span>
                      {p.purchased
                        ? "Arrange your pickup with your neighbour."
                        : "We’ll let you know when it’s ready."}
                    </span>
                  </div>
                </li>
                <li>
                  <MapPin size={18} aria-hidden="true" />
                  <div>
                    <strong>Meet, check, collect</strong>
                    <span>
                      {p.place} · {p.time}
                    </span>
                  </div>
                </li>
              </ol>
              <p className="receipt-protection">
                Payment is released only after you confirm collection.
              </p>
            </div>
            <p className="fine center">Demo payment · no real charge</p>
          </div>
        </main>
        <div className="receipt-undo-bar">
          {!unavailable && (
            <DeadlineProgress deadline={pending.deadline} seconds={seconds} />
          )}
          <div>
            <span>
              {unavailable ? "No demo payment was held." : "Changed your mind?"}
              <small>
                {unavailable
                  ? "Try another split."
                  : "You can still undo this reservation."}
              </small>
            </span>
            <button
              onClick={unavailable ? () => go("/", undefined, true) : cancel}
            >
              {unavailable ? "Explore splits" : "Undo reservation"}
            </button>
          </div>
        </div>
      </>
    );
  return (
    <>
      <Header
        title={
          reassurance ? "Preparing your reservation" : "Confirming your split"
        }
        label={reassurance ? "Undo" : "Cancel"}
        onBack={cancel}
      />
      <main className="page-scroll">
        <div className="content countdown-content">
          <div className="countdown-hero">
            <span className="eyebrow brand-text">
              A MOMENT TO CHANGE YOUR MIND
            </span>
            <Pizza count={p.bundleCount} animate />
            <div
              className="countdown-dial pizza-timer"
              role="timer"
              aria-label={`Confirmation in ${seconds} seconds`}
            >
              <svg viewBox="0 0 160 160" aria-hidden="true">
                <circle className="countdown-track" cx="80" cy="80" r="70" />
                <circle
                  className="countdown-ring"
                  cx="80"
                  cy="80"
                  r="70"
                  pathLength="1"
                  style={{ strokeDashoffset: 1 - remaining / 5000 }}
                />
              </svg>
              <span key={seconds} className="countdown-number">
                {seconds}
                <small>seconds</small>
              </span>
            </div>
            <h2>
              {unavailable
                ? "This portion is no longer available."
                : "Your split is almost yours."}
            </h2>
            <p className="muted">
              {unavailable
                ? "No demo payment was held. Browse another split."
                : "Changed your mind? Cancel below before the timer ends. Your demo payment will be held when it reaches zero."}
            </p>
          </div>
          <div className="panel countdown-summary">
            <Row title={p.title} detail={p.portion} />
            <Row title="Total to hold" detail={pending.method}>
              {money(total(p))}
            </Row>
            <Row title={p.place} detail={p.date + " · " + p.time} />
          </div>
          <p className="fine center">Demo payment · no real charge</p>
        </div>
      </main>
      <div className="action-bar">
        <Button
          kind="secondary"
          onClick={unavailable ? () => go("/", undefined, true) : cancel}
        >
          {unavailable
            ? "Explore nearby splits"
            : reassurance
              ? "Undo reservation"
              : "Cancel reservation"}
        </Button>
      </div>
    </>
  );
}
