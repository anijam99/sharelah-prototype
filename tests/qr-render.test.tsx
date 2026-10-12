// @vitest-environment happy-dom
import { it, expect } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QRCode } from "../src/ui";
it("loads the actual source QR module and renders a scannable pickup code", async () => {
  const { container } = render(<QRCode value="sharelah:pickup:yog:482913" />);
  try {
    await waitFor(() =>
      expect(
        container.querySelector("path")?.getAttribute("d")?.length,
      ).toBeGreaterThan(100),
    );
    expect(
      screen
        .getByRole("img", { name: "Pickup QR code" })
        .getAttribute("viewBox"),
    ).not.toBe("0 0 29 29");
  } finally {
    cleanup();
  }
});
