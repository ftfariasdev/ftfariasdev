import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const KB = 1024;
const LIMITS = { file: 150 * KB, total: 1024 * KB };
const ALLOWED_URLS = new Set(["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink"]);
const TEXT_SOURCES = ["README.md", "CLAUDE.md", "src", "scripts", "docs", ".github", "test"];

// Assembled from parts so this file does not flag itself.
const OLD_LINKEDIN_HANDLE = ["dev", "felipe", "farias"].join("");
const PHONE_NUMBER = /(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/;

const problems = [];
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

async function checkAssets() {
  const dir = new URL("assets/", root);
  const files = existsSync(dir) ? (await readdir(dir)).filter((file) => file.endsWith(".svg")).sort() : [];
  let total = 0;

  for (const file of files) {
    const svg = await readFile(new URL(file, dir), "utf8");
    const size = Buffer.byteLength(svg);
    total += size;
    console.log(`${file.padEnd(32)} ${kb(size).padStart(9)}`);

    if (size > LIMITS.file) problems.push(`${file}: ${kb(size)} is over the ${kb(LIMITS.file)} limit`);
    if (/<script/i.test(svg)) problems.push(`${file}: contains <script>`);
    if (/<foreignObject/i.test(svg)) problems.push(`${file}: contains <foreignObject>`);
    if (/@import/i.test(svg)) problems.push(`${file}: contains @import`);
    for (const [url] of svg.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
      if (!ALLOWED_URLS.has(url)) problems.push(`${file}: loads an external URL (${url})`);
    }
    if (!/^<svg[^>]*\srole="img"/.test(svg)) problems.push(`${file}: root <svg> needs role="img"`);
    if (!/<title>[^<]+<\/title>/.test(svg)) problems.push(`${file}: needs a <title>`);
    if (!/<desc>[^<]+<\/desc>/.test(svg)) problems.push(`${file}: needs a <desc>`);
    if (!/prefers-reduced-motion:\s?reduce/.test(svg)) problems.push(`${file}: needs the reduced-motion rule`);
  }

  console.log(`${"total".padEnd(32)} ${kb(total).padStart(9)} across ${files.length} files`);
  if (total > LIMITS.total) problems.push(`assets add up to ${kb(total)}, over the ${kb(LIMITS.total)} budget`);
}

async function textFiles(path) {
  const url = new URL(path, root);
  if (!existsSync(url)) return [];
  if (!(await stat(url)).isDirectory()) return [path];
  const entries = await readdir(url, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => textFiles(`${path}/${entry.name}`)),
  );
  return nested.flat();
}

async function checkPrivateData() {
  const files = (await Promise.all(TEXT_SOURCES.map(textFiles))).flat().filter((file) => !/\.(woff2?|png)$/.test(file));

  for (const file of files) {
    const text = await readFile(new URL(file, root), "utf8");
    if (text.toLowerCase().includes(OLD_LINKEDIN_HANDLE)) problems.push(`${file}: mentions the old LinkedIn handle`);
    if (/wa\.me\//i.test(text)) problems.push(`${file}: contains a WhatsApp link`);
    if (PHONE_NUMBER.test(text)) problems.push(`${file}: contains something that looks like a phone number`);
  }
}

await checkAssets();
await checkPrivateData();

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
