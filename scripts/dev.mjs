import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureFonts } from "./vendor-fonts.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const lock = JSON.parse(
  await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
);
const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
let installed = true;
for (const name of Object.keys(dependencies)) {
  try {
    const pkg = JSON.parse(
      await readFile(
        new URL(`../node_modules/${name}/package.json`, import.meta.url),
        "utf8",
      ),
    );
    if (pkg.version !== lock.packages[`node_modules/${name}`]?.version)
      installed = false;
  } catch {
    installed = false;
  }
}
if (!installed) {
  console.log("Installing the project dependencies for this checkout…");
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, "ci", "--no-audit", "--no-fund"], {
        cwd: root,
        stdio: "inherit",
      })
    : spawnSync(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["ci", "--no-audit", "--no-fund"],
        { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
      );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
await ensureFonts({ strict: false, timeout: 5000 });
// Run Vite's own CLI so npm run dev -- --port/--host works normally.
await import(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
