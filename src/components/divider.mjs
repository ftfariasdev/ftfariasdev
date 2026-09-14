import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const HEIGHT = 28;
const WIRE = { from: 8, to: 806, y: 14 };
const NODE = { x: 812, radius: 6 };
const MODULE = { width: 22, height: 12, radius: 2, step: 34, count: 16 };
const CYCLE = 8; // beats: the pulse travels for 4, then the string rests for 4
const TRAVEL = 4;

// The first divider continues the hero's pulse, which reaches the bottom edge on beat 8.
// The rest start part-way through the cycle, so no two dividers on the page pulse together.
const VARIANTS = [
  { delay: 8, stringStart: 24 },
  { delay: -3, stringStart: 58 },
  { delay: -5, stringStart: 41 },
  { delay: -2, stringStart: 75 },
  { delay: -6, stringStart: 32 },
  { delay: -1, stringStart: 66 },
];

function css(palette, { time, ease }) {
  const length = WIRE.to - WIRE.from;
  const arrival = (TRAVEL / CYCLE) * 100;

  return [
    `.pulse{opacity:0;animation:travel ${time(CYCLE)} ${ease.flow} infinite backwards}`,
    `.module{animation:charge ${time(CYCLE)} ${ease.flow} infinite backwards}`,
    `.node{animation:arrive ${time(CYCLE)} ${ease.breathe} infinite backwards}`,
    `@keyframes travel{0%{opacity:1;stroke-dashoffset:30}${arrival}%{opacity:1;stroke-dashoffset:-${length}}${arrival + 0.01}%,to{opacity:0}}`,
    `@keyframes charge{0%,16%,to{fill:${palette.cell}}4%{fill:${palette.lit}}}`,
    `@keyframes arrive{0%,${arrival - 6}%{opacity:.45}${arrival + 2}%{opacity:1}${arrival + 20}%,to{opacity:.45}}`,
  ].join("");
}

function dividerSvg(project, theme, { delay, stringStart }) {
  const palette = project.palette(theme);
  const { motion } = project;
  const length = WIRE.to - WIRE.from;
  const wire = `M${WIRE.from} ${WIRE.y}H${WIRE.to}`;

  // Idle modules look like the hero's cells; each one turns gold the moment the pulse reaches its center.
  const modules = Array.from({ length: MODULE.count }, (_, index) => {
    const x = stringStart + index * MODULE.step;
    const reached = delay + ((x + MODULE.width / 2 - WIRE.from) / length) * TRAVEL;
    return `<rect class="module" style="animation-delay:${motion.time(reached)}" x="${x}" y="${WIRE.y - MODULE.height / 2}" width="${MODULE.width}" height="${MODULE.height}" rx="${MODULE.radius}"/>`;
  }).join("");

  const body = [
    `<path d="${wire}" stroke="${palette.photovoltaic}" stroke-width="1.5"/>`,
    `<g fill="${palette.cell}" stroke="${palette.photovoltaic}">${modules}</g>`,
    `<path class="pulse" style="animation-delay:${motion.time(delay)}" d="${wire}" stroke="${palette.current}" stroke-width="3" stroke-linecap="round" stroke-dasharray="30 900"/>`,
    `<circle class="node" style="animation-delay:${motion.time(delay)}" cx="${NODE.x}" cy="${WIRE.y}" r="${NODE.radius}" fill="${palette.current}"/>`,
  ].join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: "Section divider",
    desc: "A pulse of current runs along a string of solar modules into a junction box.",
    css: css(palette, motion),
    body,
  });
}

export function render(project) {
  return VARIANTS.flatMap((variant, index) =>
    project.themes.map((theme) => ({ file: `divider-${index + 1}-${theme}.svg`, svg: dividerSvg(project, theme, variant) })),
  );
}
