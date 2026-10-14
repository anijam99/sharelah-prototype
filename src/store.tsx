import { normalizePersonas } from "./people";
import { mergePhotoDeals } from "./dealCatalog";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { openDB } from "idb";
import {
  addDemoHistory,
  initialState,
  refreshSeedProducts,
  type State,
} from "./model";
const KEY = "sharelah-demo-v1";
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      value?.version === 1 &&
      Array.isArray(value.products) &&
      value.reservations &&
      value.messages &&
      value.drafts &&
      Array.isArray(value.saved) &&
      Array.isArray(value.deals) &&
      typeof value.name === "string" &&
      typeof value.area === "string" &&
      typeof value.payment === "string" &&
      value.createDraft &&
      typeof value.createDraft === "object" &&
      value.joinedHosts &&
      typeof value.joinedHosts === "object" &&
      value.products.every(
        (p: any) =>
          p &&
          typeof p.id === "string" &&
          typeof p.title === "string" &&
          typeof p.portion === "string" &&
          typeof p.place === "string" &&
          typeof p.time === "string" &&
          Number.isFinite(p.itemCents),
      )
    )
      return normalizePersonas(
        addDemoHistory({
          ...(value as State),
          deals: mergePhotoDeals(value.deals),
          products: refreshSeedProducts(value.products).map((p) =>
            p.owner && value.joinedHosts[p.id] && p.available === p.shareCount
              ? { ...p, available: Math.max(0, p.available - 1) }
              : p,
          ),
        }),
      );
  } catch {}
  return initialState();
}
const Context = createContext<null | {
  state: State;
  update: (fn: (s: State) => State) => void;
  storageError: string;
  reset: () => Promise<void>;
}>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setStorageError("");
    } catch {
      setStorageError(
        "This browser could not save your changes. Keep this tab open, or free up browser storage.",
      );
    }
  }, [state]);
  function update(fn: (s: State) => State) {
    setState(fn);
  }
  async function reset() {
    if (typeof indexedDB !== "undefined")
      await (await photoDB()).clear("photos");
    update(() => initialState());
  }
  return (
    <Context value={{ state, update, storageError, reset }}>{children}</Context>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("Missing provider");
  return value;
}
const photoDB = () =>
  openDB("sharelah-photos", 1, {
    upgrade(db) {
      db.createObjectStore("photos");
    },
  });
export async function savePhoto(blob: Blob) {
  const id = crypto.randomUUID();
  await (await photoDB()).put("photos", blob, id);
  return id;
}
export async function readPhoto(id: string) {
  return (await (await photoDB()).get("photos", id)) as Blob | undefined;
}
export async function removePhoto(id: string) {
  await (await photoDB()).delete("photos", id);
}

export async function cachedPhotoIds(): Promise<string[]> {
  return (await (await photoDB()).getAllKeys("photos")).map(String);
}
