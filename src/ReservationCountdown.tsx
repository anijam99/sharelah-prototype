import { DeadlineProgress } from "./DeadlineProgress";
import { ShieldCheck, Clock3, ShoppingBag, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Header, Button, Row, Art } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { money, owned, reserve, total, type Product } from "./model";

export type ConfirmationVariant = "A" | "B";
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
    variant: (history.state?.holdVariant || variant) as ConfirmationVariant,
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
    if (pending.variant === "A" && Date.now() >= pending.deadline) {
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

  const seconds = Math.ceil(remaining / 1000);
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
          <ShieldCheck size={48} className="brand-text" aria-hidden="true" />
          <h2>
            {unavailable
              ? "This portion is no longer available."
              : "Are you sure?"}
          </h2>
          <p className="muted">
            {unavailable
              ? "No demo payment was held. Try another split."
              : `Reserve one portion and hold ${money(total(p))} using ${pending.method}?`}
          </p>
          <div className="panel countdown-summary">
            <div className="product-line">
              <Art p={p} />
              <div>
                <h3>{p.title}</h3>
                <p>{p.portion}</p>
              </div>
            </div>
            <Row title="Total to hold" detail="Includes S$0.15 fee">
              {money(total(p))}
            </Row>
            <Row title={p.place} detail={p.date + " · " + p.time} />
          </div>
          <p className="fine">
            Payment is released only after you confirm collection. Demo payment
            · no real charge.
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
            <Button onClick={complete}>
              Yes, reserve &amp; hold {money(total(p))}
            </Button>
            <Button kind="secondary" onClick={cancel}>
              Go back
            </Button>
          </>
        )}
      </div>
    </>
  );
}
