import { useState } from "react";
import { ChevronRight, Navigation } from "lucide-react";
import { Art } from "./ui";
import { TileMap } from "./TileMap";
import { useStore } from "./store";
import { go } from "./router";
import { money, owned, total, type Product } from "./model";

/** The same filtered products appear in this map and the surrounding home feed. */
export function HomeMap({ products }: { products: Product[] }) {
  const { state } = useStore();
  const [selected, setSelected] = useState(
    sessionStorage.getItem("sharelah-home-map-selected") || "",
  );
  const [recenter, setRecenter] = useState(0);
  const product = products.find((p) => p.id === selected);
  return (
    <section className="home-map" aria-label="Nearby splits map">
      <div className="map-heading">
        <h2>Around you</h2>
        <button
          className="text-button"
          onClick={() => setRecenter((n) => n + 1)}
        >
          <Navigation size={16} aria-hidden="true" /> Near me
        </button>
      </div>
      <TileMap
        products={products}
        reservations={state.reservations}
        selected={product?.id}
        radius={state.radius}
        recenter={recenter}
        remember
        onSelect={(id) => {
          setSelected(id);
          sessionStorage.setItem("sharelah-home-map-selected", id);
        }}
      />
      {product ? (
        <button
          className="home-map-preview"
          aria-label={`View selected split: ${product.title}`}
          onClick={() =>
            go(
              `/${owned(state.reservations[product.id]) ? "split" : "offer"}/${product.id}`,
            )
          }
        >
          <Art p={product} />
          <span>
            <strong>{product.title}</strong>
            <small>{product.place}</small>
            <b>{money(total(product))} total</b>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      ) : (
        <p className="fine">
          {products.length
            ? "Tap a product on the map to see its pickup details."
            : "No splits match your filters here."}
        </p>
      )}
    </section>
  );
}
