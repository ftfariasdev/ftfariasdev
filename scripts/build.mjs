import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../src/components/index.mjs";
import { optimizeSvg } from "../src/lib/optimize.mjs";
import { loadProject } from "../src/lib/project.mjs";

const root = new URL("../", import.meta.url);
const assetsDir = new URL("assets/", root);

// Pure: the same tokens and content always produce the same bytes.
export function renderAssets(project = loadProject()) {
  return components
    .flatMap((component) => component.render(project))
    .map(({ file, svg }) => ({ file, svg: `${optimizeSvg(svg)}\n` }))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

async function writeAssets(assets) {
  await mkdir(assetsDir, { recursive: true });
  const expected = new Set(assets.map(({ file }) => file));

  for (const file of await readdir(assetsDir)) {
    if (file.endsWith(".svg") && !expected.has(file)) await rm(new URL(file, assetsDir));
  }
  for (const { file, svg } of assets) {
    await writeFile(new URL(file, assetsDir), svg);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const assets = renderAssets();
  await writeAssets(assets);

  for (const { file, svg } of assets) {
    console.log(`${file.padEnd(32)} ${(Buffer.byteLength(svg) / 1024).toFixed(1).padStart(6)} KB`);
  }
  console.log(`Built ${assets.length} assets.`);
}
