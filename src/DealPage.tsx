import { useState } from "react";
import { Flag } from "lucide-react";
import { useStore } from "./store";
import { Button, Empty, Header, Photo } from "./ui";
import { go } from "./router";
import { CompareButton } from "./Compare";
import { DealPrice } from "./DealPrice";
import { photoSource } from "./dealPhotos";
import { ReportButton, ReportedNotice, ReportSheet } from "./ReportListing";
import { money, postedByYou, spottedLabel, type Deal } from "./model";

export function DealPage({ id }: { id: string }) {
  const { state, update } = useStore(),
    [reporting, setReporting] = useState(false),
    d = state.deals.find((d) => d.id === id),
    reportKey = "deal:" + id,
    reported = !!state.reports?.[reportKey];
  if (!d)
    return (
      <>
        <Header title="Spotted deal" />
        <Empty title="Deal not found">
          This deal may have been cleared when the demo was reset.
        </Empty>
      </>
    );
  const canSplit = !d.sourceFile || (d.bundleCount && d.priceCents > 0);
  return (
    <>
      <Header
        title="Spotted deal"
        action={
          <ReportButton
            noun="deal"
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
          <section className="deal-hero" aria-label="Deal">
            <span className="eyebrow brand-text">
              {postedByYou(d)
                ? "POSTED BY YOU"
                : d.sourceFile
                  ? "PHOTOGRAPHED DEAL"
                  : "SAMPLE DEAL"}
            </span>
            <h2>{d.title}</h2>
            <DealPrice deal={d} />
          </section>
          <div className="fact-grid">
            <div className="fact">
              <small>Store</small> <strong>{d.store}</strong>{" "}
              <span>{d.sourceFile ? "Branch from photo" : d.area}</span>
            </div>
            <div className="fact">
              <small>Pack</small> <strong>{d.portion}</strong>{" "}
              <span>{d.category}</span>
            </div>
            {d.bundleCount && d.priceCents > 0 ? (
              <div className="fact">
                <small>Per item</small>{" "}
                <strong>
                  {money(Math.floor(d.priceCents / d.bundleCount))}
                </strong>{" "}
                <span>If you split it {d.bundleCount} ways</span>
              </div>
            ) : null}
            <div className="fact">
              <small>Spotted</small>{" "}
              <strong>{spottedLabel(d.createdAt)}</strong>{" "}
              <span>
                {d.createdAt
                  ? new Date(d.createdAt).toLocaleDateString("en-SG", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Not dated"}
              </span>
            </div>
          </div>
          <p className="fine trust-line">
            Spotted deals are price tips: buy it yourself in store
            {canSplit ? ", or start a split to share the bundle" : ""}. Prices
            can change, so check before you go.
          </p>
          {d.terms && !d.demo && (
            <details className="panel price-details" open>
              <summary>Offer conditions</summary>
              <p>{d.terms}</p>
            </details>
          )}
          {d.photo && (
            <figure className="deal-photo">
              <Photo
                id={d.photo}
                alt={d.title + " · source photo"}
                className="reported-photo"
                detail
              />
              {d.sourceFile && (
                <a
                  className="text-button"
                  href={photoSource(d.photo)}
                  target="_blank"
                  rel="noopener"
                >
                  Open full photo to check the price tag ↗
                </a>
              )}
            </figure>
          )}
          <CompareButton item={d} kind="deal" />
          <button className="report-row" onClick={() => setReporting(true)}>
            <Flag size={16} aria-hidden="true" />
            {reported
              ? "You reported this deal · Edit report"
              : "Expired or not genuine? Report this deal"}
          </button>
        </div>
      </main>
      <footer className="action-bar">
        {canSplit ? (
          <Button
            onClick={() => {
              update((s) => ({ ...s, createDraft: draftFromDeal(d) }));
              go("/create/1");
            }}
          >
            Start a split from this deal
          </Button>
        ) : (
          <Button kind="secondary" onClick={() => go("/deals")}>
            Browse spotted deals
          </Button>
        )}
      </footer>
      {reporting && (
        <ReportSheet
          reportKey={reportKey}
          title={d.title}
          noun="deal"
          close={() => setReporting(false)}
        />
      )}
    </>
  );
}

function draftFromDeal(d: Deal) {
  return {
    title: d.title,
    portion: d.unitPortion || d.portion,
    bundleCount: d.bundleCount || 2,
    shareCount: 1,
    store: d.store,
    category: d.category,
    photo: d.photo,
    bundleCents: d.priceCents,
    sourceDealId: d.id,
    retailCents: d.originalCents
      ? Math.floor(d.originalCents / (d.bundleCount || 1))
      : 0,
  };
}
