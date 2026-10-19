import { useSyncExternalStore, useLayoutEffect } from "react";
const listeners = new Set<() => void>();
const scrolls = new Map<string, number>();
const emit = () => listeners.forEach((fn) => fn());
window.addEventListener("popstate", emit);
window.addEventListener("hashchange", emit);
history.scrollRestoration = "manual";
if (!history.state?.sharelah)
  history.replaceState(
    { sharelah: true, key: crypto.randomUUID(), label: "Home" },
    "",
    location.hash || "#/",
  );
export function currentPath() {
  return location.hash.slice(1) || "/";
}
// Back-button labels, matched by path prefix in order (longest prefixes first).
const labels: [string, string][] = [
  ["/compare", "Compare prices"],
  ["/map", "Map"],
  ["/deals", "Spotted deals"],
  ["/deal/", "Deal"],
  ["/splits", "My splits"],
  ["/saved", "Saved"],
  ["/search", "Results"],
  ["/neighbour", "Neighbours"],
  ["/profile", "Profile"],
  ["/messages", "Messages"],
  ["/chat", "Chat"],
  ["/offer", "Split"],
  ["/split", "My split"],
  ["/hosting", "Your split"],
  ["/create", "Share"],
];
export function routeLabel(path = currentPath()) {
  return labels.find(([prefix]) => path.startsWith(prefix))?.[1] ?? "Home";
}
/** "/hosting/abc?published=1" → page "hosting", id "abc", params published=1. */
export function parseRoute(path: string) {
  const [pathname, query = ""] = path.split("?");
  const [page = "", id = "", extra = ""] = pathname.slice(1).split("/");
  return { page, id, extra, params: new URLSearchParams(query) };
}
export type FlowState = {
  holdDeadline: number;
  holdMethod: string;
  holdQuantity?: number;
  holdVariant?: "A" | "B" | "C";
};
export function go(
  path: string,
  label?: string,
  replace = false,
  flowState?: FlowState,
) {
  if (path === currentPath()) return;
  scrolls.set(
    history.state?.key,
    document.querySelector(".page-scroll")?.scrollTop || 0,
  );
  history[replace ? "replaceState" : "pushState"](
    {
      ...flowState,
      sharelah: true,
      key: crypto.randomUUID(),
      from: replace ? history.state?.from : currentPath(),
      label: label ?? (replace ? history.state?.label : routeLabel()) ?? "Home",
      backTarget: replace ? history.state?.backTarget : undefined,
    },
    "",
    "#" + path,
  );
  emit();
}
// A committed flow returns to its collection, never to a stale scanner/form.
export function finish(path: string, returnTo = "/splits") {
  history.replaceState(
    {
      sharelah: true,
      key: crypto.randomUUID(),
      label: routeLabel(returnTo),
      backTarget: returnTo,
    },
    "",
    "#" + path,
  );
  emit();
}
export function back(fallback = "/") {
  scrolls.set(
    history.state?.key,
    document.querySelector(".page-scroll")?.scrollTop || 0,
  );
  if (history.state?.backTarget) {
    const target = history.state.backTarget;
    history.replaceState(
      { sharelah: true, key: crypto.randomUUID(), label: "Home" },
      "",
      "#" + target,
    );
    emit();
  } else if (history.state?.from) history.back();
  else go(fallback, "Home", true);
}
export function useRoute() {
  const path = useSyncExternalStore((fn) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, currentPath);
  useLayoutEffect(() => {
    const el = document.querySelector(".page-scroll");
    if (el) el.scrollTop = scrolls.get(history.state?.key) || 0;
    document
      .querySelector<HTMLElement>(".app-frame h1")
      ?.focus({ preventScroll: true });
  }, [path]);
  return path;
}
