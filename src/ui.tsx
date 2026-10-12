import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Check, Package } from "lucide-react";
import { back, go } from "./router";
import { readPhoto, useStore } from "./store";
import { svgIcons } from "./icons";
import { money, total, owned, statusLabel, type Product } from "./model";
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
}: {
  id: string;
  alt?: string;
  className?: string;
}) {
  const [url, setURL] = useState("");
  useEffect(() => {
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
  return url ? (
    <img src={url} alt={alt} className={className} />
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
}: {
  title: string;
  item?: string;
  label?: string;
  onBack?: () => void;
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
    </header>
  );
}
export function TopHeader({ title }: { title?: string }) {
  return (
    <header className="top-header">
      {title ? (
        <h1 tabIndex={-1}>{title}</h1>
      ) : (
        <a className="wordmark" href="#/">
          <img src="/assets/brand.svg" width="36" height="36" alt="" />
          sharelah.
        </a>
      )}
      {!title && (
        <div className="shortcuts">
          <button onClick={() => go("/saved")}>
            <Icon name="saved" />
            <span>Saved</span>
          </button>
          <button onClick={() => go("/messages")}>
            <Icon name="inbox" />
            <span>Inbox</span>
          </button>
        </div>
      )}
    </header>
  );
}
export function Row({
  title,
  detail,
  onClick,
  children,
}: {
  title: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const content = (
    <>
      <span>
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
    joined = owned(r);
  return (
    <button
      className="offer-card"
      onClick={() =>
        go(
          "/" + (p.owner ? "hosting" : joined ? "split" : "offer") + "/" + p.id,
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
                  : "In your splits"}
            </span>
          )}
          {p.owner && <span className="membership">Your listing</span>}
        </div>
      </div>
      <div className="price-ticket">
        <strong>{money(total(p))} total</strong>
        <span>
          {p.owner
            ? "Manage split"
            : joined
              ? r.status === "completed"
                ? "View receipt"
                : "View my split"
              : "View details"}
        </span>
      </div>
      <div className="pickup-preview">
        <p>{p.place}</p>
        <small>
          {p.date} · {p.time}
          {joined ? " · " + statusLabel(r) : ""}
        </small>
      </div>
    </button>
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
export function PriceRows({ p }: { p: Product }) {
  return (
    <div className="price-rows">
      <div>
        <span>{p.portion}</span>
        <strong>{money(p.itemCents)}</strong>
      </div>
      <div>
        <span>Service fee</span>
        <strong>S$0.15</strong>
      </div>
      <div className="total">
        <strong>Your total</strong>
        <strong>{money(total(p))}</strong>
      </div>
      {p.retailCents > total(p) && (
        <p className="brand-text">
          You save {money(p.retailCents - total(p))} · Retail{" "}
          {money(p.retailCents)}
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
    ref.current?.showModal();
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
