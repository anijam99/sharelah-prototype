import { createPortal } from "react-dom";
import { Photo } from "./ui";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money, owned, total, type Product, type State } from "./model";

const DEAL_ORIGIN: L.LatLngTuple = [1.2992, 103.852];
// Campus Green, SMU: https://www.openstreetmap.org/way/1094090156
const DEMO_LOCATION: L.LatLngTuple = [1.29572, 103.85096];
// Sample pickup points, aligned to the seeded addresses rather than artwork pixels.
const PICKUPS: Record<string, L.LatLngTuple> = {
  yog: [1.2998, 103.8543],
  det: [1.2969, 103.8507],
  oat: [1.2963, 103.8501],
  berry: [1.299, 103.855],
  laurier: [1.3038, 103.8528],
  ribeye: [1.307, 103.849],
};
const position = (p: Product): L.LatLngTuple => {
  if (PICKUPS[p.id]) return PICKUPS[p.id];
  if (p.id.startsWith("sample-")) {
    const hash = [...p.id].reduce(
      (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
      0,
    );
    const angle = ((hash % 360) * Math.PI) / 180;
    return [
      DEAL_ORIGIN[0] + (Math.sin(angle) * p.distance) / 111320,
      DEAL_ORIGIN[1] + (Math.cos(angle) * p.distance) / 111290,
    ];
  }
  return DEAL_ORIGIN;
};
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function TileMap({
  products,
  reservations = {},
  selected,
  onSelect,
  recenter = 0,
  remember = false,
  pickup = false,
  radius,
}: {
  products: Product[];
  reservations?: State["reservations"];
  selected?: string;
  onSelect?: (id: string) => void;
  recenter?: number;
  remember?: boolean;
  pickup?: boolean;
  radius?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [photoPins, setPhotoPins] = useState<
    { product: Product; node: HTMLElement }[]
  >([]);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [tileError, setTileError] = useState(false);
  const tiles = useRef<{ retry: () => void; remove: () => void } | null>(null);
  const initial = useRef({ products, remember, pickup });

  useEffect(() => {
    if (!container.current) return;
    const config = initial.current;
    let center =
      config.pickup && config.products[0]
        ? position(config.products[0])
        : DEMO_LOCATION;
    let zoom = config.pickup ? 17 : 16;
    if (config.remember) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("sharelah-map-view") || "null",
        );
        if (
          saved &&
          Number.isFinite(saved.lat) &&
          Number.isFinite(saved.lng) &&
          saved.zoom >= 13 &&
          saved.zoom <= 19
        ) {
          center = [saved.lat, saved.lng];
          zoom = saved.zoom;
        }
      } catch {
        /* A corrupt remembered view falls back to SMU. */
      }
    }
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      minZoom: 13,
      maxZoom: 19,
      zoomAnimation: !reducedMotion(),
      fadeAnimation: !reducedMotion(),
      markerZoomAnimation: !reducedMotion(),
    }).setView(center, zoom);
    map.current = instance;
    instance.on("zoomend", () => setZoomRevision((n) => n + 1));
    // This fixed point represents the tester in the demo; no GPS is used.
    const sampleLocation = document.createElement("div");
    sampleLocation.className = "sample-location";
    sampleLocation.setAttribute("role", "img");
    sampleLocation.setAttribute(
      "aria-label",
      "Your sample location at SMU Campus Green",
    );
    const dot = document.createElement("span");
    dot.className = "sample-location-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "sample-location-label";
    label.textContent = "You";
    sampleLocation.append(dot, label);
    L.marker(DEMO_LOCATION, {
      icon: L.divIcon({
        html: sampleLocation,
        className: "sample-location-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      keyboard: false,
      interactive: false,
      zIndexOffset: 500,
    }).addTo(instance);
    instance.attributionControl.setPrefix(false);
    instance.attributionControl.addAttribution(
      '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    );
    let disposed = false;
    import("./OpenFreeMap")
      .then(({ addBasemap }) => {
        if (!disposed)
          tiles.current = addBasemap(instance, (failed) => {
            if (!disposed) setTileError(failed);
          });
      })
      .catch(() => {
        if (!disposed) setTileError(true);
      });
    instance.on("moveend", () => {
      if (config.remember) {
        const c = instance.getCenter();
        sessionStorage.setItem(
          "sharelah-map-view",
          JSON.stringify({ lat: c.lat, lng: c.lng, zoom: instance.getZoom() }),
        );
      }
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      disposed = true;
      observer.disconnect();
      tiles.current?.remove();
      instance.remove();
      map.current = null;
      tiles.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    const targets: { product: Product; node: HTMLElement }[] = [];
    products.forEach((p) => {
      const button = document.createElement("button");
      button.className =
        "map-pin " +
        (pickup ? "pickup-pin" : "photo-pin") +
        (p.id === selected ? " selected" : "");
      button.type = "button";
      if (pickup) button.textContent = "Pickup point";
      else {
        const thumbnail = document.createElement("span");
        thumbnail.className = "pin-photo";
        button.append(thumbnail);
        targets.push({ product: p, node: thumbnail });
        button.title = `${p.title} · ${money(total(p))}`;
        button.setAttribute(
          "aria-description",
          `${money(total(p))} per portion${owned(reservations[p.id]) ? ", in your splits" : ""}`,
        );
      }
      button.setAttribute("aria-label", "Select " + p.title);
      button.setAttribute("aria-pressed", String(p.id === selected));
      button.addEventListener("click", () => select.current?.(p.id));
      L.DomEvent.disableClickPropagation(button);
      L.marker(position(p), {
        icon: L.divIcon({
          html: button,
          className: "product-marker",
          iconSize: pickup ? [110, 44] : [48, 54],
          iconAnchor: pickup ? [55, 44] : [24, 54],
        }),
        keyboard: false, // The native button is the keyboard target.
        zIndexOffset: p.id === selected ? 1000 : 0,
      }).addTo(layer);
    });
    setPhotoPins(targets);
    return () => {
      layer.remove();
    };
  }, [products, reservations, selected, pickup, zoomRevision]);

  useEffect(() => {
    if (!map.current || pickup) return;
    if (radius) {
      const circle = L.circle(DEMO_LOCATION, {
        radius,
        color: "#c44212",
        weight: 1,
        fillOpacity: 0.04,
        dashArray: "5 6",
        interactive: false,
      }).addTo(map.current);
      map.current.fitBounds(circle.getBounds(), {
        padding: [24, 24],
        animate: !reducedMotion(),
        duration: 0.25,
      });
      return () => {
        circle.remove();
      };
    }
    if (recenter > 0)
      map.current.setView(DEMO_LOCATION, 16, { animate: !reducedMotion() });
  }, [radius, recenter, pickup]);

  return (
    <div className={"tile-map " + (pickup ? "pickup-map" : "")}>
      <div
        ref={container}
        className="map-viewport"
        aria-label="Interactive neighbourhood map"
      />
      {photoPins.map(({ product, node }) =>
        createPortal(
          product.photo ? (
            <Photo id={product.photo} alt="" />
          ) : (
            <img src={`/assets/${product.art || "bag"}.svg`} alt="" />
          ),
          node,
          product.id,
        ),
      )}
      {tileError && (
        <div className="map-error" role="status">
          Map tiles unavailable. Check your connection.
          <button
            className="text-button"
            onClick={() => {
              setTileError(false);
              tiles.current?.retry();
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
