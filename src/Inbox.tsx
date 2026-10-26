import {
  conversationStatus,
  pendingRequests,
  readyAlerts,
  statusLabel,
} from "./model";
import { chatPartner, isPerson, people, profileSummary } from "./people";

const groups = {
  "Current split": "Current splits",
  Question: "Questions to hosts",
  "Completed split": "Completed splits",
} as const;
import { go } from "./router";
import { useStore } from "./store";
import { Empty, Header, Row } from "./ui";

export function Inbox() {
  const { state } = useStore();
  const threads = state.products.filter(
    (p) => conversationStatus(state, p) && state.messages[p.id]?.length,
  );
  const requests = pendingRequests(state),
    ready = readyAlerts(state);
  return (
    <>
      <Header title="Messages" />
      <main className="page-scroll">
        <div className="content">
          {ready.length > 0 && (
            <section className="inbox-group" aria-label="Ready to collect">
              <h2>Ready to collect</h2>
              {ready.map((p) => (
                <Row
                  key={p.id}
                  title={
                    <>
                      <b className="alert-badge inline" aria-hidden="true">
                        !
                      </b>{" "}
                      {p.host} bought the bundle
                    </>
                  }
                  detail={
                    <>
                      <span className="conversation-status">{p.title}</span>
                      <span className="conversation-preview">
                        Your portion is ready · {p.place}, {p.time}
                      </span>
                    </>
                  }
                  onClick={() => go("/split/" + p.id)}
                />
              ))}
            </section>
          )}
          {requests.length > 0 && (
            <section className="inbox-group" aria-label="Join requests">
              <h2>Join requests</h2>
              {requests.map(({ p, request }) => (
                <Row
                  key={p.id + request.person}
                  title={
                    <>
                      <b className="alert-badge inline" aria-hidden="true">
                        !
                      </b>{" "}
                      {isPerson(request.person)
                        ? people[request.person].name
                        : "A neighbour"}{" "}
                      asked to join
                    </>
                  }
                  detail={
                    <>
                      <span className="conversation-status">
                        {p.title}
                        {isPerson(request.person)
                          ? ` · ${profileSummary(state, request.person).average} ★`
                          : ""}
                      </span>
                      <span className="conversation-preview">
                        Accept or decline before they can pay
                      </span>
                    </>
                  }
                  onClick={() => go("/hosting/" + p.id)}
                />
              ))}
            </section>
          )}
          {(Object.keys(groups) as (keyof typeof groups)[]).map((status) => {
            const group = threads.filter(
              (p) => conversationStatus(state, p) === status,
            );
            return group.length ? (
              <section
                key={status}
                className="inbox-group"
                aria-label={groups[status]}
              >
                <h2>{groups[status]}</h2>
                {group.map((p) => (
                  <Row
                    key={p.id}
                    title={`${chatPartner(state, p).name} · ${p.title}`}
                    detail={
                      <>
                        <span className="conversation-status">
                          {status === "Question"
                            ? `Not reserved · ${p.available} of ${p.shareCount} left`
                            : `${status} · ${
                                status === "Completed split"
                                  ? p.date
                                  : statusLabel(state.reservations[p.id])
                              }`}
                        </span>
                        <span className="conversation-preview">
                          {state.messages[p.id].at(-1)?.body}
                        </span>
                      </>
                    }
                    onClick={() => go("/chat/" + p.id)}
                  />
                ))}
              </section>
            ) : null;
          })}
          {!threads.length && !requests.length && (
            <Empty title="No conversations yet">
              Your split conversations will appear here when you start
              messaging.
            </Empty>
          )}
        </div>
      </main>
    </>
  );
}
