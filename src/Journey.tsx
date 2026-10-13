import { CompareButton } from "./Compare";
import { Pizza } from "./Pizza";
import { hostPerson, profileSummary } from "./people";
import { dealPrice } from "./dealCatalog";
import { TileMap } from "./TileMap";
import { useState, useEffect, useRef } from "react";
import { Check, Send, Camera as CameraIcon } from "lucide-react";
import { Art, Button, Header, PriceRows, Row, QRCode, Empty } from "./ui";
import { Camera } from "./Camera";
import { back, finish, go } from "./router";
import { useStore } from "./store";
import {
  complete,
  money,
  owned,
  reportProblem,
  statusLabel,
  total,
  validateCode,
  type Product,
} from "./model";
import type { OpenModal } from "./Browse";
export function Offer({ p, open }: { p: Product; open: OpenModal }) {
  const { state, update } = useStore(),
    saved = state.saved.includes(p.id),
    deal = state.deals.find((d) => d.id === p.sourceDealId),
    host = profileSummary(state, hostPerson(p));
  return (
    <>
      <Header title={p.title} />
      <main className="page-scroll">
        <div className="content">
          <div className="offer-hero">
            <div className="product-line">
              <Art p={p} large />
              <div>
                <h2>{p.title}</h2>
                <p>{p.portion}</p>
                <span>{p.store}</span>
              </div>
            </div>
            <strong className="big-price">{money(total(p))} total</strong>
            <p>
              Save {money(Math.max(0, p.retailCents - total(p)))} compared with{" "}
              {money(p.retailCents)} retail.
            </p>
            <small>Includes S$0.15 service fee</small>
            <div className="shared-edge" />
          </div>
          <CompareButton item={p} kind="offer" />
          <Row
            title={"Hosted by " + p.host}
            detail={`${host.average} ★ · ${host.reviews} reviews · View profile`}
            onClick={() => go("/neighbour/" + hostPerson(p))}
          />
          {deal && (
            <Row
              title="View the photographed deal"
              detail={dealPrice(deal) + " · " + deal.portion}
              onClick={() => go("/deal/" + deal.id)}
            />
          )}
          <div className="panel">
            <h3>Just your portion.</h3>
            <p>
              {p.host} buys the {p.bundleCount}-item bundle and shares{" "}
              {p.shareCount} {p.shareCount === 1 ? "item" : "items"} with
              neighbours.
            </p>
            <PriceRows p={p} />
          </div>
          <Row
            title={p.place}
            detail={
              <>
                {p.date} · {p.time}
                <br />
                {p.distance} m away · {Math.ceil(p.distance / 70)} min walk
              </>
            }
            onClick={() => go("/directions/" + p.id)}
          />
          <div className="notice">
            Your payment stays held until you check the item and confirm
            collection.
          </div>
          <Button
            kind="secondary"
            onClick={() =>
              update((s) => ({
                ...s,
                saved: saved
                  ? s.saved.filter((id) => id !== p.id)
                  : [...s.saved, p.id],
              }))
            }
          >
            {saved ? "Remove from saved" : "♡ Save split"}
          </Button>
          <button className="text-button" onClick={() => open("help")}>
            How it works ›
          </button>
        </div>
      </main>
      <footer className="action-bar">
        <Button
          disabled={
            p.closed || (!owned(state.reservations[p.id]) && p.available < 1)
          }
          onClick={() =>
            owned(state.reservations[p.id])
              ? go("/split/" + p.id)
              : open("review:" + p.id)
          }
        >
          {owned(state.reservations[p.id])
            ? "View my split"
            : p.available < 1
              ? "All portions reserved"
              : "Reserve a portion"}
        </Button>
      </footer>
    </>
  );
}
export function MySplit({ p, open }: { p: Product; open: OpenModal }) {
  const { state } = useStore(),
    r = state.reservations[p.id];
  if (!owned(r))
    return (
      <>
        <Header title="My split" />
        <main className="page-scroll">
          <div className="content">
            <Empty
              title="No active reservation"
              action={
                <Button onClick={() => go("/offer/" + p.id, "My splits", true)}>
                  View offer
                </Button>
              }
            >
              This portion is not currently in your splits.
            </Empty>
          </div>
        </main>
      </>
    );
  const done = r.status === "completed",
    reported = r.status === "reported",
    ready = r.status === "ready";
  return (
    <>
      <Header
        title={
          done
            ? "Split complete"
            : reported
              ? "Report submitted"
              : ready
                ? "Ready for pickup"
                : "My reservation"
        }
        item={p.title}
      />
      <main className="page-scroll">
        <div className="content">
          <div className="status-hero">
            <Pizza
              count={p.bundleCount}
              taken={Math.max(1, p.shareCount - p.available)}
            />
            <span className="eyebrow">
              {done
                ? "NICE ONE, NEIGHBOUR"
                : reported
                  ? "WE’VE SAVED YOUR REPORT"
                  : ready
                    ? "YOUR PORTION IS READY"
                    : "YOU’RE IN"}
            </span>
            <h2>
              {done
                ? "A little shared. A little saved."
                : reported
                  ? "Payment stays held."
                  : ready
                    ? "Your portion is ready."
                    : "Your portion is reserved."}
            </h2>
            <p>
              {p.title} · {p.portion}
            </p>
            <strong>
              {money(total(p))} {done ? "released" : "held"}
            </strong>
            <div className="shared-edge" />
          </div>
          <CompareButton item={p} kind="offer" />
          <Row
            title={p.host + "’s profile"}
            detail="View neighbour and reviews"
            onClick={() => go("/neighbour/" + hostPerson(p))}
          />
          {reported ? (
            <>
              <Row
                title={r.report?.reason || "Problem reported"}
                detail={r.report?.note || "No additional details."}
              />
              <p className="notice">
                Your report is saved in this demo. Payment cannot be released
                while it is under review.
              </p>
              <Button kind="secondary" onClick={() => go("/chat/" + p.id)}>
                Message {p.host}
              </Button>
            </>
          ) : done ? (
            <>
              <div className="panel">
                <h3>Your receipt</h3>
                <PriceRows p={p} />
                <p className="fine">Paid with {r.method} · Demo payment</p>
              </div>
              {r.rating && (
                <div className="panel">
                  <h3>Your review · {r.rating} / 5</h3>
                  {r.reviewComment && (
                    <p className="review-comment">{r.reviewComment}</p>
                  )}
                </div>
              )}
              <Button onClick={() => open("rating:" + p.id)}>
                {r.rating ? "Edit your review" : "Rate your experience"}
              </Button>
              <Button kind="secondary" onClick={() => go("/splits")}>
                View my splits
              </Button>
            </>
          ) : (
            <>
              <div className="panel">
                <h3>Next step</h3>
                <p>
                  {ready
                    ? `Meet ${p.host}, check your sealed item, then scan their pickup code.`
                    : `${p.host} will buy the bundle and let you know when it’s ready.`}
                </p>
              </div>
              <Row
                title={p.place}
                detail={
                  <>
                    {p.date} · {p.time}
                    <br />
                    {p.note}
                  </>
                }
                onClick={() => go("/directions/" + p.id)}
              />
              <Button kind="secondary" onClick={() => go("/chat/" + p.id)}>
                Message {p.host}
              </Button>
              <button
                className="text-button"
                onClick={() =>
                  ready ? go("/problem/" + p.id) : open("cancel:" + p.id)
                }
              >
                {ready ? "Report a problem" : "Cancel reservation"}
              </button>
            </>
          )}
        </div>
      </main>
      {!done && !reported && (
        <footer className="action-bar">
          <Button onClick={() => go(ready ? "/scan/" + p.id : "/splits")}>
            {ready ? "Collect my portion" : "View my splits"}
          </Button>
        </footer>
      )}
    </>
  );
}
export function Pickup({
  p,
  kind,
}: {
  p: Product;
  kind: "scan" | "code" | "receipt";
}) {
  const { state, update } = useStore(),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [scan, setScan] = useState(kind === "scan");
  const r = state.reservations[p.id];
  const stamp = Number(sessionStorage.getItem("sharelah-verified-" + p.id));
  const verified = stamp > 0 && Date.now() - stamp < 30 * 60 * 1000;
  function accept(value: string) {
    if (!validateCode(state, p.id, value)) return false;
    sessionStorage.setItem("sharelah-verified-" + p.id, String(Date.now()));
    go("/receipt/" + p.id, kind === "code" ? "Code" : "Scan");
    return true;
  }
  function submit() {
    if (!accept(code))
      setError(
        "That code doesn’t match. Ask " +
          p.host +
          " for their 6-digit pickup code.",
      );
  }
  if (r?.status !== "ready")
    return (
      <>
        <Header title="Collect your portion" item={p.title} />
        <main className="page-scroll">
          <div className="content">
            <Empty
              title={
                r?.status === "reported"
                  ? "This payment is under review."
                  : "This split isn’t ready to collect."
              }
              action={
                <Button onClick={() => go("/split/" + p.id, "My split", true)}>
                  View my split
                </Button>
              }
            >
              Check the current status before continuing.
            </Empty>
          </div>
        </main>
      </>
    );
  return (
    <>
      <Header
        title={
          kind === "receipt"
            ? "Confirm receipt"
            : kind === "code"
              ? "Pickup code"
              : "Collect your portion"
        }
        item={p.title}
      />
      <main className="page-scroll">
        <div className="content">
          {kind === "receipt" ? (
            verified ? (
              <>
                <h2>Everything look right?</h2>
                <Row title={p.title} detail={p.portion} />
                <PriceRows p={p} />
                <div className="notice">
                  Check the item and quantity before releasing {money(total(p))}{" "}
                  to complete your split.
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I received my portion in the expected condition.
                </label>
                <Button
                  disabled={!confirmed}
                  onClick={() => {
                    update((s) => complete(s, p.id, confirmed));
                    sessionStorage.removeItem("sharelah-verified-" + p.id);
                    finish("/split/" + p.id);
                  }}
                >
                  Confirm &amp; release {money(total(p))}
                </Button>
                <Button kind="secondary" onClick={() => go("/problem/" + p.id)}>
                  Something is wrong
                </Button>
              </>
            ) : (
              <Empty
                title="Check the pickup code first"
                action={
                  <Button onClick={() => go("/scan/" + p.id, "Receipt", true)}>
                    Scan the host’s code
                  </Button>
                }
              >
                Scan or enter the code before confirming receipt.
              </Empty>
            )
          ) : kind === "code" ? (
            <>
              <h2>Enter pickup code</h2>
              <p className="muted">
                Ask {p.host} for the 6-digit code on their pickup screen.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label className="sr-only" htmlFor="pickup-code">
                  6-digit pickup code
                </label>
                <input
                  id="pickup-code"
                  className="code-input"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="– – – – – –"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  autoFocus
                />
                <p className="muted">
                  Your payment stays on hold. You’ll check the item before
                  confirming receipt.
                </p>
                {error && (
                  <p className="notice error" role="alert">
                    {error}
                  </p>
                )}
                <Button disabled={code.length !== 6} type="submit">
                  Find my portion
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2>Scan {p.host}’s pickup code</h2>
              <p className="muted">
                Scanning finds your portion. You’ll confirm receipt before
                payment is released.
              </p>
              {scan ? (
                <Camera mode="qr" onCode={accept} />
              ) : (
                <Button onClick={() => setScan(true)}>
                  <CameraIcon />
                  Open camera
                </Button>
              )}
              <Button
                kind="secondary"
                onClick={() => go("/code/" + p.id, "Scan")}
              >
                Enter pickup code instead
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
export function Problem({ p }: { p: Product }) {
  const { state, update } = useStore(),
    [reason, setReason] = useState("Item is wrong or damaged"),
    [note, setNote] = useState("");
  return (
    <>
      <Header title="Report a problem" item={p.title} />
      <main className="page-scroll">
        <div className="content">
          <h2>Let’s put this on hold.</h2>
          <p className="muted">
            Tell us what happened. Your held payment won’t be released while the
            report is open.
          </p>
          <fieldset>
            <legend>What went wrong?</legend>
            {[
              "Item is wrong or damaged",
              "Host didn’t arrive",
              "Missing portion",
              "Something else",
            ].map((s) => (
              <label className="choice" key={s}>
                <input
                  type="radio"
                  name="reason"
                  checked={reason === s}
                  onChange={() => setReason(s)}
                />
                {s}
              </label>
            ))}
          </fieldset>
          <label>
            Anything else? <small>(optional)</small>
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add the details that would help resolve this."
            />
          </label>
          <div className="notice">
            This is a prototype report. It is saved locally for testing and is
            not sent to a support team.
          </div>
          <Button
            disabled={
              !["ready", "reserved"].includes(state.reservations[p.id]?.status)
            }
            onClick={() => {
              update((s) => reportProblem(s, p.id, reason, note));
              finish("/split/" + p.id);
            }}
          >
            Submit report
          </Button>
        </div>
      </main>
    </>
  );
}
export function Chat({ p }: { p: Product }) {
  const { state, update } = useStore(),
    end = useRef<HTMLDivElement>(null),
    messages = state.messages[p.id] || [],
    draft = state.drafts[p.id] || "";
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [messages.length]);
  function send(body: string) {
    if (!body.trim()) return;
    update((s) => ({
      ...s,
      messages: {
        ...s.messages,
        [p.id]: [
          ...(s.messages[p.id] || []),
          {
            id: crypto.randomUUID(),
            body: body.trim(),
            mine: true,
            time: new Date().toISOString(),
          },
        ],
      },
      drafts: { ...s.drafts, [p.id]: "" },
    }));
  }
  return (
    <>
      <Header title={p.owner ? "Jerry" : p.host} item={p.title} />
      <main className="page-scroll chat-scroll">
        <div className="content">
          <Row
            title={"View " + (p.owner ? "Jerry" : p.host) + "’s profile"}
            detail="Read reviews from split partners"
            onClick={() => go("/neighbour/jerry")}
          />
          <Row title={p.title} detail={p.portion} />
          <p className="chat-demo">
            Demo conversation · messages stay on this device
          </p>
          <div className="bubble">
            <p>Hi! We can meet at the pickup point shown in your split.</p>
            <small>Today · 5:42 pm</small>
          </div>
          {messages.map((m) => (
            <div className={"bubble " + (m.mine ? "mine" : "")} key={m.id}>
              <p>{m.body}</p>
              <small>
                {new Date(m.time).toLocaleTimeString("en-SG", {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · {m.mine ? "Saved in demo" : "Demo message"}
              </small>
            </div>
          ))}
          <div ref={end} />
        </div>
      </main>
      <footer className="composer">
        <div className="quick-replies">
          <button onClick={() => send("I’m here.")}>I’m here</button>
          <button onClick={() => send("Running 5 minutes late.")}>
            5 mins late
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label className="sr-only" htmlFor="chat-message">
            Message
          </label>
          <textarea
            id="chat-message"
            rows={1}
            maxLength={1000}
            value={draft}
            placeholder="Write a message"
            onChange={(e) =>
              update((s) => ({
                ...s,
                drafts: { ...s.drafts, [p.id]: e.target.value },
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button
            className="primary"
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </>
  );
}
export function Directions({ p }: { p: Product }) {
  return (
    <>
      <Header title="Pickup directions" item={p.title} />
      <main className="page-scroll">
        <div className="content">
          <TileMap products={[p]} selected={p.id} pickup />
          <h2>{p.place}</h2>
          <p>{p.address}</p>
          <Row
            title={`${p.distance} m · about ${Math.ceil(p.distance / 70)} minutes on foot`}
            detail="Estimated from the demo starting location"
          />
          <Row title={p.date + " · " + p.time} detail={p.note} />
          <a
            className="primary full"
            href={
              "https://www.google.com/maps/dir/?api=1&destination=" +
              encodeURIComponent(p.address + ", Singapore") +
              "&travelmode=walking"
            }
            target="_blank"
            rel="noreferrer"
          >
            Open walking directions
          </a>
          <Button kind="secondary" onClick={() => back()}>
            Back to split
          </Button>
        </div>
      </main>
    </>
  );
}
export function Hosting({
  p,
  open,
  published,
}: {
  p: Product;
  open: OpenModal;
  published: boolean;
}) {
  const { state, update } = useStore(),
    joined = state.joinedHosts[p.id];
  return (
    <>
      <Header
        title={published ? "Split published" : "Your listing"}
        item={p.title}
        label="Hosting"
        onBack={() => {
          sessionStorage.setItem("sharelah-splits-tab", "Hosting");
          go("/splits", "Hosting", true);
        }}
      />
      <main className="page-scroll">
        <div className="content">
          <div className="status-hero">
            <Pizza
              count={p.bundleCount}
              taken={p.shareCount - p.available}
              animate={published}
            />
            <h2>
              {p.closed
                ? "This listing is closed."
                : p.purchased
                  ? "Ready to share."
                  : joined
                    ? "Your neighbour is in."
                    : "Your split is live."}
            </h2>
            <p>
              {p.title} · {p.available} of {p.shareCount} portions available
            </p>
            <div className="shared-edge" />
          </div>
          <Row title={p.title} detail={p.portion} />
          <div className="panel">
            <PriceRows p={p} />
          </div>
          <Row title={p.place} detail={p.date + " · " + p.time} />
          {joined && (
            <Row
              title="Jerry · 1 portion"
              detail={p.purchased ? "Ready for pickup" : "Waiting for purchase"}
              onClick={() => go("/neighbour/jerry")}
            />
          )}
          {joined && (
            <Button kind="secondary" onClick={() => go("/chat/" + p.id)}>
              Message Jerry
            </Button>
          )}{" "}
          {!p.closed && p.purchased && (
            <div className="panel center">
              <h3>Your pickup code</h3>
              <p>Show this after your neighbour has checked their item.</p>
              <QRCode value={`sharelah:pickup:${p.id}:${p.code}`} />
              <strong className="pickup-number">{p.code}</strong>
            </div>
          )}
          {!p.closed && !p.purchased && joined && (
            <Button
              onClick={() =>
                update((s) => ({
                  ...s,
                  products: s.products.map((q) =>
                    q.id === p.id ? { ...q, purchased: true } : q,
                  ),
                }))
              }
            >
              Mark purchased &amp; notify
            </Button>
          )}
          {!p.closed && !p.purchased && (
            <Button
              kind="secondary"
              onClick={() => open("close-listing:" + p.id)}
            >
              Close listing
            </Button>
          )}
          <button
            className="text-button"
            onClick={() => go("/profile/testing")}
          >
            Testing controls ›
          </button>
        </div>
      </main>
    </>
  );
}
