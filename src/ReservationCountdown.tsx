import { DeadlineProgress } from "./DeadlineProgress";
import { ShieldCheck, Clock3, ShoppingBag, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Header, Button, Row, Art } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import {
  money,
  owned,
  reserve,
  serviceFee,
  total,
  type Product,
} from "./model";

export type ConfirmationVariant = "A" | "B" | "C";
export function confirmationVariant(value: unknown): ConfirmationVariant {
  return value === "B" || value === "C" ? value : "A";
}
export function ReservationCountdown({
  p,
  variant = "A",
}: {
  p: Product;
  variant?: ConfirmationVariant;
}) {
  const { state, update } = useStore();
  const [pending] = useState(() => ({
    deadline: Number(history.state?.holdDeadline) || 0,
    method: history.state?.holdMethod as string | undefined,
    quantity: Math.max(1, Number(history.state?.holdQuantity) || 1),
    variant: confirmationVariant(history.state?.holdVariant || variant),
  }));
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, pending.deadline - Date.now()),
  );
  const [unavailable, setUnavailable] = useState(false);
  const settled = useRef(false);
  const latest = useRef({ state, update, p });
  latest.current = { state, update, p };

  function complete() {
    if (settled.current) return;
    settled.current = true;
    const { state, update, p } = latest.current;
    const current = state.products.find((q) => q.id === p.id);
    if (owned(state.reservations[p.id])) {
      go("/split/" + p.id, undefined, true);
    } else if (
      !current ||
      current.closed ||
      current.owner ||
      current.available < pending.quantity
    ) {
      setUnavailable(true);
    } else {
      update((s) => {
        const reserved = reserve(s, p.id, pending.quantity);
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
    if (pending.variant !== "B" && Date.now() >= pending.deadline) {
      complete();
      return;
    }
    settled.current = true;
    go("/offer/" + p.id, undefined, true);
  }

  useEffect(() => {
    if (!pending.deadline || !pending.method) {
      go("/offer/" + p.id, undefined, true);
      return;
    }
    if (pending.variant === "B") return;
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

  const seconds = Math.ceil(remaining / 1000),
    amount = money(total(p, pending.quantity)),
    portionText =
      (pending.quantity > 1 ? `${pending.quantity} × ` : "") + p.portion;
  if (pending.variant === "A")
    return (
      <>
        <Header title="Confirming your split" label="Undo" onBack={cancel} />
        <div className="receipt-countdown-heading">
          <div>
            <span className="eyebrow">YOUR SHARE, IN ONE PLACE</span>
            <h2>
              {unavailable ? "Portion unavailable" : "Review your reservation"}
            </h2>
          </div>
          {!unavailable && (
            <DeadlineProgress deadline={pending.deadline} seconds={seconds} />
          )}
        </div>
        <main className="page-scroll receipt-screen">
          <div className="content receipt-content">
            <div className="reservation-receipt">
              <div className="receipt-item">
                <Art p={p} />
                <div>
                  <h3>{p.title}</h3>
                  <p>{portionText}</p>
                </div>
              </div>
              <div className="receipt-amount">
                <span>
                  Amount to hold<strong>{amount}</strong>
                </span>
                <ShieldCheck size={30} aria-hidden="true" />
              </div>
              <div className="receipt-payment">
                <span>{pending.method}</span>
                <span>Includes {serviceFee} fee</span>
              </div>
              <ol className="receipt-steps">
                <li className="current">
                  <Clock3 size={18} aria-hidden="true" />
                  <div>
                    <strong>
                      Reserving your{" "}
                      {pending.quantity > 1
                        ? `${pending.quantity} portions`
                        : "portion"}
                    </strong>
                    <span>Five seconds to undo before the hold starts.</span>
                  </div>
                </li>
                <li>
                  <ShoppingBag size={18} aria-hidden="true" />
                  <div>
                    <strong>
                      {p.purchased
                        ? `${p.host} accepts your request`
                        : `${p.host} accepts and buys the bundle`}
                    </strong>
                    <span>
                      {p.purchased
                        ? "Hosts check your profile first. Then arrange your pickup."
                        : "Hosts check your profile first. We’ll let you know when it’s ready."}
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
          </div>
        </main>
        <div className="receipt-undo-bar">
          <div className="receipt-actions">
            {unavailable ? (
              <Button onClick={() => go("/", undefined, true)}>
                Explore splits
              </Button>
            ) : (
              <>
                <Button onClick={complete}>Looks good, proceed</Button>
                <Button
                  kind="secondary"
                  onClick={cancel}
                  aria-label="Cancel reservation"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </>
    );
  return (
    <>
      <Header title="Confirm reservation" label="Back" onBack={cancel} />
      <main className="page-scroll">
        <div className="content confirmation-question">
          <div className="confirmation-question-heading">
            <div>
              <ShieldCheck
                size={48}
                className="brand-text"
                aria-hidden="true"
              />
              <h2>
                {unavailable
                  ? "This portion is no longer available."
                  : "Are you sure?"}
              </h2>
            </div>
            {pending.variant === "C" && !unavailable && (
              <DeadlineProgress deadline={pending.deadline} seconds={seconds} />
            )}
          </div>
          <p className="muted">
            {unavailable
              ? "No payment was held. Try another split."
              : `Reserve ${pending.quantity > 1 ? `${pending.quantity} portions` : "one portion"} and hold ${amount} using ${pending.method}?`}
          </p>
          {pending.variant === "C" && !unavailable && (
            <p className="fine">
              Reserves automatically when the timer ends. Confirm now or go
              back.
            </p>
          )}
          <div className="panel countdown-summary">
            <div className="product-line">
              <Art p={p} />
              <div>
                <h3>{p.title}</h3>
                <p>{portionText}</p>
              </div>
            </div>
            <Row title="Total to hold" detail={`Includes ${serviceFee} fee`}>
              {amount}
            </Row>
            <Row title={p.place} detail={p.date + " · " + p.time} />
          </div>
          <p className="fine">
            Payment is released only after you confirm collection.
          </p>
        </div>
      </main>
      <div className="action-bar confirmation-actions">
        {unavailable ? (
          <Button onClick={() => go("/", undefined, true)}>
            Explore splits
          </Button>
        ) : (
          <>
            <Button onClick={complete}>Yes, reserve &amp; hold {amount}</Button>
            <Button kind="secondary" onClick={cancel}>
              Go back
            </Button>
          </>
        )}
      </div>
    </>
  );
}
