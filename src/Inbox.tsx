import { conversationStatus, statusLabel } from "./model";
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
          {(["Current split", "Completed split"] as const).map((status) => {
            const group = threads.filter(
              (p) => conversationStatus(state, p) === status,
            );
            return group.length ? (
              <section
                key={status}
                className="inbox-group"
                aria-label={
                  status === "Current split"
                    ? "Current conversations"
                    : "Completed conversations"
                }
              >
                <h2>
                  {status === "Current split"
                    ? "Current splits"
                    : "Completed splits"}
                </h2>
                {group.map((p) => (
                  <Row
                    key={p.id}
                    title={`${p.owner ? "Jerry" : p.host} · ${p.title}`}
                    detail={
                      <>
                        <span className="conversation-status">
                          {status} ·{" "}
                          {status === "Completed split"
                            ? p.date
                            : statusLabel(state.reservations[p.id])}
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
