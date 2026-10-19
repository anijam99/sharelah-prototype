import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "./store";
import { Button, Header, QRCode, Row, TopHeader } from "./ui";
import { go } from "./router";
import { NeighbourProfile } from "./NeighbourProfiles";
import { profileSummary } from "./people";
import type { OpenModal } from "./Modals";
import {
  acceptRequest,
  cancelReservation,
  completedSavings,
  money,
  postedByYou,
  quantityOf,
  savingFor,
  simulatePurchase,
} from "./model";

export function Profile({
  section,
  open,
  testingControls,
}: {
  section?: string;
  open: OpenModal;
  testingControls?: ReactNode;
}) {
  if (section === "trust") return <NeighbourProfile id="tom" />;
  if (!section) return <ProfileHome />;
  return (
    <>
      <Header
        title={
          section === "testing"
            ? "Testing controls"
            : section === "savings"
              ? "Your savings"
              : "Your deals"
        }
      />
      <main className="page-scroll">
        <div className="content">
          {section === "testing" ? (
            <TestingSection open={open}>{testingControls}</TestingSection>
          ) : section === "savings" ? (
            <SavingsSection />
          ) : (
            <ActivitySection />
          )}
        </div>
      </main>
    </>
  );
}

function ProfileHome() {
  const { state } = useStore(),
    savings = completedSavings(state),
    summary = profileSummary(state, "tom"),
    posted = state.deals.filter(postedByYou).length;
  return (
    <>
      <TopHeader title="Profile" />
      <main className="page-scroll">
        <div className="content">
          <div className="member-card">
            <span className="eyebrow">SHARELAH NEIGHBOUR</span>
            <div className="member-name">
              <span className="avatar">
                {state.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <h2>{state.name}</h2>
            </div>
            <button onClick={() => go("/neighbour/tom")}>
              {summary.reviews
                ? `${summary.average} ★ · View your reviews ›`
                : "No reviews yet · View your profile ›"}
            </button>
            <img src="/assets/brand.svg" alt="" />
            <div className="shared-edge" />
          </div>
          <div className="profile-stats">
            <button onClick={() => go("/profile/savings")}>
              <strong>{money(savings)}</strong>
              <span>Total saved</span>
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem("sharelah-splits-tab", "Past");
                go("/splits");
              }}
            >
              <strong>{summary.completed}</strong>
              <span>Completed splits</span>
            </button>
          </div>
          <Row
            title="Neighbour profiles"
            detail="Meet Jerry and read neighbour reviews"
            onClick={() => go("/neighbours")}
          />
          <Row
            title="Saved splits"
            detail={state.saved.length + " saved for later"}
            onClick={() => go("/saved")}
          />
          <Row
            title="Messages"
            detail="Questions and pickup chats"
            onClick={() => go("/messages")}
          />
          <Row
            title={
              posted
                ? `${posted} ${posted === 1 ? "deal" : "deals"} posted`
                : "Your spotted deals"
            }
            detail={
              posted
                ? "Prices you’ve shared with the neighbourhood"
                : "Post a good price you’ve seen in store"
            }
            onClick={() => go("/profile/activity")}
          />
          <Row
            title="Testing controls"
            detail="Reset demo and explore other states"
            onClick={() => go("/profile/testing")}
          />
        </div>
      </main>
    </>
  );
}

function TestingSection({
  open,
  children,
}: {
  open: OpenModal;
  children: ReactNode;
}) {
  const { state, update } = useStore();
  return (
    <>
      {children}
      <Button kind="secondary" onClick={() => open({ kind: "reset" })}>
        <RotateCcw size={18} /> Reset my demo
      </Button>
      <h3>Pickup codes</h3>
      {state.products
        .filter((p) =>
          ["requested", "reserved", "ready", "reported"].includes(
            state.reservations[p.id]?.status,
          ),
        )
        .map((p) => (
          <div className="panel" key={p.id}>
            <h3>{p.title}</h3>
            <QRCode value={`sharelah:pickup:${p.id}:${p.code}`} />
            <strong className="pickup-number">{p.code}</strong>
            {state.reservations[p.id].status === "requested" && (
              <>
                <Button onClick={() => update((s) => acceptRequest(s, p.id))}>
                  Simulate host accepting
                </Button>
                <Button
                  kind="secondary"
                  onClick={() =>
                    update((s) => cancelReservation(s, p.id, "declined"))
                  }
                >
                  Simulate host declining
                </Button>
              </>
            )}
            {state.reservations[p.id].status === "reserved" && (
              <>
                <Button
                  onClick={() => update((s) => simulatePurchase(s, p.id))}
                >
                  Simulate host purchase
                </Button>
                <Button
                  kind="secondary"
                  onClick={() =>
                    update((s) => cancelReservation(s, p.id, "lapsed"))
                  }
                >
                  Simulate missed buy-by time
                </Button>
                <Button
                  kind="secondary"
                  onClick={() =>
                    update((s) => cancelReservation(s, p.id, "removed"))
                  }
                >
                  Simulate host removing you
                </Button>
              </>
            )}
          </div>
        ))}
      <p className="fine">
        Messages, reservations and photographs are stored locally. Camera and QR
        decoding are real. Payments and other people’s actions are simulated.
      </p>
    </>
  );
}

function SavingsSection() {
  const { state } = useStore(),
    savings = completedSavings(state);
  return (
    <>
      <div className="status-hero">
        <span className="eyebrow">SMALL SPLITS ADD UP</span>
        <h2>{money(savings)}</h2>
        <p>Total saved through sharing</p>
        <div className="shared-edge" />
      </div>
      {state.products
        .filter((p) => state.reservations[p.id]?.status === "completed")
        .map((p) => (
          <Row
            key={p.id}
            title={p.title}
            detail={p.date + " · Collected"}
            onClick={() => go("/split/" + p.id)}
          >
            {money(savingFor(p, quantityOf(state.reservations[p.id])))}
          </Row>
        ))}
    </>
  );
}

function ActivitySection() {
  const { state } = useStore(),
    posted = state.deals.filter(postedByYou);
  return (
    <>
      <h2>A good eye for a good deal.</h2>
      {posted.map((d) => (
        <Row
          title={d.title}
          detail={"Spotted at " + d.store}
          key={d.id}
          onClick={() => go("/deal/" + d.id)}
        />
      ))}
      {!posted.length && (
        <p className="muted">
          Seen a good price in store? Post it so neighbours can buy it too, or
          start a split from it.
        </p>
      )}
      <Button kind="secondary" onClick={() => go("/report-deal")}>
        Post a spotted deal
      </Button>
    </>
  );
}
