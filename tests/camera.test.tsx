// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  waitFor,
  cleanup,
  fireEvent,
  screen,
} from "@testing-library/react";
import { Camera } from "../src/Camera";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup() {
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  vi.spyOn(HTMLVideoElement.prototype, "play").mockResolvedValue();
  const stop = vi.fn();
  const track = { stop, getCapabilities: () => ({}) };
  const stream = new window.MediaStream();
  Object.assign(stream, {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  });
  return { stop, stream };
}
it("stops the old camera on switching lenses, then stops the new one on unmount", async () => {
  const a = setup(),
    b = setup();
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(a.stream)
    .mockResolvedValueOnce(b.stream);
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  const view = render(<Camera mode="photo" />);
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Switch camera",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Switch camera" }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(a.stop).toHaveBeenCalledTimes(1);
  view.unmount();
  await waitFor(() => expect(b.stop).toHaveBeenCalledTimes(1));
});
it("releases a late permission grant after the camera screen has been left", async () => {
  const a = setup();
  let resolve!: (value: unknown) => void;
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockImplementation(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    },
    configurable: true,
  });
  const view = render(<Camera mode="photo" />);
  view.unmount();
  resolve(a.stream);
  await waitFor(() => expect(a.stop).toHaveBeenCalledTimes(1));
});
