import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type L from "leaflet";

setWorkerUrl(workerUrl);
const style = "https://tiles.openfreemap.org/styles/positron";

export function addBasemap(map: L.Map, onError: (failed: boolean) => void) {
  const layer = maplibreGL({ style, attributionControl: false }).addTo(map);
  const renderer = layer.getMaplibreMap();
  renderer.on("error", () => onError(true));
  renderer.on("idle", () => {
    if (renderer.areTilesLoaded()) onError(false);
  });
  return {
    retry: () => renderer.setStyle(style, { diff: false }),
    remove: () => layer.remove(),
  };
}
