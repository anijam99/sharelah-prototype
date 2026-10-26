import { useState } from "react";
import { Flag, Info, Package, Store, Tag } from "lucide-react";
import { Pizza } from "./Pizza";
import { dealPrice } from "./dealCatalog";
import { useStore } from "./store";
import { Button, Empty, Header, Photo } from "./ui";
import { go } from "./router";
import { CompareButton } from "./Compare";
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
        <Empty title="Deal not found">This deal may have been removed.</Empty>
      </>
    );
  const canSplit = !d.sourceFile || (d.bundleCount && d.priceCents > 0);
  const saving =
      d.originalCents && d.priceCents > 0 && d.originalCents > d.priceCents
        ? Math.round((1 - d.priceCents / d.originalCents) * 100)
        : 0,
    each =
      d.bundleCount && d.bundleCount > 1 && d.priceCents > 0
        ? money(Math.round(d.priceCents / d.bundleCount))
        : null;
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
        <div className="content deal-page">
          <ReportedNotice
            reportKey={reportKey}
            edit={() => setReporting(true)}
          />
          {/* The photo leads: it's how neighbours check the price tag. */}
          <figure className="deal-cover">
            {d.photo ? (
              <Photo
                id={d.photo}
                alt={d.title + " · source photo"}
                className="deal-cover-photo"
                detail
              />
            ) : (
              <span className="deal-cover-empty" aria-hidden="true">
                <Tag size={40} />
              </span>
            )}
            <figcaption>
              <span className="deal-chip">
                {postedByYou(d)
                  ? "Posted by you"
                  : d.sourceFile
                    ? "Photographed deal"
                    : "Spotted by a neighbour"}
              </span>
              <span className="deal-chip quiet">
                Spotted{" "}
                {spottedLabel(d.createdAt).replace(/^Today|^Yesterday/, (m) =>
                  m.toLowerCase(),
                )}
              </span>
            </figcaption>
            {d.photo && d.sourceFile && (
              <a
                className="deal-cover-link"
                aria-label="Open full photo to check the price tag"
                href={photoSource(d.photo)}
                target="_blank"
                rel="noopener"
              >
                View price tag ↗
              </a>
            )}
          </figure>
          <section className="deal-summary" aria-label="Deal">
            <h2>{d.title}</h2>
            <p>
              <Store size={15} aria-hidden="true" />
              {d.store}
            </p>
            <p>
              <Package size={15} aria-hidden="true" />
              {d.portion} · {d.category}
            </p>
          </section>
          <section className="deal-price-card" aria-label="Price">
            <div className="deal-price-top">
              <span className="offer-type">
                {d.offerType || "Reported offer"}
              </span>
              {saving > 0 && (
                <span className="saving-pill">
                  Save {money(d.originalCents! - d.priceCents)} · {saving}%
                </span>
              )}
            </div>
            <div className="deal-price-main">
              <strong>
                {d.priceCents > 0 ? money(d.priceCents) : dealPrice(d)}
              </strong>
              {d.bundleCount && d.priceCents > 0 ? (
                <span>for {d.bundleCount}</span>
              ) : null}
              {d.originalCents ? (
                <del>{money(d.originalCents)}</del>
              ) : (
                <small>Original price not shown</small>
              )}
            </div>
            {each && (
              <div className="deal-split-line">
                <Pizza count={d.bundleCount!} taken={d.bundleCount! - 1} />
                <span>
                  Split it {d.bundleCount} ways
                  <small>Each person pays for one</small>
                </span>
                <strong>{each} each</strong>
              </div>
            )}
          </section>
          {d.terms && !d.demo && (
            <details className="panel price-details">
              <summary>Offer conditions</summary>
              <p>{d.terms}</p>
            </details>
          )}
          <p className="deal-tip">
            <Info size={16} aria-hidden="true" />
            <span>
              A price tip from a neighbour: buy it yourself
              {canSplit ? " or start a split" : ""}. Prices can change, so check
              in store.
            </span>
          </p>
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
