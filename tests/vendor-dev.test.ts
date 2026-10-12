import { it, expect } from "vitest";
import { createServer } from "vite";
it("Vite transforms both QR entrypoints in development", async () => {
  // Middleware mode checks the real dev transforms without binding a network port.
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    for (const source of [
      "/src/ui.tsx",
      "/src/qr.ts",
      "/src/vendor/zxing-reader.js",
      "/src/vendor/qr-code/index.js",
      "/src/vendor/qr-code/QRUtil.js",
      "/src/vendor/qr-code/QRPolynomial.js",
    ]) {
      const transformed = await server.transformRequest(source);
      expect(transformed?.code.length).toBeGreaterThan(0);
      expect(transformed?.code).not.toContain('"/vendor/qr-code/index.js"');
      expect(transformed?.code).not.toContain('"/vendor/zxing-reader.js"');
    }
  } finally {
    await server.close();
  }
});
