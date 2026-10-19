import { conversationStatus, statusLabel } from "./model";
import { chatPartner } from "./people";

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
  return (
    <>
      <Header title="Messages" />
      <main className="page-scroll">
        <div className="content">
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
          {!threads.length && (
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
