import { mkdir, writeFile } from "node:fs/promises";
import QRCode from "../src/vendor/qr-code/index.js";
await mkdir("public/testing", { recursive: true });
const items = [
  ["yog", "Greek yoghurt", "482913"],
  ["det", "Top detergent", "635271"],
  ["oat", "Oat milk", "729418"],
];
for (const [id, title, code] of items) {
  const q = new QRCode(-1, 1);
  q.addData(`sharelah:pickup:${id}:${code}`);
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (q.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  await writeFile(
    `public/testing/pickup-${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="328" height="328" viewBox="0 0 ${n + 8} ${n + 8}" role="img" aria-label="${title} pickup QR code"><rect width="100%" height="100%" fill="white"/><path d="${d}" fill="black"/></svg>`,
  );
}
await writeFile(
  "public/testing/pickup-codes.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShareLah pickup cards · facilitator</title><style>body{font:17px system-ui;background:#fffcf8;color:#2b241d;max-width:1000px;margin:40px auto;padding:20px}h1{color:#c44212}main{display:flex;flex-wrap:wrap;gap:24px}article{border:1px solid #eae1d8;border-radius:20px;padding:24px;background:white;width:260px}img{width:260px;height:260px}strong{font-size:32px;letter-spacing:5px}a{color:#c44212}@media print{article{break-inside:avoid}a{display:none}}</style><h1>ShareLah pickup cards</h1><p>Facilitator: print these or show them on another screen. Scan the code for the matching ready split. Greek yoghurt starts ready; use Profile → Testing controls to mark other seeded hosts as purchased.</p><main>${items.map(([id, title, code]) => `<article><h2>${title}</h2><img src="pickup-${id}.svg" alt="${title} QR code"><strong>${code}</strong><p><a href="pickup-${id}.svg" download>Download code</a></p></article>`).join("")}</main><p>Independent demo data. Scanning verifies the portion; receipt confirmation is still required.</p></html>`,
);
console.log("Prepared three printable pickup codes.");
