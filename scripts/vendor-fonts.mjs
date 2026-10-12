import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const fonts = {
  inter:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
  bricolage:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf",
};
export async function ensureFonts({ strict = true, timeout = 30000 } = {}) {
  await mkdir("public/fonts", { recursive: true });
  for (const [name, url] of Object.entries(fonts)) {
    const fontPath = `public/fonts/${name}.ttf`,
      licensePath = `public/fonts/${name}-OFL.txt`;
    try {
      const [existing, license] = await Promise.all([
        readFile(fontPath),
        readFile(licensePath, "utf8"),
      ]);
      if (existing.length > 1000 && license.includes("SIL OPEN FONT LICENSE"))
        continue;
    } catch {}
    try {
      const [fontResponse, licenseResponse] = await Promise.all([
        fetch(url, { signal: AbortSignal.timeout(timeout) }),
        fetch(url.slice(0, url.lastIndexOf("/")) + "/OFL.txt", {
          signal: AbortSignal.timeout(timeout),
        }),
      ]);
      if (!fontResponse.ok || !licenseResponse.ok)
        throw Error("Download returned an error");
      const font = Buffer.from(await fontResponse.arrayBuffer()),
        license = await licenseResponse.text();
      if (font.length < 1000 || !license.includes("SIL OPEN FONT LICENSE"))
        throw Error("Invalid font or missing license");
      await Promise.all([
        writeFile(fontPath, font),
        writeFile(licensePath, license),
      ]);
      console.log(`Prepared ${name} font.`);
    } catch (error) {
      if (strict)
        throw Error(`Could not prepare ${name} font: ${error.message}`, {
          cause: error,
        });
      console.warn(
        `Could not download ${name}; using the system-font fallback for this session. It will retry next time.`,
      );
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await ensureFonts();
