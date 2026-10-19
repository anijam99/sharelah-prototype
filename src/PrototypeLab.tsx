import { DemoControls } from "./DemoControls";
import { useSyncExternalStore } from "react";
import type { ConfirmationVariant } from "./ReservationCountdown";
import type { HomeVariant } from "./Browse";
import type { OpenModal } from "./Modals";
import type { CreateVariant } from "./Create";

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
  createLayout,
  selectCreateLayout,
  open,
  locked,
  embedded = false,
}: {
  variant: ConfirmationVariant;
  selectVariant: (value: ConfirmationVariant) => void;
  homeVariant: HomeVariant;
  selectHomeVariant: (value: HomeVariant) => void;
  createLayout: CreateVariant;
  selectCreateLayout: (value: CreateVariant) => void;
  open: OpenModal;
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
      <section
        className="home-layout-experiment"
        aria-label="Start a split A/B testing"
      >
        <h2>Start a split A/B test</h2>
        <div
          className="experiment-options"
          role="group"
          aria-label="Start a split layout"
        >
          <button
            aria-pressed={createLayout === "A"}
            onClick={() => selectCreateLayout("A")}
          >
            A · Step by step
          </button>
          <button
            aria-pressed={createLayout === "B"}
            onClick={() => selectCreateLayout("B")}
          >
            B · One page
          </button>
        </div>
        <details className="experiment-rationale">
          <summary>Why test these layouts?</summary>
          <p>
            <strong>A · Step by step.</strong> Four screens (item, portions,
            pickup, review), one decision at a time, with a progress indicator
            and errors caught at each step. Suits a small phone screen and
            people new to hosting.
          </p>
          <p>
            <strong>B · One page.</strong> The same fields in three numbered
            sections on a single scrolling page, published with one button.
            People see the whole split at once and can fix mistakes without
            going back and forth.
          </p>
          <p>
            Both use the same fields and validation. Compare time to publish and
            errors: validation messages hit, plus fields that don’t match the
            task.
          </p>
        </details>
        <p className="experiment-caption">
          Applies straight away, including to a split you’re part-way through;
          your entries are kept when you switch.
        </p>
      </section>
      <DemoControls
        locked={locked}
        resetDemo={() => open({ kind: "reset" })}
        freshAccount={() => open({ kind: "reset", fresh: true })}
      />
    </aside>
  );
}
