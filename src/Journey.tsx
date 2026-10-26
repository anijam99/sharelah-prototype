import { CompareButton } from "./Compare";
import { comparisonFamily } from "./comparison";
import { ReportButton, ReportedNotice, ReportSheet } from "./ReportListing";
import { Pizza } from "./Pizza";
import { chatPartner, hostPerson, profileSummary } from "./people";
import { TileMap } from "./TileMap";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  Camera as CameraIcon,
  Flag,
  Heart,
  KeyRound,
  MessageCircle,
  Navigation,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Art, Button, Header, PriceRows, Row, Empty } from "./ui";
import { Camera } from "./Camera";
import { back, finish, go } from "./router";
import { useStore } from "./store";
import {
  buyBy,
  conversationStatus,
  complete,
  money,
  owned,
  quantityOf,
  reportProblem,
  savingFor,
  serviceFee,
  total,
  validateCode,
  type Product,
  seeReady,
} from "./model";
import type { OpenModal } from "./Modals";
export function Offer({ p, open }: { p: Product; open: OpenModal }) {
  const { state, update } = useStore(),
    [reporting, setReporting] = useState(false),
    saved = state.saved.includes(p.id),
    deal = state.deals.find((d) => d.id === p.sourceDealId),
    host = profileSummary(state, hostPerson(p)),
    mine = owned(state.reservations[p.id]),
    reportKey = "offer:" + p.id,
    reported = !!state.reports?.[reportKey],
    saving = savingFor(p),
    walk = Math.ceil(p.distance / 70);
  return (
    <>
      <Header
        title="Split details"
        action={
          <ReportButton
            noun="split"
            onClick={() => setReporting(true)}
            reported={reported}
          />
        }
      />
      <main className="page-scroll">
        <div className="content offer-content">
          <ReportedNotice
            reportKey={reportKey}
            edit={() => setReporting(true)}
          />
          <section className="item-hero" aria-label="Item">
            <Art p={p} large />
            <div>
              <h2>{p.title}</h2>
              <p>{p.portion}</p>
              <small>{p.store}</small>
              <div className="item-badges">
                <span className={p.available < 1 ? "badge muted" : "badge"}>
                  {p.closed
                    ? "Closed"
                    : p.available < 1
                      ? "Fully reserved"
                      : `${p.available} of ${p.shareCount} left`}
                </span>
                <span className="badge muted">{p.category}</span>
                {mine && <span className="badge dark">In your splits</span>}
              </div>
            </div>
          </section>
          <div className="fact-grid">
            <div className="fact price">
              <small>You pay</small>
              <strong>{money(total(p))}</strong>
              <span className={saving > 0 ? "saving" : ""}>
                {saving > 0
                  ? `Save ${money(saving)} · was ${money(p.retailCents)}`
                  : `Incl. ${serviceFee} fee`}
              </span>
            </div>
            <button
              className="fact"
              onClick={() => go("/neighbour/" + hostPerson(p))}
            >
              <small>Hosted by</small> <strong>{p.host}</strong>{" "}
              <span>
                {host.average} ★ · {host.reviews} reviews
              </span>
            </button>
            <button className="fact" onClick={() => go("/directions/" + p.id)}>
              <small>Pickup</small> <strong>{p.date}</strong>{" "}
              <span>{p.time}</span>
            </button>
            <button className="fact" onClick={() => go("/directions/" + p.id)}>
              <small>Where</small> <strong>{p.place}</strong>{" "}
              <span>
                {p.distance} m · {walk} min walk
              </span>
            </button>
          </div>
          <div className="quick-actions">
            <button
              aria-pressed={saved}
              onClick={() =>
                update((s) => ({
                  ...s,
                  saved: saved
                    ? s.saved.filter((id) => id !== p.id)
                    : [...s.saved, p.id],
                }))
              }
            >
              <Heart
                size={20}
                aria-hidden="true"
                fill={saved ? "currentColor" : "none"}
              />
              {saved ? "Saved" : "Save"}
            </button>
            {comparisonFamily(p) && (
              <button
                aria-label="Compare prices & travel"
                onClick={() => go(`/compare/offer/${p.id}`)}
              >
                <ArrowLeftRight size={20} aria-hidden="true" />
                Compare
              </button>
            )}
            {!mine && (
              <button onClick={() => go("/chat/" + p.id)}>
                <MessageCircle size={20} aria-hidden="true" />
                Ask {p.host}
              </button>
            )}
            <button onClick={() => go("/directions/" + p.id)}>
              <Navigation size={20} aria-hidden="true" />
              Directions
            </button>
            {deal?.photo && (
              <button onClick={() => go("/deal/" + deal.id)}>
                <CameraIcon size={20} aria-hidden="true" />
                Shelf photo
              </button>
            )}
          </div>
          <div className="panel deal-summary">
            <div className="deal-summary-top">
              <div className="deal-summary-pizza" aria-hidden="true">
                <Pizza count={p.bundleCount} taken={p.shareCount} />
              </div>
              <div>
                <h3>How this split works</h3>
                <p>
                  {p.host} buys{" "}
                  {deal?.priceLabel
                    ? `the “${deal.priceLabel}” offer`
                    : `${p.bundleCount} for ${money(p.bundleCents)}`}
                  , keeps {p.bundleCount - p.shareCount} and shares{" "}
                  {p.shareCount} with neighbours.{" "}
                  {p.purchased
                    ? "It’s already bought and ready to collect."
                    : `They’ll buy it by ${buyBy(p)} ${p.date.toLowerCase()}. If they don’t, your hold is released automatically.`}
                </p>
              </div>
            </div>
            <details className="price-details">
              <summary>Price breakdown</summary>
              <PriceRows p={p} />
            </details>
          </div>
          {p.note && (
            <div className="host-note">
              <small>Note from {p.host}</small>
              <p>“{p.note}”</p>
            </div>
          )}
          <p className="fine trust-line">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Payment is held until you check the item and confirm collection.{" "}
              <button
                className="text-button"
                onClick={() => open({ kind: "help" })}
              >
                How it works ›
              </button>
            </span>
          </p>
          <button className="report-row" onClick={() => setReporting(true)}>
            <Flag size={16} aria-hidden="true" />
            {reported
              ? "You reported this split · Edit report"
              : "Something off? Report this split"}
          </button>
        </div>
      </main>
      <footer className="action-bar with-price">
        <div className="action-price">
          <strong>{money(total(p))}</strong>
          <small>per portion</small>
        </div>
        <Button
          disabled={p.closed || (!mine && p.available < 1)}
          onClick={() =>
            mine ? go("/split/" + p.id) : open({ kind: "reserve", id: p.id })
          }
        >
          {mine
            ? "View my split"
            : p.available < 1
              ? "All portions reserved"
              : "Reserve a portion"}
        </Button>
      </footer>
      {reporting && (
        <ReportSheet
          reportKey={reportKey}
          title={p.title}
          noun="split"
          close={() => setReporting(false)}
        />
      )}
    </>
  );
}
/** What to tell a joiner whose hold the host ended. */
const released: Record<
  "you" | "lapsed" | "declined" | "removed",
  { title: string; body: (p: Product, amount: string) => string }
> = {
  you: {
    title: "No active reservation",
    body: () => "You cancelled this reservation. Nothing was charged.",
  },
  lapsed: {
    title: "Your hold was released",
    body: (p, amount) =>
      `${p.host} didn’t buy ${p.title} by ${buyBy(p)}, so your ${amount} hold was released. Nothing was charged.`,
  },
  declined: {
    title: `Request declined`,
    body: (p, amount) =>
      `${p.host} couldn’t take you on this split, so your ${amount} hold was released. Nothing was charged. There are other splits nearby.`,
  },
  removed: {
    title: "Removed from this split",
    body: (p, amount) =>
      `${p.host} removed you before buying the bundle, so your ${amount} hold was released. Nothing was charged.`,
  },
};
export function MySplit({ p, open }: { p: Product; open: OpenModal }) {
  const { state, update } = useStore(),
    r = state.reservations[p.id];
  // Opening the split counts as seeing the "ready to collect" notice.
  const unseen = !!r?.readyAlert;
  useEffect(() => {
    if (unseen) update((s) => seeReady(s, p.id));
  }, [unseen, p.id, update]);
  if (!owned(r))
    return (
      <>
        <Header title="My split" />
        <main className="page-scroll">
          <div className="content">
            <Empty
              title={
                r?.status === "cancelled" && r.cancelReason
                  ? released[r.cancelReason].title
                  : "No active reservation"
              }
              action={
                <Button onClick={() => go("/offer/" + p.id, "My splits", true)}>
                  View split
                </Button>
              }
            >
              {r?.status === "cancelled" && r.cancelReason
                ? released[r.cancelReason].body(
                    p,
                    money(total(p, quantityOf(r))),
                  )
                : "This portion is not currently in your splits."}
            </Empty>
          </div>
        </main>
      </>
    );
  const done = r.status === "completed",
    reported = r.status === "reported",
    ready = r.status === "ready",
    requested = r.status === "requested",
    quantity = quantityOf(r),
    portions = quantity > 1 ? `${quantity} portions` : "portion";
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
                : requested
                  ? "Request sent"
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
                    ? `YOUR ${portions.toUpperCase()} ${quantity > 1 ? "ARE" : "IS"} READY`
                    : requested
                      ? `WAITING FOR ${p.host.toUpperCase()}`
                      : "YOU’RE IN"}
            </span>
            <h2>
              {done
                ? "A little shared. A little saved."
                : reported
                  ? "Payment stays held."
                  : ready
                    ? `Your ${portions} ${quantity > 1 ? "are" : "is"} ready.`
                    : requested
                      ? `${p.host} is reviewing your request.`
                      : `Your ${portions} ${quantity > 1 ? "are" : "is"} reserved.`}
            </h2>
            <p>
              {p.title} · {quantity > 1 ? `${quantity} × ` : ""}
              {p.portion}
            </p>
            <strong>
              {money(total(p, quantity))} {done ? "released" : "held"}
            </strong>
            <div className="shared-edge" />
          </div>
          {reported ? (
            <>
              <Row
                title={r.report?.reason || "Problem reported"}
                detail={r.report?.note || "No additional details."}
              />
              <p className="notice">
                Our team is looking into it. Your payment stays held until it’s
                resolved.
              </p>
              <Button kind="secondary" onClick={() => go("/chat/" + p.id)}>
                Message {p.host}
              </Button>
            </>
          ) : done ? (
            <>
              <div className="panel">
                <h3>Your receipt</h3>
                <PriceRows p={p} quantity={quantity} />
                <p className="fine">Paid with {r.method}</p>
              </div>
              {r.rating && (
                <div className="panel">
                  <h3>Your review · {r.rating} / 5</h3>
                  {r.reviewComment && (
                    <p className="review-comment">{r.reviewComment}</p>
                  )}
                </div>
              )}
              <Button onClick={() => open({ kind: "rating", id: p.id })}>
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
                  {requested
                    ? `Hosts check your profile and ratings before accepting. Your ${portions} ${quantity > 1 ? "are" : "is"} held for you meanwhile, and if ${p.host} declines, your hold is released straight away.`
                    : ready
                      ? `Meet ${p.host}, check your sealed item, then scan their pickup code.`
                      : `${p.host} buys the bundle by ${buyBy(p)} ${p.date.toLowerCase()} and lets you know when it’s ready. If they don’t buy in time, your hold is released automatically.`}
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
                  ready
                    ? go("/problem/" + p.id)
                    : open({ kind: "cancel", id: p.id })
                }
              >
                {ready
                  ? "Report a problem"
                  : requested
                    ? "Cancel request"
                    : "Cancel reservation"}
              </button>
            </>
          )}
          {/* Secondary extras come after the pickup details and actions. */}
          <Row
            title={p.host + "’s profile"}
            detail="View neighbour and reviews"
            onClick={() => go("/neighbour/" + hostPerson(p))}
          />
          <CompareButton item={p} kind="offer" />
        </div>
      </main>
      {!done && !reported && (
        <footer className="action-bar">
          <Button onClick={() => go(ready ? "/scan/" + p.id : "/splits")}>
            {ready ? `Collect my ${portions}` : "View my splits"}
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
  const r = state.reservations[p.id],
    quantity = quantityOf(r),
    amount = money(total(p, quantity));
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
      <main
        className={
          "page-scroll" + (kind === "scan" && scan ? " capture-page" : "")
        }
      >
        <div className="content">
          {kind === "receipt" ? (
            verified ? (
              <>
                <h2>Everything look right?</h2>
                <Row
                  title={p.title}
                  detail={(quantity > 1 ? `${quantity} × ` : "") + p.portion}
                />
                <PriceRows p={p} quantity={quantity} />
                <div className="notice">
                  Check the item and quantity before releasing {amount} to
                  complete your split.
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I received{" "}
                  {quantity > 1 ? `all ${quantity} portions` : "my portion"} in
                  the expected condition.
                </label>
                <Button
                  disabled={!confirmed}
                  onClick={() => {
                    update((s) => complete(s, p.id, confirmed));
                    sessionStorage.removeItem("sharelah-verified-" + p.id);
                    finish("/split/" + p.id);
                  }}
                >
                  Confirm &amp; release {amount}
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
            <div className={scan ? "capture-screen" : "scan-start"}>
              <h2>Scan {p.host}’s pickup code</h2>
              <p className="capture-intro">
                Scanning finds your portion. You’ll confirm receipt before
                payment is released.
              </p>
              {scan ? (
                <Camera
                  mode="qr"
                  onCode={accept}
                  extra={
                    <button
                      className="secondary"
                      aria-label="Enter pickup code instead"
                      onClick={() => go("/code/" + p.id, "Scan")}
                    >
                      <KeyRound size={19} aria-hidden="true" />
                      Enter code
                    </button>
                  }
                />
              ) : (
                <>
                  <Button onClick={() => setScan(true)}>
                    <CameraIcon />
                    Open camera
                  </Button>
                  <Button
                    kind="secondary"
                    onClick={() => go("/code/" + p.id, "Scan")}
                  >
                    Enter pickup code instead
                  </Button>
                </>
              )}
            </div>
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
        <div className="content problem-form">
          <h2>Let’s put this on hold.</h2>
          <p className="muted">
            Your payment stays held while we look into it. We usually reply
            within a day.
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
            <span>
              Anything else? <small>(optional)</small>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add the details that would help resolve this."
            />
          </label>
        </div>
      </main>
      <footer className="action-bar">
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
      </footer>
    </>
  );
}
export function Chat({ p }: { p: Product }) {
  const { state, update } = useStore(),
    end = useRef<HTMLDivElement>(null),
    messages = state.messages[p.id] || [],
    status = conversationStatus(state, p) ?? "Question",
    partner = chatPartner(state, p),
    neighbour = partner.name;
  // Typing stays local; the draft is saved after a pause and when leaving.
  const [draft, setDraft] = useState(() => state.drafts[p.id] || "");
  const saved = useRef(draft);
  const saveDraft = useRef((value: string) => {
    if (value === saved.current) return;
    saved.current = value;
    update((s) => ({ ...s, drafts: { ...s.drafts, [p.id]: value } }));
  });
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  useEffect(() => {
    const timer = window.setTimeout(() => saveDraft.current(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft]);
  useEffect(() => () => saveDraft.current(latestDraft.current), []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [messages.length]);
  function send(body: string) {
    if (!body.trim()) return;
    const asking = status === "Question" && !p.owner;
    saved.current = "";
    setDraft("");
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
    // Demo: the host answers a first question so the thread feels real.
    if (asking)
      window.setTimeout(
        () =>
          update((s) =>
            (s.messages[p.id] || []).some((m) => !m.mine)
              ? s
              : {
                  ...s,
                  messages: {
                    ...s.messages,
                    [p.id]: [
                      ...(s.messages[p.id] || []),
                      {
                        id: crypto.randomUUID(),
                        body: p.purchased
                          ? `Hi! Yes, I’ve already bought it. Reserve a portion and we can meet at ${p.place}.`
                          : `Hi! Yes, it’s still available. Reserve a portion and I’ll buy the bundle by ${buyBy(p)}.`,
                        mine: false,
                        time: new Date().toISOString(),
                      },
                    ],
                  },
                },
          ),
        1200,
      );
  }
  // [button label, message sent]
  const quickReplies =
    status === "Question"
      ? [
          ["Still available?", "Is this still available?"],
          ["Collect later?", "Could I collect a little later?"],
        ]
      : [
          ["I’m here", "I’m here."],
          ["5 mins late", "Running 5 minutes late."],
        ];
  return (
    <>
      <Header title={neighbour} item={p.title} />
      <main className="page-scroll chat-scroll">
        <div className="content">
          <Row
            title={"View " + neighbour.split(", ")[0] + "’s profile"}
            detail="Read reviews from split partners"
            onClick={() => go("/neighbour/" + (partner.id || "tom"))}
          />
          {status === "Question" ? (
            <Row
              title={p.title}
              detail={`Asking about this split · ${money(total(p))} per portion`}
              onClick={() => go("/offer/" + p.id)}
            />
          ) : (
            <Row
              title={p.title}
              detail={
                status === "Completed split"
                  ? `Completed split · ${p.date}`
                  : `Current split · ${p.portion}`
              }
            />
          )}
          {!messages.length && (
            <p className="muted">
              {status === "Question"
                ? `Ask ${neighbour} about the item, pack size or pickup before you reserve.`
                : "No messages yet. Arrange your pickup here."}
            </p>
          )}
          {messages.map((m) => (
            <div className={"bubble " + (m.mine ? "mine" : "")} key={m.id}>
              <p>{m.body}</p>
              <small>
                {new Date(m.time).toLocaleTimeString("en-SG", {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                {m.mine ? "· Sent" : ""}
              </small>
            </div>
          ))}
          <div ref={end} />
        </div>
      </main>
      <footer className="composer">
        <div className="quick-replies">
          {quickReplies.map(([label, message]) => (
            <button key={label} onClick={() => send(message)}>
              {label}
            </button>
          ))}
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
            placeholder={
              status === "Question"
                ? `Ask ${neighbour} a question`
                : "Write a message"
            }
            onChange={(e) => setDraft(e.target.value)}
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
      {/* The map takes the spare height so everything fits on one screen. */}
      <main className="page-scroll directions-page">
        <div className="content directions-stage">
          <TileMap products={[p]} selected={p.id} route={p.id} pickup />
          <div className="directions-info">
            <h2>{p.place}</h2>
            <p>{p.address}</p>
          </div>
          <div className="panel directions-facts">
            <div>
              <strong>
                {p.distance} m · about {Math.ceil(p.distance / 70)} minutes on
                foot
              </strong>
              <small>Estimated from your location</small>
            </div>
            <div>
              <strong>{p.date + " · " + p.time}</strong>
              {p.note && <small>{p.note}</small>}
            </div>
          </div>
        </div>
      </main>
      <footer className="action-bar">
        <div className="two-buttons">
          <Button kind="secondary" onClick={() => back()}>
            Back to split
          </Button>
          <a
            className="primary"
            href={
              "https://www.google.com/maps/dir/?api=1&destination=" +
              encodeURIComponent(p.address + ", Singapore") +
              "&travelmode=walking"
            }
            target="_blank"
            rel="noreferrer"
          >
            Walking directions
          </a>
        </div>
      </footer>
    </>
  );
}
