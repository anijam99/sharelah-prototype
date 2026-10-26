import { useEffect, useState, type ReactNode } from "react";
import { Compare } from "./Compare";
import { PrototypeLab, useMobileLayout } from "./PrototypeLab";
import { Inbox } from "./Inbox";
import { NeighbourDirectory, NeighbourProfile } from "./NeighbourProfiles";
import { Deals } from "./Deals";
import { DealPage } from "./DealPage";
import { Profile } from "./Profile";
import { Modals, type Modal } from "./Modals";
import {
  ReservationCountdown,
  confirmationVariant,
  type ConfirmationVariant,
} from "./ReservationCountdown";
import { Provider, useStore } from "./store";
import { Header, Button, Empty, Icon, AlertBadge } from "./ui";
import { Home, MapScreen, Splits, type HomeVariant } from "./Browse";
import { Hosting } from "./Hosting";
import { Chat, Directions, MySplit, Offer, Pickup, Problem } from "./Journey";
import { Create, createVariant, type CreateVariant } from "./Create";
import { go, parseRoute, useRoute } from "./router";
import { nextArrival, pendingRequests, readyAlerts } from "./model";
import { Study, StudyPanel, useStudy } from "./Study";
import { studyRoute } from "./studyData";

function Navigation({
  active,
  openCreate,
  combinedHome = false,
  requests = 0,
  ready = 0,
}: {
  active: string;
  openCreate: () => void;
  combinedHome?: boolean;
  /** Join requests waiting on the Splits tab. */
  requests?: number;
  /** Joined portions that just became ready to collect. */
  ready?: number;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {[
        ["home", "Home", "/"],
        ["map", "Map", "/map"],
        ["plus", "Share", ""],
        ["splits", "Splits", "/splits"],
        ["profile", "Profile", "/profile"],
      ]
        .filter(([icon]) => !combinedHome || icon !== "map")
        .map(([icon, label, path]) => (
          <button
            key={label}
            onClick={() => (path ? go(path) : openCreate())}
            className={
              (active === icon ? "active " : "") +
              (icon === "plus" ? "create-nav" : "")
            }
            aria-current={active === icon ? "page" : undefined}
          >
            <span>
              <Icon name={icon} />
              {icon === "splits" && (
                <AlertBadge count={requests} ready={ready} />
              )}
            </span>
            <small>{label}</small>
          </button>
        ))}
    </nav>
  );
}

function useStoredVariant<T extends string>(
  key: string,
  parse: (value: string | null) => T,
) {
  const [value, setValue] = useState<T>(() => parse(localStorage.getItem(key)));
  return [
    value,
    (next: T) => {
      setValue(next);
      localStorage.setItem(key, next);
    },
  ] as const;
}

/** Re-render when the next scheduled join request arrives, so badges appear on time. */
function useArrivals() {
  const { state } = useStore(),
    [, tick] = useState(0),
    next = nextArrival(state);
  useEffect(() => {
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(
      () => tick((n) => n + 1),
      Math.max(0, next - Date.now()) + 50,
    );
    return () => window.clearTimeout(timer);
  }, [next]);
}

function Root() {
  useArrivals();
  const mobile = useMobileLayout();
  const path = useRoute(),
    { state, storageError } = useStore(),
    [modal, setModal] = useState<Modal | null>(null);
  const [variant, selectVariant] = useStoredVariant<ConfirmationVariant>(
    "sharelah-confirmation-variant",
    confirmationVariant,
  );
  const [homeVariant, setHomeVariant] = useStoredVariant<HomeVariant>(
    "sharelah-home-variant",
    (v) => (v === "B" || v === "C" ? v : "A"),
  );
  const [storedLayout, selectCreateLayout] = useStoredVariant<CreateVariant>(
    "sharelah-create-variant",
    createVariant,
  );
  // On /a and /b the study decides which start-a-split layout is shown.
  const [study, setStudy] = useStudy(studyRoute());
  const createLayout = study ? study.rounds[study.current].ui : storedLayout;
  // The task panel appears once the welcome and "about you" screens are done.
  const showPanel =
    !!study && study.phase !== "welcome" && study.phase !== "profile";
  function selectHomeVariant(value: HomeVariant) {
    setHomeVariant(value);
    if (path === "/map" && value !== "A") go("/", undefined, true);
  }
  useEffect(() => {
    setModal(null);
  }, [path]);
  const { page, id, extra, params } = parseRoute(path),
    p = state.products.find((p) => p.id === id);
  const tab = ["", "map", "splits", "profile"].includes(page) && !id;
  const testingPage = page === "profile" && id === "testing";
  const lab = (
    <PrototypeLab
      variant={variant}
      selectVariant={selectVariant}
      homeVariant={homeVariant}
      selectHomeVariant={selectHomeVariant}
      createLayout={createLayout}
      selectCreateLayout={selectCreateLayout}
      open={setModal}
      locked={page === "holding"}
      embedded={testingPage}
    />
  );
  const active =
    page === "map" && homeVariant === "A"
      ? "map"
      : page === "splits" || page === "profile"
        ? page
        : "home";

  let screen: ReactNode;
  if (!page || (page === "map" && homeVariant !== "A"))
    screen = <Home key={homeVariant} open={setModal} layout={homeVariant} />;
  else if (page === "map") screen = <MapScreen open={setModal} />;
  else if (page === "splits") screen = <Splits />;
  else if (page === "neighbours") screen = <NeighbourDirectory />;
  else if (page === "neighbour") screen = <NeighbourProfile id={id} />;
  else if (page === "profile")
    screen = (
      <Profile
        section={id}
        open={setModal}
        testingControls={testingPage ? lab : undefined}
      />
    );
  else if (page === "search" || page === "saved")
    screen = (
      <>
        <Header title={page === "search" ? "Search" : "Saved splits"} />
        <Home
          open={setModal}
          search={page === "search"}
          saved={page === "saved"}
        />
      </>
    );
  else if (page === "messages") screen = <Inbox />;
  else if (page === "create" || page === "capture" || page === "report-deal")
    screen = (
      <Create
        key={page === "create" ? "create" : page}
        mode={
          page === "report-deal"
            ? "deal"
            : page === "capture"
              ? "camera"
              : "split"
        }
        stage={
          page === "create" ? Math.min(4, Math.max(1, Number(id) || 1)) : 1
        }
        layout={createLayout}
      />
    );
  else if (page === "compare") {
    const item =
      id === "deal"
        ? state.deals.find((d) => d.id === extra)
        : state.products.find((p) => p.id === extra);
    if (item) screen = <Compare key={id + extra} item={item} />;
  } else if (page === "deals") screen = <Deals />;
  else if (page === "deal") screen = <DealPage id={id} />;
  else if (p) {
    if (page === "holding")
      screen = <ReservationCountdown key={p.id} p={p} variant={variant} />;
    if (page === "offer") screen = <Offer p={p} open={setModal} />;
    if (page === "split") screen = <MySplit p={p} open={setModal} />;
    if (page === "scan" || page === "code" || page === "receipt")
      screen = <Pickup key={page + id} p={p} kind={page} />;
    if (page === "problem") screen = <Problem p={p} />;
    if (page === "chat") screen = <Chat p={p} />;
    if (page === "directions") screen = <Directions p={p} />;
    if (page === "hosting")
      screen = (
        <Hosting
          p={p}
          open={setModal}
          published={params.get("published") === "1"}
        />
      );
  }
  return (
    <div className="app-layout">
      {!mobile && !testingPage && !study && lab}
      <section className="app-frame">
        {storageError && (
          <div className="storage-error" role="alert">
            {storageError}
          </div>
        )}
        {screen || (
          <>
            <Header title="Page not found" />
            <Empty
              title="Let’s head home."
              action={<Button onClick={() => go("/")}>Go to Home</Button>}
            >
              This screen is no longer available.
            </Empty>
          </>
        )}
        {study && mobile && showPanel && <StudyPanel study={study} compact />}
        {study && <Study study={study} setStudy={setStudy} path={path} />}
        {tab && (
          <Navigation
            active={active}
            openCreate={() => setModal({ kind: "create" })}
            requests={pendingRequests(state).length}
            ready={readyAlerts(state).length}
            combinedHome={homeVariant !== "A"}
          />
        )}
      </section>
      {study && !mobile && showPanel && (
        <StudyPanel study={study} compact={false} />
      )}
      {modal && (
        <Modals
          key={JSON.stringify(modal)}
          modal={modal}
          close={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider>
      <Root />
    </Provider>
  );
}
