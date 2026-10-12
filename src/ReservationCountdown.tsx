import { useEffect, useRef, useState } from "react";
import { Header, Button, Row } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { money, owned, reserve, total, type Product } from "./model";

export function ReservationCountdown({ p }: { p: Product }) {
  const { state, update } = useStore();
  const [pending] = useState(() => ({
    deadline: Number(history.state?.holdDeadline) || 0,
    method: history.state?.holdMethod as string | undefined,
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
    if (Date.now() >= pending.deadline) {
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
  return (
    <>
      <Header title="Confirming your split" label="Cancel" onBack={cancel} />
      <main className="page-scroll">
        <div className="content countdown-content">
          <div className="countdown-hero">
            <span className="eyebrow brand-text">
              A MOMENT TO CHANGE YOUR MIND
            </span>
            <div
              className="countdown-dial"
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
          {unavailable ? "Explore nearby splits" : "Cancel reservation"}
        </Button>
      </div>
    </>
  );
}
