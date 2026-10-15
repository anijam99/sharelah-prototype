import { Star } from "lucide-react";
import { Button, Empty, Header, Row } from "./ui";
import { useStore } from "./store";
import { go } from "./router";
import { people, profileSummary, reviewsFor, type PersonId } from "./people";

export function NeighbourDirectory() {
  const { state } = useStore();
  return (
    <>
      <Header title="Neighbours" />
      <main className="page-scroll">
        <div className="content">
          <h2>Meet your neighbours.</h2>
          <p className="muted">
            Get to know the person you’re sharing with and read their reviews.
          </p>
          {(["jerry", "tom"] as PersonId[]).map((id) => {
            const summary = profileSummary(state, id);
            return (
              <Row
                key={id}
                title={people[id].name + (id === "tom" ? " · You" : "")}
                detail={`${summary.average} ★ · ${summary.reviews} reviews · ${summary.completed} completed splits`}
                onClick={() => go("/neighbour/" + id)}
              >
                <span className="avatar neighbour-avatar">
                  {people[id].initials}
                </span>
              </Row>
            );
          })}
        </div>
      </main>
    </>
  );
}
export function NeighbourProfile({ id }: { id: string }) {
  const { state } = useStore();
  if (id !== "jerry" && id !== "tom")
    return (
      <>
        <Header title="Neighbour profile" />
        <Empty
          title="Neighbour not found"
          action={
            <Button onClick={() => go("/neighbours")}>Browse neighbours</Button>
          }
        >
          This profile is not available.
        </Empty>
      </>
    );
  const person = people[id];
  const summary = profileSummary(state, id);
  const reviews = reviewsFor(state, id);
  const listings = state.products.filter(
    (p) => (id === "tom" ? p.owner : !p.owner) && !p.closed,
  );
  return (
    <>
      <Header title={person.name + "’s profile"} />
      <main className="page-scroll">
        <div className="content">
          <div className="member-card neighbour-card">
            <span className="eyebrow">
              BUGIS NEIGHBOUR{id === "tom" ? " · YOU" : ""}
            </span>
            <div className="member-name">
              <span className="avatar">{person.initials}</span>
              <h2>{person.name}</h2>
            </div>
            <p>{person.bio}</p>
            <div className="shared-edge" />
          </div>
          <div className="profile-stats neighbour-stats">
            <div>
              <strong>{summary.average} ★</strong>
              <span>{summary.reviews} reviews</span>
            </div>
            <div>
              <strong>{summary.completed}</strong>
              <span>Completed splits</span>
            </div>
          </div>
          <div className="section-heading">
            <h2>Reviews</h2>
            <span className="fine">From split partners</span>
          </div>
          {!reviews.length && (
            <p className="muted">
              No reviews yet. Reviews appear after completed splits.
            </p>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="panel neighbour-review">
              <div className="review-byline">
                <button
                  className="text-button"
                  onClick={() => go("/neighbour/" + r.author)}
                >
                  {people[r.author].name}
                </button>
                <span
                  className="review-stars"
                  role="img"
                  aria-label={r.rating + " out of 5 stars"}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i < r.rating ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
              {r.comment ? (
                <p className="review-comment">{r.comment}</p>
              ) : (
                <p className="fine">Star rating only</p>
              )}
              <small>
                {r.split} ·{" "}
                {new Date(r.date).toLocaleDateString("en-SG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {r.sample ? " · Sample review" : " · Your review"}
              </small>
            </article>
          ))}
          <h2>{id === "tom" ? "Your listings" : "Splits hosted by Jerry"}</h2>
          {listings.map((p) => (
            <Row
              key={p.id}
              title={p.title}
              detail={p.portion}
              onClick={() =>
                go(
                  "/" +
                    (p.owner
                      ? "hosting"
                      : state.reservations[p.id] &&
                          state.reservations[p.id].status !== "cancelled"
                        ? "split"
                        : "offer") +
                    "/" +
                    p.id,
                )
              }
            />
          ))}
          {!listings.length && <p className="muted">No open listings yet.</p>}
          <p className="fine">
            Profiles and sample reviews are part of this demo. Reviews you add
            are saved on this device.
          </p>
        </div>
      </main>
    </>
  );
}
