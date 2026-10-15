import { DemoControls } from "./DemoControls";
import { useSyncExternalStore } from "react";
import type { ConfirmationVariant } from "./ReservationCountdown";
import type { HomeVariant } from "./Browse";

const mobileQuery = window.matchMedia("(max-width: 899px)");
export function useMobileLayout() {
  return useSyncExternalStore(
    (onChange) => {
      mobileQuery.addEventListener("change", onChange);
      return () => mobileQuery.removeEventListener("change", onChange);
    },
    () => mobileQuery.matches,
  );
}

export function PrototypeLab({
  variant,
  selectVariant,
  homeVariant,
  selectHomeVariant,
  open,
  locked,
  embedded = false,
}: {
  variant: ConfirmationVariant;
  selectVariant: (value: ConfirmationVariant) => void;
  homeVariant: HomeVariant;
  selectHomeVariant: (value: HomeVariant) => void;
  open: (value: string) => void;
  locked: boolean;
  embedded?: boolean;
}) {
  return (
    <aside
      className={embedded ? "testing-lab" : "experiment-panel"}
      aria-label="Prototype testing controls"
    >
      <span className="eyebrow">PROTOTYPE LAB</span>
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
          steps, then reserves automatically after five seconds. People can undo
          or skip the wait. Test whether the pause gives enough time to review
          without feeling slow.
        </p>
        <p>
          <strong>B · Extra confirmation.</strong> Asks “Are you sure?” and
          waits for an explicit decision. Test whether this gives people more
          control or adds an unnecessary step.
        </p>
        <p>
          <strong>C · Confirm + countdown.</strong> Uses B’s “Are you sure?”
          screen with A’s five-second countdown. People can confirm now or go
          back before it reserves automatically. Test how the time limit changes
          their decision on the same confirmation screen.
        </p>
        <p>
          Compare completion time, accidental reservations and confidence about
          the payment hold.
        </p>
      </details>
      <p className="experiment-caption">
        Sets your next checkout. Selecting an option does not play a preview or
        change a confirmation already in progress.
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
            page, followed by filters and listings. Test whether location helps
            people choose a deal.
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
          Changes Home immediately; on other screens it applies when you return
          Home.
        </p>
      </section>
      <DemoControls
        locked={locked}
        resetDemo={() => open("reset")}
        freshAccount={() => open("fresh-account")}
      />
    </aside>
  );
}
