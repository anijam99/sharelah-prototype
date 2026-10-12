import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
await mkdir("public/licenses", { recursive: true });
for (const name of ["react", "react-dom", "lucide-react", "idb", "leaflet"])
  await copyFile(`node_modules/${name}/LICENSE`, `public/licenses/${name}.txt`);
const mit = await readFile("node_modules/react/LICENSE", "utf8");
for (const [name, copyright] of Object.entries({
  "zxing-wasm": "Copyright (c) 2023 Ze-Zheng Wu",
  qrcode: "Copyright (c) 2009 Kazuhiko Arase",
  emscripten:
    "Copyright (c) 2010-2014 Emscripten authors, see https://github.com/emscripten-core/emscripten/blob/main/AUTHORS",
  musl: "Copyright © 2005-2020 Rich Felker, et al.",
}))
  await writeFile(
    `public/licenses/${name}-MIT.txt`,
    mit.replace(/Copyright[^\n]+/, copyright),
  );
const apache = (await readFile("src/vendor/qr-code/LICENSE", "utf8")).split(
  "==============================================================",
)[0];
await writeFile("public/licenses/Apache-2.0.txt", apache);
await copyFile("THIRD_PARTY_NOTICES.md", "public/THIRD_PARTY_NOTICES.md");
console.log("Bundled runtime dependency notices.");
