import type { ZXingReaderModule } from "./vendor/zxing-reader.js";
let engine: Promise<ZXingReaderModule> | undefined;
export async function decodeQR(image: ImageData): Promise<string | null> {
  engine ??= import("./vendor/zxing-reader.js")
    .then((m) => m.default({ locateFile: (f: string) => "/vendor/" + f }))
    .catch((error) => {
      engine = undefined;
      throw error;
    });
  const mod = await engine!,
    gray = new Uint8Array(image.width * image.height);
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4;
    gray[i] =
      (306 * image.data[j] +
        601 * image.data[j + 1] +
        117 * image.data[j + 2] +
        512) >>
      10;
  }
  const ptr = mod._malloc(gray.length);
  if (!ptr) throw Error("Not enough memory to scan this image.");
  try {
    mod.HEAPU8.set(gray, ptr);
    const results = mod.readBarcodesFromPixmap(ptr, image.width, image.height, {
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
    try {
      return results.size() ? results.get(0).text : null;
    } finally {
      results.delete();
    }
  } finally {
    mod._free(ptr);
  }
}
export async function imageDataFromFile(file: Blob) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Choose a photo smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height)),
      canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function compressPhoto(blob: Blob): Promise<Blob> {
  if (blob.size > 20 * 1024 * 1024)
    throw Error("Choose a photo smaller than 20 MB.");
  const pixels = await imageDataFromFile(blob);
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext("2d")!.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("Could not save this photo."))),
      "image/jpeg",
      0.82,
    ),
  );
}
