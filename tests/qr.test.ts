import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
// The same vendored engines used by the browser, tested without a camera or network.
it("generates and decodes a real pickup QR code through the packaged WASM reader", async () => {
  const QRCode = (await import("../src/vendor/qr-code/index.js")).default;
  const factory = (await import("../src/vendor/zxing-reader.js")).default;
  const module = await factory({
    wasmBinary: new Uint8Array(
      await readFile(
        new URL("../public/vendor/zxing_reader.wasm", import.meta.url),
      ),
    ),
  });
  const payload = "sharelah:pickup:yog:482913",
    qr = new QRCode(-1, 1);
  qr.addData(payload);
  qr.make();
  const n = qr.getModuleCount(),
    scale = 8,
    size = (n + 8) * scale,
    gray = new Uint8Array(size * size).fill(255);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.isDark(y, x))
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            gray[((y + 4) * scale + dy) * size + (x + 4) * scale + dx] = 0;
  const ptr = module._malloc(gray.length);
  module.HEAPU8.set(gray, ptr);
  const result = module.readBarcodesFromPixmap(ptr, size, size, {
    formats: "QRCode",
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
    tryDownscale: true,
    tryDenoise: false,
    binarizer: 0,
    isPure: false,
    downscaleFactor: 3,
    downscaleThreshold: 500,
    minLineCount: 2,
    maxNumberOfSymbols: 1,
    validateOptionalChecksum: false,
    returnErrors: false,
    eanAddOnSymbol: 0,
    textMode: 2,
    characterSet: 0,
    tryCode39ExtendedMode: true,
  });
  expect(result.size()).toBe(1);
  expect(result.get(0).text).toBe(payload);
  result.delete();
  module._free(ptr);
});
