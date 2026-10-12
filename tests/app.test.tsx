// @vitest-environment happy-dom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
  waitFor,
  within,
} from "@testing-library/react";
import "fake-indexeddb/auto";
import { Storage } from "happy-dom";
import App from "../src/App";
import { go, finish, back } from "../src/router";

// Camera permission is denied in this suite. QR arithmetic is tested separately
// with the actual packaged JS encoder and WASM decoder.
vi.mock("../src/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ui")>()),
  QRCode: () => <div aria-label="Pickup QR code" />,
}));
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const navigate = (path: string) => act(() => go(path));
const saved = () => JSON.parse(localStorage.getItem("sharelah-demo-v1")!);

beforeEach(() => {
  vi.stubGlobal("localStorage", new Storage());
  vi.stubGlobal("sessionStorage", new Storage());
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(
    { sharelah: true, key: crypto.randomUUID(), label: "Home" },
    "",
    "#/",
  );
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("denied"), { name: "NotAllowedError" }),
        ),
    },
    configurable: true,
  });
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("shows existing membership on Home and Map and opens the same ready split", () => {
  render(<App />);
  expect(
    within(
      screen.getByRole("button", { name: "Open Greek yoghurt" }),
    ).getByText("In your splits"),
  ).toBeTruthy();
  click("Map");
  expect(
    screen.getByRole("button", { name: "Select Greek yoghurt" }).textContent,
  ).toContain("Yours");
  expect(screen.getByText("In your splits")).toBeTruthy();
  click("View my split");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Ready for pickup",
  );
  expect(screen.getByRole("button", { name: "Map" })).toBeTruthy();
});

it("reserves via a sheet, saves the chosen payment, and cancels without leaving a stale checkout", () => {
  vi.useFakeTimers();
  render(<App />);
  click("Open Top detergent");
  click("Reserve a portion");
  expect(
    screen.getByRole("dialog", { name: "Reserve your portion" }),
  ).toBeTruthy();
  click(/Payment method · Change/);
  click(/ShareLah wallet/);
  click("Use payment method");
  click("Confirm & hold S$8.10");
  expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
    "Confirmation in 5 seconds",
  );
  expect(saved().reservations.det).toBeUndefined();
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
    "Confirmation in 1 seconds",
  );
  expect(saved().reservations.det).toBeUndefined();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "My reservation",
  );
  expect(history.state.label).toBe("Home");
  expect(saved().reservations.det.method).toBe("ShareLah wallet");
  click("Cancel reservation");
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Cancel reservation",
    }),
  );
  expect(saved().reservations.det.status).toBe("cancelled");
  expect(saved().products.find((p: any) => p.id === "det").available).toBe(1);
  expect(history.state.backTarget).toBe("/splits");
});

it("rejects a wrong pickup number and requires receipt confirmation before release", async () => {
  render(<App />);
  navigate("/code/yog");
  fireEvent.change(screen.getByLabelText("6-digit pickup code"), {
    target: { value: "111111" },
  });
  click("Find my portion");
  expect(screen.getByRole("alert").textContent).toContain("doesn’t match");
  expect(saved().reservations.yog.status).toBe("ready");
  fireEvent.change(screen.getByLabelText("6-digit pickup code"), {
    target: { value: "482913" },
  });
  click("Find my portion");
  expect(
    (
      screen.getByRole("button", {
        name: "Confirm & release S$1.82",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  click("Confirm & release S$1.82");
  expect(saved().reservations.yog.status).toBe("completed");
  expect(sessionStorage.getItem("sharelah-verified-yog")).toBeNull();
  click("My splits");
  expect(location.hash).toBe("#/splits");
  expect(screen.queryByRole("heading", { name: "Confirm receipt" })).toBeNull();
});

it("blocks direct receipt access and keeps a reported payment held", () => {
  render(<App />);
  navigate("/receipt/yog");
  expect(screen.getByText("Check the pickup code first")).toBeTruthy();
  navigate("/problem/yog");
  fireEvent.click(screen.getByLabelText("Host didn’t arrive"));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Waited at the entrance." },
  });
  click("Submit report");
  expect(saved().reservations.yog.report.note).toBe("Waited at the entrance.");
  navigate("/code/yog");
  expect(screen.getByText("This payment is under review.")).toBeTruthy();
  expect(screen.queryByLabelText("6-digit pickup code")).toBeNull();
});

it("saves chat messages and restores them after the app is remounted", () => {
  const first = render(<App />);
  navigate("/chat/yog");
  expect(
    (screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "I am at the entrance." },
  });
  click("Send message");
  expect(saved().messages.yog[0].body).toBe("I am at the entrance.");
  first.unmount();
  render(<App />);
  expect(screen.getByText("I am at the entrance.")).toBeTruthy();
});

it("validates a new listing, computes its portions, publishes it, and resets only local demo data", async () => {
  render(<App />);
  click("Create");
  click(/Enter details manually/);
  click("Set portions & price");
  expect(screen.getByRole("alert").textContent).toContain("Add an item");
  click("Oat milk");
  click("Set portions & price");
  fireEvent.change(screen.getByLabelText("Bundle price (S$)"), {
    target: { value: "10.01" },
  });
  click("Arrange pickup");
  click("Review listing");
  expect(screen.getByText("S$5.15")).toBeTruthy();
  click("Publish split");
  const p = saved().products.find((p: any) => p.owner);
  expect(p.itemCents).toBe(500);
  expect(p.bundleCents).toBe(1001);
  expect(p.available).toBe(1);
  expect(screen.getByRole("heading", { name: "Split published" })).toBeTruthy();
  navigate("/profile/testing");
  click(/Reset my demo/);
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Reset my demo",
    }),
  );
  await waitFor(() => expect(location.hash).toBe("#/"));
  expect(saved().products).toHaveLength(3);
  expect(saved().reservations.yog.status).toBe("ready");
});

it("opens the camera for a deal report and offers a usable permission-denied fallback", async () => {
  render(<App />);
  navigate("/report-deal");
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "permission was denied",
    ),
  );
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({ audio: false }),
  );
  click("Continue without a photo");
  click("Top detergent");
  fireEvent.change(screen.getByLabelText("Advertised price (S$)"), {
    target: { value: "12.50" },
  });
  click("Post deal");
  expect(saved().deals[0].priceCents).toBe(1250);
  expect(
    screen.getByRole("heading", { name: "Neighbourhood find" }),
  ).toBeTruthy();
});

it("cancels during the grace period without taking availability or holding payment", () => {
  vi.useFakeTimers();
  render(<App />);
  click("Open Top detergent");
  click("Reserve a portion");
  click("Confirm & hold S$8.10");
  act(() => vi.advanceTimersByTime(3000));
  click("Cancel reservation");
  expect(location.hash).toBe("#/offer/det");
  act(() => vi.advanceTimersByTime(6000));
  expect(saved().reservations.det).toBeUndefined();
  expect(saved().products.find((p: any) => p.id === "det").available).toBe(1);
});

it("keeps the original countdown deadline when the screen remounts", () => {
  vi.useFakeTimers();
  const view = render(<App />);
  click("Open Top detergent");
  click("Reserve a portion");
  click("Confirm & hold S$8.10");
  act(() => vi.advanceTimersByTime(2000));
  view.unmount();
  render(<App />);
  expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
    "Confirmation in 3 seconds",
  );
  act(() => vi.advanceTimersByTime(3000));
  expect(location.hash).toBe("#/split/det");
  expect(saved().reservations.det.status).toBe("reserved");
  expect(saved().products.find((p: any) => p.id === "det").available).toBe(0);
});

it("abandons the countdown on navigation and rejects a direct countdown URL", () => {
  vi.useFakeTimers();
  render(<App />);
  navigate("/holding/det");
  expect(location.hash).toBe("#/offer/det");
  click("Reserve a portion");
  click("Confirm & hold S$8.10");
  navigate("/");
  act(() => vi.advanceTimersByTime(6000));
  expect(saved().reservations.det).toBeUndefined();
});
