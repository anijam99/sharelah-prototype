import { useState } from "react";
import { useStore } from "./store";
import { joinHostedDeal, owned } from "./model";
import { CachedPhotos } from "./CachedPhotos";
import { go } from "./router";

export function DemoControls({
  resetDemo,
  leavePreview,
  locked,
}: {
  resetDemo: () => void;
  leavePreview: () => void;
  locked: boolean;
}) {
  const { state, update } = useStore();
  const [photos, setPhotos] = useState(false);
  const [message, setMessage] = useState("");
  const hosted = state.products.filter((p) => p.owner && !p.closed);
  const joined = state.products.filter((p) => owned(state.reservations[p.id]));
  return (
    <>
      <details className="demo-controls">
        <summary>Demo settings & tools</summary>
        <fieldset disabled={locked}>
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
              leavePreview();
              setPhotos(true);
            }}
          >
            Saved price-tag photos
          </button>
          <h3>Hosting simulation</h3>
          {!hosted.length && (
            <p className="demo-hint">Share a split to invite Jerry.</p>
          )}
          {hosted.map((p) => (
            <div className="demo-scenario" key={p.id}>
              <strong>{p.title}</strong>
              <small>
                {p.available} of {p.shareCount} portions left
              </small>
              <button
                disabled={!!state.joinedHosts[p.id] || p.available < 1}
                onClick={() => {
                  update((s) => joinHostedDeal(s, p.id));
                  setMessage("Jerry claimed one portion.");
                }}
              >
                {state.joinedHosts[p.id]
                  ? "Jerry has joined"
                  : "Jerry joins this split"}
              </button>
              <button
                onClick={() => {
                  leavePreview();
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
              {state.reservations[p.id].status === "reserved" && (
                <button
                  onClick={() => {
                    update((s) =>
                      s.reservations[p.id]?.status !== "reserved"
                        ? s
                        : {
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
                          },
                    );
                    setMessage(
                      "Host purchase simulated. The portion is ready for pickup.",
                    );
                  }}
                >
                  Simulate purchase
                </button>
              )}
            </div>
          ))}
          <button className="demo-reset" onClick={resetDemo}>
            Reset demo data
          </button>
          <p className="demo-hint">
            Clears this browser’s listings, reservations, messages and cached
            photos.
          </p>
        </fieldset>
        {locked && (
          <p className="demo-hint">
            Finish or undo the active countdown to change demo data.
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
            leavePreview();
            go("/create/1");
          }}
        />
      )}
    </>
  );
}
