import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { money, owned, total, type Product, type State } from "./model";

const BUGIS: L.LatLngTuple = [1.2992, 103.852];
// Sample pickup points, aligned to the seeded addresses rather than artwork pixels.
const PICKUPS: Record<string, L.LatLngTuple> = {
  yog: [1.2998, 103.8543],
  det: [1.2969, 103.8507],
  oat: [1.2963, 103.8501],
};
const position = (p: Product) => PICKUPS[p.id] || BUGIS;
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
}: {
  products: Product[];
  reservations?: State["reservations"];
  selected?: string;
  onSelect?: (id: string) => void;
  recenter?: number;
  remember?: boolean;
  pickup?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [tileError, setTileError] = useState(false);
  const tiles = useRef<L.TileLayer | null>(null);
  const initial = useRef({ products, remember, pickup });

  useEffect(() => {
    if (!container.current) return;
    const config = initial.current;
    let center =
      config.pickup && config.products[0]
        ? position(config.products[0])
        : BUGIS;
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
        /* A corrupt remembered view falls back to Bugis. */
      }
    }
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      zoomAnimation: !reducedMotion(),
      fadeAnimation: !reducedMotion(),
      markerZoomAnimation: !reducedMotion(),
    }).setView(center, zoom);
    map.current = instance;
    // This fixed point represents the tester in the demo; no GPS is used.
    const sampleLocation = document.createElement("div");
    sampleLocation.className = "sample-location";
    sampleLocation.setAttribute("role", "img");
    sampleLocation.setAttribute("aria-label", "Your sample location in Bugis");
    const dot = document.createElement("span");
    dot.className = "sample-location-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "sample-location-label";
    label.textContent = "You";
    sampleLocation.append(dot, label);
    L.marker(BUGIS, {
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
    tiles.current = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 13,
        keepBuffer: 1,
      },
    )
      .on("tileerror", () => setTileError(true))
      .addTo(instance);
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
      observer.disconnect();
      instance.remove();
      map.current = null;
      tiles.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    products.forEach((p) => {
      const button = document.createElement("button");
      button.className = "map-pin" + (p.id === selected ? " selected" : "");
      button.type = "button";
      button.textContent = pickup
        ? "Pickup point"
        : (owned(reservations[p.id]) ? "Yours · " : "") + money(total(p));
      button.setAttribute("aria-label", "Select " + p.title);
      button.setAttribute("aria-pressed", String(p.id === selected));
      button.addEventListener("click", () => select.current?.(p.id));
      L.DomEvent.disableClickPropagation(button);
      L.marker(position(p), {
        icon: L.divIcon({
          html: button,
          className: "price-marker",
          iconSize: [110, 44],
          iconAnchor: [55, 44],
        }),
        keyboard: false, // The native button is the keyboard target.
        zIndexOffset: p.id === selected ? 1000 : 0,
      }).addTo(layer);
    });
    return () => {
      layer.remove();
    };
  }, [products, reservations, selected, pickup]);

  useEffect(() => {
    if (recenter > 0)
      map.current?.setView(BUGIS, 16, { animate: !reducedMotion() });
  }, [recenter]);

  return (
    <div className={"tile-map " + (pickup ? "pickup-map" : "")}>
      <div
        ref={container}
        className="map-viewport"
        aria-label="Interactive neighbourhood map"
      />
      {tileError && (
        <div className="map-error" role="status">
          Map tiles unavailable. Check your connection.
          <button
            className="text-button"
            onClick={() => {
              setTileError(false);
              tiles.current?.redraw();
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
