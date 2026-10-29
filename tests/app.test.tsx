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
import { dealPhotos } from "../src/dealPhotos";

// Camera permission is denied in this suite. QR arithmetic is tested separately
// with the actual packaged JS encoder and WASM decoder.
vi.mock("../src/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/ui")>()),
  QRCode: () => <div aria-label="Pickup QR code" />,
}));
/** Fill in the item the way the AI price-tag scan would. */
const fillItem = () => {
  for (const [label, value] of [
    ["Item name", "TOP liquid laundry detergent"],
    ["One portion", "1 bottle · 2.3 kg"],
    ["Store", "FairPrice · Bugis Junction"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
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

it("shows individual product crops in main splits, deal cards and deal details", () => {
  render(<App />);
  const split = screen.getByRole("button", {
    name: "Open Chobani blueberry Greek yoghurt",
  });
  const thumb = within(split).getByRole("img", {
    name: "Chobani blueberry Greek yoghurt",
  });
  expect(thumb.getAttribute("viewBox")).toBe(
    dealPhotos["chobani-blueberry"].thumbnail.join(" "),
  );
  expect(within(split).getByText("S$3.80 total")).toBeTruthy();
  navigate("/deals");
  const blueberry = screen.getByRole("img", {
    name: "Chobani blueberry Greek yoghurt · source photo",
  });
  const strawberry = screen.getByRole("img", {
    name: "TOP liquid laundry detergent · source photo",
  });
  expect(blueberry.getAttribute("viewBox")).not.toBe(
    strawberry.getAttribute("viewBox"),
  );
  navigate("/deal/photo-chobani-blueberry");
  expect(
    screen
      .getByRole("img", {
        name: "Chobani blueberry Greek yoghurt · source photo",
      })
      .getAttribute("viewBox"),
  ).toBe(dealPhotos["chobani-blueberry"].detail.join(" "));
  expect(
    screen.getByRole("link", { name: /Open full photo/ }).getAttribute("href"),
  ).toBe("/assets/deals/IMG_2069.jpg");
  click("Start a split from this deal");
  expect(saved().createDraft.photo).toBe(
    "/assets/deals/IMG_2069.jpg#deal=chobani-blueberry",
  );
  expect(
    screen
      .getByRole("img", { name: "Photographed price tag" })
      .getAttribute("viewBox"),
  ).toBe(dealPhotos["chobani-blueberry"].thumbnail.join(" "));
});

it("shows existing membership on Home and Map and opens the same ready split", () => {
  render(<App />);
  expect(
    within(
      screen.getByRole("button", {
        name: "Open Chobani blueberry Greek yoghurt",
      }),
    ).getByText("In your splits"),
  ).toBeTruthy();
  click("Map");
  expect(
    screen
      .getByRole("button", {
        name: "Select Chobani blueberry Greek yoghurt",
      })
      .getAttribute("aria-description"),
  ).toContain("in your splits");
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
  click("Open TOP liquid laundry detergent");
  click("Reserve a portion");
  expect(
    screen.getByRole("dialog", { name: "Reserve your portion" }),
  ).toBeTruthy();
  click(/Payment method · Change/);
  click(/ShareLah wallet/);
  click("Use payment method");
  click("Confirm & hold S$7.15");
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
  // The request waits for the host, who accepts a few seconds later.
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Request sent",
  );
  expect(saved().reservations.det.status).toBe("requested");
  act(() => vi.advanceTimersByTime(3500));
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
        name: "Confirm & release S$3.80",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  click("Confirm & release S$3.80");
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
  expect(saved().messages.yog.at(-1).body).toBe("I am at the entrance.");
  first.unmount();
  render(<App />);
  expect(screen.getByText("I am at the entrance.")).toBeTruthy();
});

it("starts a fresh account, preserves it after reload and restores seeded data on reset", async () => {
  render(<App />);
  navigate("/profile/testing");
  fireEvent.click(screen.getByText("Demo settings & tools"));
  click("Start fresh account");
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Start fresh account",
    }),
  );
  await waitFor(() => expect(location.hash).toBe("#/"));
  expect(saved().accountMode).toBe("fresh");
  expect(saved().reservations).toEqual({});
  expect(saved().saved).toEqual([]);
  expect(saved().messages).toEqual({});
  navigate("/profile");
  expect(
    screen.getByRole("button", { name: "0 Completed splits" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "S$0.00 Total saved" }),
  ).toBeTruthy();
  expect(screen.getByText("No reviews yet · View your profile ›")).toBeTruthy();
  navigate("/neighbour/tom");
  expect(document.querySelectorAll(".neighbour-review")).toHaveLength(0);
  expect(screen.queryByText(/NaN/)).toBeNull();
  cleanup();
  render(<App />);
  navigate("/splits");
  click("Past");
  expect(screen.getByText("Your shared wins will live here.")).toBeTruthy();
  navigate("/messages");
  expect(screen.getByText("No conversations yet")).toBeTruthy();
  expect(saved().reservations).toEqual({});
  navigate("/profile/testing");
  click("Reset my demo");
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Reset my demo",
    }),
  );
  await waitFor(() => expect(location.hash).toBe("#/"));
  expect(saved().accountMode).toBe("seeded");
  expect(saved().saved).toHaveLength(2);
  expect(saved().reservations["past-demo-detergent"].status).toBe("completed");
});

it("groups current, question and completed threads in the inbox", () => {
  render(<App />);
  const previous = saved();
  cleanup();
  previous.messages.det = [
    {
      id: "orphan",
      body: "Is the detergent still available?",
      mine: true,
      time: new Date().toISOString(),
    },
  ];
  localStorage.setItem("sharelah-demo-v1", JSON.stringify(previous));
  render(<App />);
  navigate("/messages");
  expect(document.querySelectorAll(".inbox-group .row-card")).toHaveLength(4);
  expect(screen.getByText("Current split · Ready for pickup")).toBeTruthy();
  expect(screen.getByText("Completed split · 11 Oct 2026")).toBeTruthy();
  const questions = screen.getByRole("region", { name: "Questions to hosts" });
  expect(questions.textContent).toContain("Is the detergent still available?");
  expect(questions.textContent).toContain("Not reserved · 1 of 1 left");
  fireEvent.click(
    within(screen.getByRole("region", { name: "Completed splits" })).getByRole(
      "button",
      { name: /Jerry · TOP liquid laundry detergent/ },
    ),
  );
  expect(screen.getByText("Completed split · 11 Oct 2026")).toBeTruthy();
  expect(screen.getByText("Collected, thank you for sharing!")).toBeTruthy();
  expect(
    screen.queryByText(
      "Hi! We can meet at the pickup point shown in your split.",
    ),
  ).toBeNull();
});

it("validates a new listing, computes its portions, publishes it, and resets only local demo data", async () => {
  render(<App />);
  click("Share");
  click(/Start a split manually/);
  click("Set portions & price");
  expect(screen.getByRole("alert").textContent).toContain("Add an item");
  fillItem();
  click("Set portions & price");
  fireEvent.change(screen.getByLabelText("Bundle price (S$)"), {
    target: { value: "10.01" },
  });
  click("Arrange pickup");
  click("Review split");
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
  expect(saved().products).toHaveLength(27);
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
  fillItem();
  fireEvent.change(screen.getByLabelText("Advertised price (S$)"), {
    target: { value: "12.50" },
  });
  click("Post deal");
  expect(saved().deals[0].priceCents).toBe(1250);
  expect(screen.getByRole("heading", { name: "Spotted deal" })).toBeTruthy();
});

it.each(["A", "C"])(
  "confirmation %s cancels during the grace period without taking availability or holding payment",
  (variant) => {
    vi.useFakeTimers();
    localStorage.setItem("sharelah-confirmation-variant", variant);
    render(<App />);
    click("Open TOP liquid laundry detergent");
    click("Reserve a portion");
    click("Confirm & hold S$7.15");
    act(() => vi.advanceTimersByTime(3000));
    click(variant === "C" ? "Go back" : "Cancel reservation");
    expect(location.hash).toBe("#/offer/det");
    act(() => vi.advanceTimersByTime(6000));
    expect(saved().reservations.det).toBeUndefined();
    expect(saved().products.find((p: any) => p.id === "det").available).toBe(1);
  },
);

it.each(["A", "C"])(
  "confirmation %s keeps its original screen and countdown deadline when remounted",
  (variant) => {
    vi.useFakeTimers();
    localStorage.setItem("sharelah-confirmation-variant", variant);
    const view = render(<App />);
    click("Open TOP liquid laundry detergent");
    click("Reserve a portion");
    click("Confirm & hold S$7.15");
    act(() => vi.advanceTimersByTime(2000));
    click("B · Extra confirmation");
    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("heading", {
        name: variant === "C" ? "Are you sure?" : "Review your reservation",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Confirmation in 3 seconds",
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(location.hash).toBe("#/split/det");
    expect(saved().reservations.det.status).toBe("requested");
    act(() => vi.advanceTimersByTime(3500));
    expect(saved().reservations.det.status).toBe("reserved");
    expect(saved().products.find((p: any) => p.id === "det").available).toBe(0);
  },
);

it("abandons the countdown on navigation and rejects a direct countdown URL", () => {
  vi.useFakeTimers();
  render(<App />);
  navigate("/holding/det");
  expect(location.hash).toBe("#/offer/det");
  click("Reserve a portion");
  click("Confirm & hold S$7.15");
  navigate("/");
  act(() => vi.advanceTimersByTime(6000));
  expect(saved().reservations.det).toBeUndefined();
});

it("shows photo deals in existing demos and searches separate offers in the same picture", () => {
  render(<App />);
  navigate("/deals");
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search spotted deals" }),
    { target: { value: "Chobani" } },
  );
  expect(screen.getByRole("status").textContent).toBe("1 deal");
  click(/Chobani blueberry Greek yoghurt Cold Storage/);
  expect(screen.getAllByText("Any 2 for S$7.30").length).toBeGreaterThan(0);
  expect(
    screen
      .getByRole("img", { name: /source photo/ })
      .querySelector("image")
      ?.getAttribute("href"),
  ).toBe("/assets/deals/IMG_2069.jpg");
  click("Start a split from this deal");
  expect(saved().createDraft.portion).toBe("1 tub · 160 g");
  expect(saved().createDraft.bundleCount).toBe(2);
  expect(saved().createDraft.bundleCents).toBe(730);
  expect(saved().createDraft.photo).toBe(
    "/assets/deals/IMG_2069.jpg#deal=chobani-blueberry",
  );
  click("Set portions & price");
  expect(screen.getByLabelText("Bundle price (S$)").getAttribute("value")).toBe(
    "7.3",
  );
});

it("removes the cluttered clearance offer from the curated catalogue", () => {
  render(<App />);
  navigate("/deal/photo-clearance");
  expect(screen.getByText("Deal not found")).toBeTruthy();
  expect(screen.queryByText("S$0.00")).toBeNull();
});

it("adds the photo catalogue to an older saved demo without losing progress", () => {
  render(<App />);
  const previous = saved();
  cleanup();
  previous.deals = [
    {
      id: "my-deal",
      title: "My own find",
      store: "My store",
      priceCents: 500,
      portion: "2 packs",
      category: "Food & drinks",
      createdAt: "",
      area: "Bugis",
    },
  ];
  previous.saved = ["det"];
  localStorage.setItem("sharelah-demo-v1", JSON.stringify(previous));
  render(<App />);
  expect(saved().saved).toEqual(["det"]);
  expect(saved().deals[0].id).toBe("my-deal");
  expect(
    saved().deals.filter((d: any) => d.id === "photo-chobani-blueberry"),
  ).toHaveLength(1);
  cleanup();
  render(<App />);
  expect(
    saved().deals.filter((d: any) => d.id === "photo-chobani-blueberry"),
  ).toHaveLength(1);
});

it("backfills completed demo splits into Past and itemizes the existing savings", () => {
  render(<App />);
  const previous = saved();
  cleanup();
  previous.products = previous.products.filter(
    (p: any) => !p.id.startsWith("past-demo-"),
  );
  previous.reservations = { yog: previous.reservations.yog };
  localStorage.setItem("sharelah-demo-v1", JSON.stringify(previous));
  render(<App />);
  navigate("/splits");
  click("Past");
  const cards = document.querySelectorAll(".offer-card");
  expect(cards).toHaveLength(4);
  expect(screen.getByText("S$17.70")).toBeTruthy();
  expect(screen.queryByText("Your shared wins will live here.")).toBeNull();
  click("Open TOP liquid laundry detergent");
  expect(
    screen.getByRole("heading", { name: "Split complete", level: 1 }),
  ).toBeTruthy();
  expect(screen.getByText("S$7.15 released")).toBeTruthy();
  navigate("/profile/savings");
  expect(screen.getByRole("heading", { name: "S$17.70" })).toBeTruthy();
  expect(screen.queryByText("Previous demo savings")).toBeNull();
  click(/Cloud-soft everyday socks 7 Oct 2026/);
  expect(screen.getByText("S$4.15 released")).toBeTruthy();
  cleanup();
  render(<App />);
  navigate("/splits");
  expect(document.querySelectorAll(".offer-card")).toHaveLength(4);
  expect(saved().reservations.yog.status).toBe("ready");
});

it("saves a written review, shows it on Jerry's profile, and edits it without duplicating it", () => {
  const view = render(<App />);
  navigate("/code/yog");
  fireEvent.change(screen.getByLabelText("6-digit pickup code"), {
    target: { value: "482913" },
  });
  click("Find my portion");
  fireEvent.click(screen.getByRole("checkbox"));
  click("Confirm & release S$3.80");
  click("Rate your experience");
  click("5 stars");
  fireEvent.change(screen.getByLabelText("Your comments (optional)"), {
    target: { value: "Jerry was punctual and the tub was sealed." },
  });
  click("Submit review");
  expect(saved().reservations.yog.reviewComment).toBe(
    "Jerry was punctual and the tub was sealed.",
  );
  click(/Jerry’s profile/);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Jerry’s profile",
  );
  expect(
    screen.getByText("Jerry was punctual and the tub was sealed."),
  ).toBeTruthy();
  expect(screen.getByText("4 reviews")).toBeTruthy();
  view.unmount();
  render(<App />);
  expect(
    screen.getByText("Jerry was punctual and the tub was sealed."),
  ).toBeTruthy();
  navigate("/split/yog");
  click("Edit your review");
  expect(
    (screen.getByLabelText("Your comments (optional)") as HTMLTextAreaElement)
      .value,
  ).toBe("Jerry was punctual and the tub was sealed.");
  expect(
    screen
      .getByRole("button", { name: "5 stars" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  click("4 stars");
  fireEvent.change(screen.getByLabelText("Your comments (optional)"), {
    target: { value: "Updated: clear messages and easy pickup." },
  });
  click("Save review");
  navigate("/neighbour/jerry");
  expect(
    screen.getByText("Updated: clear messages and easy pickup."),
  ).toBeTruthy();
  expect(
    screen.queryByText("Jerry was punctual and the tub was sealed."),
  ).toBeNull();
  expect(screen.getByText("4 reviews")).toBeTruthy();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Tom Chua", exact: true })[0],
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Tom Chua’s profile",
  );
});

it("migrates old personas while keeping reservations and always uses Jerry across splits", () => {
  render(<App />);
  const previous = saved();
  cleanup();
  previous.radius = 1000; // Include the noodle split in this persona migration fixture.
  previous.products[0].host = "Priya";
  previous.products[2].host = "Mei";
  previous.name = "Old tester";
  localStorage.setItem("sharelah-demo-v1", JSON.stringify(previous));
  render(<App />);
  expect(saved().name).toBe("Tom Chua");
  expect(saved().products.every((p: any) => p.host === "Jerry")).toBe(true);
  expect(saved().reservations.yog.status).toBe("ready");
  click("Open Samyang Buldak bowl noodles");
  click(/Hosted by Jerry/);
  expect(location.hash).toBe("#/neighbour/jerry");
  expect(screen.getByText("Splits hosted by Jerry")).toBeTruthy();
  navigate("/profile");
  click(/Neighbour profiles/);
  expect(screen.getByRole("button", { name: /^Jerry / })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Tom Chua/ })).toBeTruthy();
});

it("the one-page layout flags each incomplete section and publishes the same split", () => {
  localStorage.setItem("sharelah-create-variant", "B");
  render(<App />);
  click("Share");
  click(/Start a split manually/);
  expect(screen.queryByText("Step 1 of 4")).toBeNull();
  fireEvent.change(screen.getByLabelText("Pickup point"), {
    target: { value: "" },
  });
  click("Publish split");
  // The form's section comes first; the review copy is at the bottom.
  const section = (name: string) =>
    screen.getAllByRole("region", { name: new RegExp(name) })[0];
  expect(within(section("Item")).getByRole("alert").textContent).toContain(
    "Add an item",
  );
  expect(within(section("Pickup")).getByRole("alert")).toBeTruthy();
  fillItem();
  // Editing a section clears its error.
  expect(within(section("Item")).queryByRole("alert")).toBeNull();
  fireEvent.change(screen.getByLabelText("Bundle price (S$)"), {
    target: { value: "21" },
  });
  fireEvent.change(screen.getByLabelText("Pickup point"), {
    target: { value: "Bugis+ · Main entrance" },
  });
  // The same review cards as A's step 4 sit at the bottom and update live.
  expect(screen.getByText("4 Review your split")).toBeTruthy();
  expect(screen.getByText("Bugis+ · Main entrance")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Edit pickup" })).toBeTruthy();
  click("Publish split");
  const p = saved().products.find((p: any) => p.owner);
  expect(p).toMatchObject({
    title: expect.stringContaining("TOP"),
    itemCents: 1050,
  });
  expect(screen.getByRole("heading", { name: "Split published" })).toBeTruthy();
  localStorage.removeItem("sharelah-create-variant");
});
