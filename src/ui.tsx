import {
  useEffect,
  useRef,
  useState,
  useId,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Check, Package } from "lucide-react";
import { back, go } from "./router";
import { readPhoto, useStore } from "./store";
import { svgIcons } from "./icons";
import { isPerson, people, profileSummary } from "./people";
import {
  acceptedJoiners,
  buyBy,
  hostedComplete,
  joinersOf,
  money,
  pendingRequests,
  readyAlerts,
  owned,
  releasedByHost,
  savingFor,
  serviceFee,
  statusLabel,
  total,
  type Product,
} from "./model";
import { resolveDealPhoto } from "./dealPhotos";
/** The current time, refreshed on an interval, for things that arrive or expire. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}
export function Button({
  children,
  kind = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "danger";
}) {
  return (
    <button className={kind + " full"} {...props}>
      {children}
    </button>
  );
}
/** A count on a tab or shortcut of the items that need attention there. */
export function AlertBadge({
  count,
  ready = 0,
}: {
  count: number;
  /** Portions that just became ready to collect. */
  ready?: number;
}) {
  if (!count && !ready) return null;
  const parts = [
    count && `${count} join ${count === 1 ? "request" : "requests"}`,
    ready &&
      `${ready} ${ready === 1 ? "portion" : "portions"} ready to collect`,
  ].filter(Boolean);
  return (
    <>
      <b className="alert-badge" aria-hidden="true">
        {count + ready > 99 ? "99+" : count + ready}
      </b>
      <span className="sr-only">, {parts.join(", ")}</span>
    </>
  );
}
export function Icon({ name }: { name: string }) {
  return (
    <span
      className="figma-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svgIcons[name] || "" }}
    />
  );
}
export function Photo({
  id,
  alt = "Your deal photo",
  className = "",
  detail = false,
}: {
  id: string;
  alt?: string;
  className?: string;
  detail?: boolean;
}) {
  const [url, setURL] = useState("");
  const clipId = useId();
  const crop = resolveDealPhoto(id);
  useEffect(() => {
    if (id.startsWith("/assets/")) return;
    setURL("");
    let active = true,
      url = "";
    readPhoto(id)
      .then((blob) => {
        if (blob && active) {
          url = URL.createObjectURL(blob);
          setURL(url);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  if (crop) {
    const [x, y, width, height] = detail ? crop.detail : crop.thumbnail;
    return (
      <svg
        className={"cropped-photo " + className}
        viewBox={`${x} ${y} ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={alt}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={width} height={height} />
          </clipPath>
        </defs>
        <image
          href={crop.source}
          width={crop.width}
          height={crop.height}
          clipPath={`url(#${clipId})`}
        />
      </svg>
    );
  }
  const source = id.startsWith("/assets/") ? id : url;
  return source ? (
    <img src={source} alt={alt} className={className} loading="lazy" />
  ) : (
    <span className={"photo-placeholder " + className}>
      <Package aria-label="Photo unavailable" />
    </span>
  );
}
export function Art({
  p,
  large = false,
}: {
  p: Pick<Product, "art" | "photo" | "title">;
  large?: boolean;
}) {
  return (
    <div className={"product-art " + (large ? "large" : "")}>
      {p.photo ? (
        <Photo id={p.photo} alt={p.title} />
      ) : (
        <>
          <img className="stamp" src="/assets/stamp.svg" alt="" />
          <img
            className="packaging"
            src={"/assets/" + (p.art || "bag") + ".svg"}
            alt=""
          />
        </>
      )}
    </div>
  );
}
export function Header({
  title,
  item,
  label,
  onBack,
  action,
}: {
  title: string;
  item?: string;
  label?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <button className="back-button" onClick={onBack || (() => back())}>
        <ChevronLeft size={18} />
        {label || history.state?.label || "Home"}
      </button>
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {item && <p>{item}</p>}
      </div>
      {action}
    </header>
  );
}
/** The same brand bar on every tab; other tabs add their title beneath it. */
export function TopHeader({ title }: { title?: string }) {
  const { state } = useStore();
  return (
    <>
      <header className="top-header">
        <a className="wordmark" href="#/">
          <img src="/assets/brand.svg" width="36" height="36" alt="" />
          sharelah.
        </a>
        <div className="shortcuts">
          <button onClick={() => go("/saved")}>
            <Icon name="saved" />
            <span>Saved</span>
          </button>
          <button onClick={() => go("/messages")}>
            <Icon name="inbox" />
            <span>Inbox</span>
            <AlertBadge
              count={pendingRequests(state).length}
              ready={readyAlerts(state).length}
            />
          </button>
        </div>
      </header>
      {/* The tab bar already shows where you are, so the title is for
          screen readers only. */}
      {title && (
        <h1 className="sr-only" tabIndex={-1}>
          {title}
        </h1>
      )}
    </>
  );
}
export function Row({
  title,
  detail,
  onClick,
  children,
  icon,
}: {
  title: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  /** Optional leading icon, shown in a tinted circle. */
  icon?: ReactNode;
}) {
  const content = (
    <>
      {icon && (
        <span className="row-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={icon ? "row-text" : undefined}>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {children || (onClick && <ChevronRight size={20} />)}
    </>
  );
  return onClick ? (
    <button className="row-card" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="row-card">{content}</div>
  );
}
export function Card({ p }: { p: Product }) {
  const { state } = useStore(),
    r = state.reservations[p.id],
    joined = owned(r),
    released = releasedByHost(r),
    requests = p.owner
      ? joinersOf(state, p.id).filter((q) => q.status === "requested")
      : [];
  return (
    <button
      className="offer-card"
      onClick={() =>
        go(
          "/" +
            (p.owner ? "hosting" : joined || released ? "split" : "offer") +
            "/" +
            p.id,
        )
      }
      aria-label={"Open " + p.title}
    >
      <div className="product-line">
        <Art p={p} />
        <div>
          <h3>{p.title}</h3>
          <p>{p.portion}</p>
          {joined && (
            <span className="membership">
              <Check size={13} />
              {r.status === "completed"
                ? "Completed"
                : r.status === "reported"
                  ? "Report under review"
                  : r.status === "requested"
                    ? "Request sent"
                    : "In your splits"}
            </span>
          )}
          {p.owner && <span className="membership">Your split</span>}
        </div>
      </div>
      <div className="compact-offer-type">
        {state.deals.find((d) => d.id === p.sourceDealId)?.priceLabel ||
          `${p.bundleCount} items for ${money(p.bundleCents)}`}
      </div>
      <div className="compact-prices">
        <strong>{money(total(p))} total</strong>
        {p.retailCents > 0 ? (
          <del>{money(p.retailCents)}</del>
        ) : (
          <small>Retail unknown</small>
        )}
        {p.retailCents > total(p) && (
          <span className="saving-pill">
            Save {money(p.retailCents - total(p))} ·{" "}
            {Math.round((1 - total(p) / p.retailCents) * 100)}%
          </span>
        )}
        <ChevronRight size={16} aria-hidden="true" />
      </div>
      <div className="compact-pickup">
        <span>{p.place}</span>
        <small>
          {p.date} · {p.time}
        </small>
      </div>
      {p.owner && (!p.closed || hostedComplete(state, p)) && (
        <HostStrip p={p} requests={requests} />
      )}
      {!p.owner && r?.status === "ready" && r.readyAlert && (
        <span className="host-strip alert">
          <b aria-hidden="true">!</b>
          <span>
            <strong>{p.host} bought the bundle</strong>
            <small>Your portion is ready to collect</small>
          </span>
        </span>
      )}
      <span className="sr-only">
        Per portion, including {serviceFee} fee.{" "}
        {joined ? statusLabel(r) : "View details"}
      </span>
    </button>
  );
}
/** On a hosted split's card: who has asked or joined, without opening it. */
function HostStrip({
  p,
  requests,
}: {
  p: Product;
  requests: ReturnType<typeof joinersOf>;
}) {
  const { state } = useStore(),
    accepted = acceptedJoiners(state, p.id),
    nameOf = (person: string) =>
      isPerson(person) ? people[person].name : "A neighbour";
  if (hostedComplete(state, p))
    return (
      <span className="host-strip">
        <Check size={16} aria-hidden="true" />
        <span>
          <strong>Split complete</strong>
          <small>
            Collected by{" "}
            {accepted.map((r) => nameOf(r.person).split(" ")[0]).join(", ")}
          </small>
        </span>
      </span>
    );
  if (requests.length) {
    const first = requests[0].person,
      rating = isPerson(first) ? profileSummary(state, first).average : "—";
    return (
      <span className="host-strip alert">
        <b aria-hidden="true">!</b>
        <span>
          <strong>
            {requests.length === 1
              ? `${nameOf(first)} asked to join`
              : `${requests.length} neighbours asked to join`}
          </strong>
          <small>
            {requests.length === 1 ? `${rating} ★ · ` : ""}Tap to accept or
            decline
          </small>
        </span>
      </span>
    );
  }
  if (accepted.length)
    return (
      <span className="host-strip">
        <Check size={16} aria-hidden="true" />
        <span>
          <strong>
            {accepted.map((r) => nameOf(r.person).split(" ")[0]).join(", ")}{" "}
            joined
          </strong>
          <small>
            {p.purchased
              ? "Ready for pickup"
              : `Buy the bundle by ${buyBy(p)} ${p.date.toLowerCase()}`}
          </small>
        </span>
      </span>
    );
  return (
    <span className="host-strip quiet">
      <span>
        <small>No requests yet · neighbours nearby can see it</small>
      </span>
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <img src="/assets/bag.svg" alt="" width="92" height="77" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PriceRows({
  p,
  quantity = 1,
}: {
  p: Product;
  quantity?: number;
}) {
  const saving = savingFor(p, quantity);
  return (
    <div className="price-rows">
      <div>
        <span>
          {quantity > 1 ? `${quantity} × ` : ""}
          {p.portion}
        </span>
        <strong>{money(p.itemCents * quantity)}</strong>
      </div>
      <div>
        <span>Service fee</span>
        <strong>{serviceFee}</strong>
      </div>
      <div className="total">
        <strong>Your total</strong>
        <strong>{money(total(p, quantity))}</strong>
      </div>
      {saving > 0 && (
        <p className="brand-text">
          You save {money(saving)} · Retail {money(p.retailCents * quantity)}
        </p>
      )}
    </div>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    lastFocus.current = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    // Sit over the app frame wherever it is (a side panel can shift it).
    const frame = document.querySelector(".app-frame")?.getBoundingClientRect();
    if (dialog && frame && window.matchMedia("(min-width: 900px)").matches) {
      dialog.style.left = frame.left + "px";
      dialog.style.right = "auto";
      dialog.style.width = frame.width + "px";
      dialog.style.margin = "0";
    }
    return () => {
      ref.current?.close();
      lastFocus.current?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const b = e.currentTarget.getBoundingClientRect();
          if (
            e.clientY < b.top ||
            e.clientY > b.bottom ||
            e.clientX < b.left ||
            e.clientX > b.right
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="sheet-header">
        <h2>{title}</h2>
        <button aria-label="Close" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      <div className="sheet-content">{children}</div>
      {footer && <div className="sheet-footer">{footer}</div>}
    </dialog>,
    document.body,
  );
}
export function QRCode({ value }: { value: string }) {
  const [path, setPath] = useState(""),
    [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    import("./vendor/qr-code/index.js")
      .then((m) => {
        const qr = new m.default(-1, 1);
        qr.addData(value);
        qr.make();
        const n = qr.getModuleCount();
        let d = "";
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++)
            if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
        if (alive) {
          setCount(n + 8);
          setPath(d);
        }
      })
      .catch(() => {
        if (alive) {
          setCount(0);
          setPath("");
        }
      });
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <svg
      className="qr-code"
      viewBox={`0 0 ${count || 29} ${count || 29}`}
      role="img"
      aria-label="Pickup QR code"
    >
      <rect width="100%" height="100%" fill="white" />
      <path d={path} fill="#2B241D" />
    </svg>
  );
}
