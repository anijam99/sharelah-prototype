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
export function routeLabel(path = currentPath()) {
  return path.startsWith("/map")
    ? "Map"
    : path.startsWith("/splits")
      ? "My splits"
      : path.startsWith("/saved")
        ? "Saved"
        : path.startsWith("/search")
          ? "Results"
          : path.startsWith("/profile")
            ? "Profile"
            : path.startsWith("/messages")
              ? "Messages"
              : path.startsWith("/chat")
                ? "Chat"
                : path.startsWith("/offer")
                  ? "Offer"
                  : path.startsWith("/split")
                    ? "My split"
                    : path.startsWith("/create")
                      ? "Create"
                      : "Home";
}
export function go(path: string, label?: string, replace = false) {
  if (path === currentPath()) return;
  scrolls.set(
    history.state?.key,
    document.querySelector(".page-scroll")?.scrollTop || 0,
  );
  history[replace ? "replaceState" : "pushState"](
    {
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
