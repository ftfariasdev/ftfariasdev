// Freezes every asset at chosen moments and saves screenshots to preview/.
// Usage: node scripts/preview.mjs [file-filter] [--times=0,2.5,5,10]
import { mkdir, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = new URL("../", import.meta.url);
const outDir = new URL("preview/", root);
const GITHUB_BACKGROUND = { dark: "#0d1117", light: "#ffffff" };

const args = process.argv.slice(2);
const filter = args.find((arg) => !arg.startsWith("--")) ?? "";
const times = (args.find((arg) => arg.startsWith("--times="))?.slice("--times=".length) ?? "0,2.5,5,10")
  .split(",")
  .map(Number);

const variants = [
  { suffix: "", width: 830, reducedMotion: "no-preference", frames: times },
  { suffix: "-reduced", width: 830, reducedMotion: "reduce", frames: [0] },
  { suffix: "-380", width: 380, reducedMotion: "no-preference", frames: [times.at(-1)] },
];

const files = (await readdir(new URL("assets/", root)))
  .filter((file) => file.endsWith(".svg") && file.includes(filter))
  .sort();
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const file of files) {
    const svg = await readFile(new URL(`assets/${file}`, root), "utf8");
    const theme = file.includes("-light") ? "light" : "dark";
    const name = file.replace(/\.svg$/, "");

    for (const { suffix, width, reducedMotion, frames } of variants) {
      const page = await browser.newPage({ viewport: { width: width + 32, height: 1200 } });
      await page.emulateMedia({ reducedMotion, colorScheme: theme });
      // A data attribute, not an id: ids inside the inlined SVG share the page's namespace.
      await page.setContent(
        `<body style="margin:0;padding:16px;background:${GITHUB_BACKGROUND[theme]}">` +
          `<style>[data-preview] svg{display:block;width:100%;height:auto}</style>` +
          `<div data-preview style="width:${width}px">${svg}</div></body>`,
      );

      for (const seconds of frames) {
        await page.evaluate((ms) => {
          for (const animation of document.getAnimations()) {
            animation.pause();
            animation.currentTime = ms;
          }
        }, seconds * 1000);
        const path = fileURLToPath(new URL(`${name}${suffix}-${seconds}s.png`, outDir));
        await page.locator("[data-preview]").screenshot({ path });
      }
      await page.close();
    }
    console.log(`previewed ${file}`);
  }
} finally {
  await browser.close();
}
