import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { kilobytes, LIMITS, svgProblems } from "../src/lib/validate.mjs";

const root = new URL("../", import.meta.url);
const TEXT_SOURCES = ["README.md", "CLAUDE.md", "src", "scripts", "docs", ".github", "test"];

// Assembled from parts so this file does not flag itself.
const OLD_LINKEDIN_HANDLE = ["dev", "felipe", "farias"].join("");
const PHONE_NUMBER = /(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?9\d{4}[\s-]?\d{4}\b/;

const problems = [];

async function checkAssets() {
  const dir = new URL("assets/", root);
  const files = existsSync(dir) ? (await readdir(dir)).filter((file) => file.endsWith(".svg")).sort() : [];
  let total = 0;

  for (const file of files) {
    const svg = await readFile(new URL(file, dir), "utf8");
    const size = Buffer.byteLength(svg);
    total += size;
    console.log(`${file.padEnd(32)} ${kilobytes(size).padStart(9)}`);
    problems.push(...svgProblems(file, svg));
  }

  console.log(`${"total".padEnd(32)} ${kilobytes(total).padStart(9)} across ${files.length} files`);
  if (total > LIMITS.total) problems.push(`assets add up to ${kilobytes(total)}, over the ${kilobytes(LIMITS.total)} budget`);
}

async function textFiles(path) {
  const url = new URL(path, root);
  if (!existsSync(url)) return [];
  if (!(await stat(url)).isDirectory()) return [path];

  const entries = await readdir(url, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => textFiles(`${path}/${entry.name}`)));
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
