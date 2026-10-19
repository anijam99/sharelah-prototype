import { useState } from "react";
import { useStore } from "./store";
import { people } from "./people";
import { useNow } from "./ui";
import {
  acceptRequest,
  cancelReservation,
  collectJoiner,
  owned,
  requestToJoin,
  simulatePurchase,
} from "./model";
import { CachedPhotos } from "./CachedPhotos";
import { go } from "./router";

export function DemoControls({
  resetDemo,
  freshAccount,
  locked,
}: {
  resetDemo: () => void;
  freshAccount: () => void;
  locked: boolean;
}) {
  const { state, update } = useStore(),
    now = useNow();
  const [photos, setPhotos] = useState(false);
  const [message, setMessage] = useState("");
  const hosted = state.products.filter((p) => p.owner && !p.closed);
  const joined = state.products.filter(
    (p) =>
      owned(state.reservations[p.id]) &&
      state.reservations[p.id].status !== "completed",
  );
  return (
    <>
      <details className="demo-controls">
        <summary>Demo settings & tools</summary>
        <fieldset disabled={locked}>
          <h3>Account setup</h3>
          <p className="demo-hint">
            {state.accountMode === "fresh" ? "Fresh account" : "Seeded demo"} ·
            Tom Chua
          </p>
          <button onClick={freshAccount}>Start fresh account</button>
          <p className="demo-hint">
            Start with no reviews, savings, completed splits, saved items or
            messages. Nearby deals stay available to explore.
          </p>
          <label>
            Demo neighbourhood
            <select
              value={state.area}
              onChange={(e) => update((s) => ({ ...s, area: e.target.value }))}
            >
              {["Bugis", "Bras Basah", "Tampines"].map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </label>
          <p className="demo-hint">
            Bugis has sample deals; other areas test an empty result.
          </p>
          <label>
            Demo radius
            <select
              value={state.radius}
              onChange={(e) =>
                update((s) => ({ ...s, radius: +e.target.value }))
              }
            >
              {[500, 1000, 3000].map((r) => (
                <option key={r} value={r}>
                  {r < 1000 ? "500 m" : `${r / 1000} km`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Demo payment
            <select
              value={state.payment}
              onChange={(e) =>
                update((s) => ({ ...s, payment: e.target.value }))
              }
            >
              {["Visa •••• 4242", "ShareLah wallet"].map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setPhotos(true);
            }}
          >
            Saved price-tag photos
          </button>
          <p className="demo-hint">
            Price comparisons use fixed supermarket, online, distance and fare
            scenarios for testing, not live quotes. Yoghurt and detergent
            support same-product and other-brand comparisons; fares and delivery
            fees are editable in the comparison.
          </p>
          <h3>Hosting simulation</h3>
          {!hosted.length && (
            <p className="demo-hint">
              Start a split to receive a join request. Jerry asks after about 8
              seconds.
            </p>
          )}
          {hosted.map((p) => (
            <div className="demo-scenario" key={p.id}>
              <strong>{p.title}</strong>
              <small>
                {p.available} of {p.shareCount} portions left
              </small>
              {(["jerry"] as const).map((person) => {
                const asked = (state.joinRequests[p.id] || []).some(
                  (r) =>
                    r.person === person &&
                    (r.status === "accepted" ||
                      (r.status === "requested" && !(Date.parse(r.at) > now))),
                );
                return (
                  <button
                    key={person}
                    disabled={asked}
                    onClick={() => {
                      update((s) => requestToJoin(s, p.id, person));
                      setMessage(`${people[person].name} asked to join.`);
                    }}
                  >
                    {asked
                      ? `${people[person].name} has asked`
                      : `Request from ${people[person].name}`}
                  </button>
                );
              })}
              {p.purchased &&
                (state.joinRequests[p.id] || [])
                  .filter((r) => r.status === "accepted")
                  .map((r) => (
                    <button
                      key={r.person}
                      onClick={() => {
                        update((s) => collectJoiner(s, p.id, r.person));
                        setMessage(
                          "Jerry scanned your code and collected. Split complete.",
                        );
                      }}
                    >
                      Jerry scans the pickup code
                    </button>
                  ))}
              <button
                onClick={() => {
                  go("/hosting/" + p.id);
                }}
              >
                View hosted split
              </button>
            </div>
          ))}
          <h3>Pickup simulation</h3>
          {!joined.length && (
            <p className="demo-hint">Reserve a portion to test pickup.</p>
          )}
          {joined.map((p) => (
            <div className="demo-scenario" key={p.id}>
              <strong>{p.title}</strong>
              <small>Pickup code: {p.code}</small>
              {state.reservations[p.id].status === "requested" && (
                <>
                  <button
                    onClick={() => {
                      update((s) => acceptRequest(s, p.id));
                      setMessage("Jerry accepted your request.");
                    }}
                  >
                    Host accepts now
                  </button>
                  <button
                    onClick={() => {
                      update((s) => cancelReservation(s, p.id, "declined"));
                      setMessage("Jerry declined. The hold was released.");
                    }}
                  >
                    Host declines
                  </button>
                </>
              )}
              {state.reservations[p.id].status === "reserved" && (
                <>
                  <button
                    onClick={() => {
                      update((s) => simulatePurchase(s, p.id));
                      setMessage(
                        "Host purchase simulated. The portion is ready for pickup.",
                      );
                    }}
                  >
                    Simulate purchase
                  </button>
                  <button
                    onClick={() => {
                      update((s) => cancelReservation(s, p.id, "removed"));
                      setMessage("Jerry removed you. The hold was released.");
                    }}
                  >
                    Host removes you
                  </button>
                  <button
                    onClick={() => {
                      update((s) => cancelReservation(s, p.id, "lapsed"));
                      setMessage(
                        "Buy-by time missed. The hold was released and the portion is available again.",
                      );
                    }}
                  >
                    Simulate missed buy-by time
                  </button>
                </>
              )}
            </div>
          ))}
          <button className="demo-reset" onClick={resetDemo}>
            Reset demo data
          </button>
          <p className="demo-hint">
            Clears this browser’s splits, reservations, messages and cached
            photos.
          </p>
        </fieldset>
        {locked && (
          <p className="demo-hint">
            Finish or cancel the active confirmation to change demo data.
          </p>
        )}
        {message && (
          <p className="demo-hint" role="status">
            {message}
          </p>
        )}
      </details>
      {photos && (
        <CachedPhotos
          onClose={() => setPhotos(false)}
          onSelect={(photo) => {
            update((s) => ({ ...s, createDraft: { ...s.createDraft, photo } }));
            setPhotos(false);
            go("/create/1");
          }}
        />
      )}
    </>
  );
}
