import { farmLabel, levelsFor } from "../lib/calendar.mjs";
import { round } from "../lib/format.mjs";
import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const HEIGHT = 232;
const GRID = { left: 24, top: 84, pitch: 13, size: 11, radius: 1.5, rows: 7 };
const SKY = { sunY: 40, sunRadius: 12, halo: 44 };
const COLLECTOR_X = 722;
const INVERTER = { x: 744, y: 98, width: 62, height: 60 };
const METER = { x: 752, y: 142, width: 46, height: 6 };
const LABEL_BASELINE = 206;
const BEAM_WIDTH = 90;
const CYCLE = 32; // beats for one day
const DAYLIGHT = 24; // beats the sun needs to cross the farm
const LEVEL_OPACITY = [0.32, 0.55, 0.78, 1];

const percent = (beats) => round((beats / CYCLE) * 100, 3);

function css(palette, { time, ease }, travel) {
  const loop = time(CYCLE);
  const crossing = percent(DAYLIGHT);

  return [
    `.sun{transform:translateX(${round(travel / 2)}px);animation:cross ${loop} ${ease.flow} infinite}`,
    `@keyframes cross{0%{transform:translateX(0);opacity:0}3%{opacity:1}${crossing - 3}%{opacity:1}${crossing}%,to{transform:translateX(${round(travel)}px);opacity:0}}`,
    `.beam{opacity:0;animation:beam ${loop} ${ease.flow} infinite backwards}`,
    `@keyframes beam{0%{opacity:1;transform:translateX(0)}${crossing}%{opacity:1;transform:translateX(${round(travel)}px)}${crossing + 0.01}%,to{opacity:0}}`,
    `.night{opacity:0;animation:night ${loop} ${ease.breathe} infinite}`,
    `@keyframes night{0%,${crossing}%{opacity:0}${crossing + 6}%,96%{opacity:.45}to{opacity:0}}`,
    `.meter{transform-box:fill-box;transform-origin:left center;transform:scaleX(1);animation:generate ${loop} ${ease.breathe} infinite}`,
    `@keyframes generate{0%,to{transform:scaleX(.12)}${percent(DAYLIGHT / 2)}%{transform:scaleX(1)}${crossing}%{transform:scaleX(.12)}}`,
    `.spark{opacity:0;animation:spark ${time(4)} ${ease.flow} infinite}`,
    "@keyframes spark{0%{opacity:1;stroke-dashoffset:18}60%{opacity:1;stroke-dashoffset:-120}60.01%,to{opacity:0}}",
  ].join("");
}

function cellPaths(days, levels) {
  const paths = ["", "", "", "", ""];
  days.forEach((day, index) => {
    const x = round(GRID.left + day.column * GRID.pitch);
    const y = round(GRID.top + day.row * GRID.pitch);
    paths[levels[index]] += `M${x} ${y}h${GRID.size}v${GRID.size}h-${GRID.size}z`;
  });
  return paths;
}

// Standard inverter symbol: direct current in, alternating current out, with a generation meter.
function inverter(palette) {
  const { x, y, width, height } = INVERTER;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" fill="${palette.sky}" stroke="${palette.photovoltaic}" stroke-width="1.5"/>`,
    `<path d="M${x} ${y + height}L${x + width} ${y}M${x + 8} ${y + 14}h12M${x + 8} ${y + 19}h12M${x + 36} ${y + height - 22}q3-5 6 0t6 0" stroke="${palette.inkDim}" fill="none"/>`,
    `<rect x="${METER.x}" y="${METER.y}" width="${METER.width}" height="${METER.height}" rx="3" fill="${palette.cell}"/>`,
    `<rect class="meter" x="${METER.x}" y="${METER.y}" width="${METER.width}" height="${METER.height}" rx="3" fill="${palette.lit}"/>`,
  ].join("");
}

function farmSvg(project, theme, calendar) {
  const { content, tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const levels = levelsFor(calendar.days);
  const paths = cellPaths(calendar.days, levels);
  const gridWidth = calendar.weeks * GRID.pitch - (GRID.pitch - GRID.size);
  const gridHeight = GRID.rows * GRID.pitch - (GRID.pitch - GRID.size);
  const travel = gridWidth - GRID.size;
  const label = farmLabel(calendar.total, content.farm);
  const wire = `M${COLLECTOR_X} ${GRID.top}V${GRID.top + gridHeight}M${COLLECTOR_X} ${round(GRID.top + gridHeight / 2)}H${INVERTER.x}`;

  const body = [
    '<g clip-path="url(#frame)">',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>`,
    `<g class="sun"><circle cx="${GRID.left + GRID.size / 2}" cy="${SKY.sunY}" r="${SKY.halo}" fill="url(#halo)"/><circle cx="${GRID.left + GRID.size / 2}" cy="${SKY.sunY}" r="${SKY.sunRadius}" fill="${palette.sunDisc}"/></g>`,
    `<path d="${paths[0]}" fill="${palette.cell}"/>`,
    ...LEVEL_OPACITY.map((opacity, index) => `<use href="#level-${index + 1}" fill="${palette.lit}" fill-opacity="${opacity}"/>`),
    // The passing light only brightens days that have contributions, so empty days stay dark.
    `<g clip-path="url(#charged)"><rect class="beam" x="${GRID.left - BEAM_WIDTH / 2}" y="${GRID.top - 4}" width="${BEAM_WIDTH}" height="${gridHeight + 8}" fill="url(#beam)"/></g>`,
    `<path d="${wire}" stroke="${palette.photovoltaic}" stroke-width="1.5" fill="none"/>`,
    `<path class="spark" d="M${COLLECTOR_X} ${round(GRID.top + gridHeight / 2)}H${INVERTER.x}" stroke="${palette.current}" stroke-width="3" stroke-linecap="round" stroke-dasharray="18 200" fill="none"/>`,
    inverter(palette),
    type.run({ face: "sans", size: tokens.type.size.secondary, text: label, x: GRID.left, y: LABEL_BASELINE, fill: palette.inkDim }),
    `<rect class="night" width="${WIDTH}" height="${HEIGHT}" fill="${palette.skyHigh}"/>`,
    "</g>",
  ].join("");

  const defs = [
    `<clipPath id="frame"><rect width="${WIDTH}" height="${HEIGHT}" rx="${tokens.layout.radius}"/></clipPath>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.skyHigh}"/><stop offset=".5" stop-color="${palette.sky}"/></linearGradient>`,
    `<radialGradient id="halo" cx="${GRID.left + GRID.size / 2}" cy="${SKY.sunY}" r="${SKY.halo}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${palette.sun}" stop-opacity=".5"/><stop offset="1" stop-color="${palette.sun}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="beam"><stop offset="0" stop-color="${palette.lit}" stop-opacity="0"/><stop offset=".5" stop-color="${palette.lit}" stop-opacity=".85"/><stop offset="1" stop-color="${palette.lit}" stop-opacity="0"/></linearGradient>`,
    ...paths.slice(1).map((d, index) => `<path id="level-${index + 1}" d="${d}"/>`),
    `<clipPath id="charged">${paths.slice(1).map((_, index) => `<use href="#level-${index + 1}"/>`).join("")}</clipPath>`,
    type.defs(),
  ].join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: "Solar contribution farm",
    desc: `Every cell is one day of the last year on GitHub; the more contributions, the brighter the cell. The sun crosses the farm, the days it lights feed an inverter. ${label}.`,
    css: css(palette, motion, travel),
    defs,
    body,
  });
}

export function render(project, calendar) {
  return project.themes.map((theme) => ({ file: `farm-${theme}.svg`, svg: farmSvg(project, theme, calendar) }));
}
