// Renders the contribution farm from the GitHub calendar.
// Usage: GITHUB_TOKEN=$(gh auth token) node scripts/solar-farm.mjs [out-dir]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { render } from "../src/components/farm.mjs";
import { fetchCalendar } from "../src/lib/calendar.mjs";
import { optimizeSvg } from "../src/lib/optimize.mjs";
import { loadProject } from "../src/lib/project.mjs";
import { kilobytes, svgProblems } from "../src/lib/validate.mjs";

const outDir = process.argv[2] ?? "farm-output";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN is missing. Locally: GITHUB_TOKEN=$(gh auth token) node scripts/solar-farm.mjs");
  process.exit(1);
}

const project = loadProject();
const calendar = await fetchCalendar(project.content.name.handle, token);
const assets = render(project, calendar).map(({ file, svg }) => ({ file, svg: `${optimizeSvg(svg)}\n` }));

// Nothing is written unless both files are sound, so a bad run leaves the last good farm in place.
const problems = assets.flatMap(({ file, svg }) => svgProblems(file, svg));
if (problems.length > 0) {
  console.error(`Refusing to publish:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
for (const { file, svg } of assets) {
  await writeFile(join(outDir, file), svg);
  console.log(`${file.padEnd(20)} ${kilobytes(Buffer.byteLength(svg)).padStart(9)}`);
}
console.log(`${calendar.total} contributions across ${calendar.days.length} days in ${calendar.weeks} weeks.`);
