import type { ReactNode } from "react";
import { Star, TriangleAlert } from "lucide-react";
import { Pizza } from "./Pizza";
import { useStore } from "./store";
import { Button, Header, PriceRows, QRCode, Row, useNow } from "./ui";
import { go } from "./router";
import { isPerson, people, profileSummary, reviewsFor } from "./people";
import type { OpenModal } from "./Modals";
import {
  acceptJoiner,
  declineJoiner,
  joinersOf,
  simulatePurchase,
  type JoinRequest,
  type Product,
} from "./model";

/** Tom's view of a split he hosts: review who joins, then buy and hand over. */
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
    now = useNow(),
    requests = joinersOf(state, p.id, now),
    pending = requests.filter((r) => r.status === "requested"),
    accepted = requests.filter((r) => r.status === "accepted");
  return (
    <>
      <Header
        title={published ? "Split published" : "Your split"}
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
                ? "This split is closed."
                : p.purchased
                  ? "Ready to share."
                  : pending.length
                    ? pending.length === 1
                      ? "Someone wants to join."
                      : `${pending.length} neighbours want to join.`
                    : accepted.length
                      ? accepted.length === 1
                        ? "Your neighbour is in."
                        : "Your neighbours are in."
                      : "Your split is live."}
            </h2>
            <p>
              {p.title} · {p.available} of {p.shareCount} portions available
            </p>
            <div className="shared-edge" />
          </div>
          {!p.closed && pending.length > 0 && (
            <section className="joiner-section" aria-label="Requests to join">
              <h3>Requests to join</h3>
              <p className="fine">
                Check each neighbour’s rating and reviews. Only people you
                accept can pay and collect.
              </p>
              {pending.map((r) => (
                <JoinerCard key={r.person} request={r}>
                  <div className="two-buttons">
                    <Button
                      kind="secondary"
                      onClick={() =>
                        update((s) => declineJoiner(s, p.id, r.person))
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      disabled={p.available < r.quantity}
                      onClick={() =>
                        update((s) => acceptJoiner(s, p.id, r.person))
                      }
                    >
                      {p.available < r.quantity ? "No portions left" : "Accept"}
                    </Button>
                  </div>
                </JoinerCard>
              ))}
            </section>
          )}
          {accepted.length > 0 && (
            <section className="joiner-section" aria-label="In this split">
              <h3>In this split</h3>
              {accepted.map((r) => (
                <JoinerCard key={r.person} request={r}>
                  <p className="fine">
                    {p.purchased
                      ? "Ready for pickup"
                      : "Waiting for you to buy"}
                  </p>
                  {!p.purchased && !p.closed && (
                    <button
                      className="text-button"
                      onClick={() =>
                        open({
                          kind: "remove-joiner",
                          id: p.id,
                          person: r.person,
                        })
                      }
                    >
                      Remove from split
                    </button>
                  )}
                </JoinerCard>
              ))}
              <Button kind="secondary" onClick={() => go("/chat/" + p.id)}>
                Message{" "}
                {accepted.length === 1 ? nameOf(accepted[0]) : "everyone"}
              </Button>
            </section>
          )}
          {!p.closed && !requests.length && (
            <p className="muted">
              No requests yet. Neighbours nearby can see your split now, and
              you’ll review each request before anyone joins.
            </p>
          )}
          <Row title={p.title} detail={p.portion} />
          <div className="panel">
            <PriceRows p={p} />
          </div>
          <Row title={p.place} detail={p.date + " · " + p.time} />
          {!p.closed && p.purchased && (
            <div className="panel center">
              <h3>Your pickup code</h3>
              <p>Show this after your neighbour has checked their item.</p>
              <QRCode value={`sharelah:pickup:${p.id}:${p.code}`} />
              <strong className="pickup-number">{p.code}</strong>
            </div>
          )}
          {!p.closed && !p.purchased && accepted.length > 0 && (
            <Button onClick={() => update((s) => simulatePurchase(s, p.id))}>
              Mark purchased &amp; notify
            </Button>
          )}
          {!p.closed && !p.purchased && (
            <Button
              kind="secondary"
              onClick={() => open({ kind: "close-split", id: p.id })}
            >
              Close split
            </Button>
          )}
        </div>
      </main>
    </>
  );
}

const nameOf = (r: JoinRequest) =>
  isPerson(r.person) ? people[r.person].name.split(" ")[0] : "Neighbour";

/** Who is asking: enough reputation to decide without opening their profile. */
function JoinerCard({
  request,
  children,
}: {
  request: JoinRequest;
  children: ReactNode;
}) {
  const { state } = useStore();
  if (!isPerson(request.person)) return null;
  const person = people[request.person],
    summary = profileSummary(state, request.person),
    latest = reviewsFor(state, request.person)[0],
    low = summary.reviews > 0 && Number(summary.average) < 3.5;
  return (
    <article className={"panel joiner-card" + (low ? " low" : "")}>
      <button
        className="joiner-who"
        onClick={() => go("/neighbour/" + request.person)}
        aria-label={`${person.name}, ${summary.average} stars from ${summary.reviews} reviews. View profile`}
      >
        <span className="avatar neighbour-avatar">{person.initials}</span>
        <span>
          <strong>{person.name}</strong>
          <small>
            <Star size={13} fill="currentColor" aria-hidden="true" />{" "}
            {summary.average} · {summary.reviews} reviews · {summary.completed}{" "}
            splits
          </small>
        </span>
        <span className="joiner-portions">
          {request.quantity} {request.quantity === 1 ? "portion" : "portions"}
        </span>
      </button>
      {low && (
        <p className="joiner-warning">
          <TriangleAlert size={16} aria-hidden="true" />
          Below-average rating. Read their reviews before accepting.
        </p>
      )}
      {latest?.comment && (
        <blockquote className="joiner-review">
          “{latest.comment}”
          <small>
            {latest.rating}★ from {people[latest.author].name.split(" ")[0]}
          </small>
        </blockquote>
      )}
      {children}
    </article>
  );
}
