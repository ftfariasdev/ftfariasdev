import { svgDocument } from "../lib/svg.mjs";

const COLUMNS = 24;
const ROWS = 8;
const CELL = { width: 14, height: 5, radius: 1, columnPitch: 20, rowPitch: 7 };
const PADDING = 5;
const WIDTH = COLUMNS * CELL.columnPitch - (CELL.columnPitch - CELL.width) + PADDING * 2;
const HEIGHT = ROWS * CELL.rowPitch - (CELL.rowPitch - CELL.height) + PADDING * 2;
// One level per beat of a 4-beat bar: kick, off-beat, snare, off-beat.
const BAR = [8, 3, 6, 2];
const PEAK_ROWS = 3; // the top rows light in sun amber, like a meter's peak zone

// Columns rise toward the middle, so the meter reads as one arch.
const heightOf = (column) => Math.round(4 + 4 * Math.sin((Math.PI * column) / (COLUMNS - 1)));

// Neighbouring columns are one beat apart, so the peak travels one column to the right on every beat.
const phaseOf = (column) => (BAR.length - (column % BAR.length)) % BAR.length;

// A cell changes at most once per beat (1.6 Hz), well under the three-flashes-per-second limit.
function rowPattern(row) {
  return BAR.map((level) => (level >= row ? 1 : 0)).join("");
}

function css({ time }) {
  const patterns = new Set();
  for (let row = 1; row <= ROWS; row += 1) patterns.add(rowPattern(row));

  const rules = [...patterns]
    .filter((pattern) => pattern.includes("0"))
    .map((pattern) => {
      const [first, second, third, fourth] = [...pattern];
      return `.lv-${pattern}{animation:lv-${pattern} ${time(BAR.length)} step-end infinite}@keyframes lv-${pattern}{0%{opacity:${first}}25%{opacity:${second}}50%{opacity:${third}}75%,to{opacity:${fourth}}}`;
    });
  const phases = BAR.map((_, phase) => (phase === 0 ? "" : `.p${phase} rect{animation-delay:-${time(phase)}}`));

  return [...rules, ...phases].join("");
}

function meterSvg(project, theme) {
  const palette = project.palette(theme);
  const gridWidth = WIDTH - PADDING * 2;
  const gridHeight = HEIGHT - PADDING * 2;

  const columns = Array.from({ length: COLUMNS }, (_, column) => {
    const x = PADDING + column * CELL.columnPitch;
    const cells = Array.from({ length: heightOf(column) }, (_, index) => {
      const row = index + 1;
      const y = PADDING + (ROWS - row) * CELL.rowPitch;
      const pattern = rowPattern(row);
      const animated = pattern.includes("0") ? ` class="lv-${pattern}"` : "";
      const peak = row > ROWS - PEAK_ROWS ? ` fill="${palette.sun}"` : "";
      return `<rect${animated}${peak} x="${x}" y="${y}" width="${CELL.width}" height="${CELL.height}" rx="${CELL.radius}"/>`;
    }).join("");
    return `<g class="p${phaseOf(column)}">${cells}</g>`;
  }).join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: "Music level meter",
    desc: `A level meter built from solar cells bounces on every beat at ${project.tokens.tempo.bpm} BPM, with the peak travelling left to right.`,
    css: css(project.motion),
    defs: `<pattern id="idle" width="${CELL.columnPitch}" height="${CELL.rowPitch}" x="${PADDING}" y="${PADDING}" patternUnits="userSpaceOnUse"><rect width="${CELL.width}" height="${CELL.height}" rx="${CELL.radius}" fill="${palette.cell}"/></pattern>`,
    body: `<rect x="${PADDING}" y="${PADDING}" width="${gridWidth}" height="${gridHeight}" fill="url(#idle)"/><g fill="${palette.lit}">${columns}</g>`,
  });
}

export function render(project) {
  return project.themes.map((theme) => ({ file: `vu-meter-${theme}.svg`, svg: meterSvg(project, theme) }));
}
