import { round } from "../lib/format.mjs";
import { randomSequence } from "../lib/random.mjs";
import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const HEIGHT = 220;
const HORIZON = 168;
const QUOTE_BASELINES = [66, 98];
// The sun sets in the west, on the right, the opposite corner from the hero's sunrise.
const SUN = { x: 690, radius: 26, rest: -10, start: -38, end: 34 };
const MODULES = { count: 14, x: 40, step: 38, width: 30, height: 12 };
const STARS = 18;
const CYCLE = 32; // beats

// Moments in the loop, in beats.
const DUSK = { risen: 2, set: 24, gone: 26, restart: 30, modulesOff: 12, perModule: 0.5, starsFrom: 16, starsFull: 24 };

const percent = (beats) => round((beats / CYCLE) * 100, 3);

function css(palette, { time }) {
  const loop = time(CYCLE);
  return [
    `.sun{transform:translateY(${SUN.rest}px);animation:set ${loop} linear infinite}`,
    `@keyframes set{0%{transform:translateY(${SUN.start}px);opacity:0}${percent(DUSK.risen)}%{opacity:1}${percent(DUSK.set)}%{transform:translateY(${SUN.end}px);opacity:1}${percent(DUSK.gone)}%,to{transform:translateY(${SUN.end}px);opacity:0}}`,
    `.dusk{opacity:.7;animation:dusk ${loop} linear infinite}`,
    `@keyframes dusk{0%,to{opacity:1}${percent(DUSK.set)}%,${percent(DUSK.restart)}%{opacity:.25}}`,
    `.module{fill:${palette.lit};animation:power ${loop} linear infinite backwards}`,
    `@keyframes power{0%,${percent(DUSK.modulesOff)}%{fill:${palette.lit}}${percent(DUSK.modulesOff + 1)}%,${percent(DUSK.restart)}%{fill:${palette.cell}}to{fill:${palette.lit}}}`,
    `.stars{opacity:.5;animation:night ${loop} linear infinite}`,
    `@keyframes night{0%,${percent(DUSK.starsFrom)}%{opacity:0}${percent(DUSK.starsFull)}%,${percent(DUSK.restart)}%{opacity:1}to{opacity:0}}`,
  ].join("");
}

function stars(palette) {
  if (!palette.starOpacity) return "";
  const random = randomSequence(19);
  const quoteBand = [QUOTE_BASELINES[0] - 30, QUOTE_BASELINES[1] + 12];
  const circles = [];

  while (circles.length < STARS) {
    const cx = round(random() * WIDTH);
    const cy = round(8 + random() * (HORIZON - 40));
    const r = round(0.6 + random() * 0.8);
    if (cy > quoteBand[0] && cy < quoteBand[1]) continue;
    circles.push(`<circle cx="${cx}" cy="${cy}" r="${r}"/>`);
  }
  return `<g class="stars" fill="${palette.ink}">${circles.join("")}</g>`;
}

function footerSvg(project, theme) {
  const { content, tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const quote = content.footer.quote;

  const modules = Array.from({ length: MODULES.count }, (_, index) => {
    const x = MODULES.x + index * MODULES.step;
    // Modules switch off one after another, left to right, as the light fades.
    return `<rect class="module" style="animation-delay:${motion.time(index * DUSK.perModule)}" x="${x}" y="${HORIZON - MODULES.height - 4}" width="${MODULES.width}" height="${MODULES.height}" rx="2"/>`;
  }).join("");

  const lines = quote.map((line, index) =>
    type.run({ face: "sansItalic", size: tokens.type.size.primary, text: line, x: WIDTH / 2, y: QUOTE_BASELINES[index], anchor: "middle", fill: palette.ink }),
  );

  const body = [
    '<g clip-path="url(#frame)">',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>`,
    stars(palette),
    `<rect class="dusk" width="${WIDTH}" height="${HEIGHT}" fill="url(#dusk)"/>`,
    `<circle class="sun" cx="${SUN.x}" cy="${HORIZON}" r="${SUN.radius}" fill="${palette.sunDisc}"/>`,
    `<rect y="${HORIZON}" width="${WIDTH}" height="${HEIGHT - HORIZON}" fill="${palette.ground}"/>`,
    `<path d="M0 ${HORIZON + 0.5}H${WIDTH}" stroke="${palette.inkDim}" stroke-opacity=".45"/>`,
    `<g stroke="${palette.photovoltaic}">${modules}</g>`,
    ...lines,
    "</g>",
  ].join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: quote.join(" "),
    desc: `The sun sets slowly behind the horizon while a row of solar modules switches off one by one and the stars come out, then the evening starts again. The quote reads: ${quote.join(" ")}`,
    css: css(palette, motion),
    defs: [
      `<clipPath id="frame"><rect width="${WIDTH}" height="${HEIGHT}" rx="${tokens.layout.radius}"/></clipPath>`,
      `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.skyHigh}"/><stop offset=".55" stop-color="${palette.sky}"/><stop offset="1" stop-color="${palette.dawn}"/></linearGradient>`,
      `<radialGradient id="dusk" cx="${SUN.x}" cy="${HORIZON}" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${palette.sun}" stop-opacity=".5"/><stop offset="1" stop-color="${palette.sun}" stop-opacity="0"/></radialGradient>`,
      type.defs(),
    ].join(""),
    body,
  });
}

export function render(project) {
  return project.themes.map((theme) => ({ file: `footer-${theme}.svg`, svg: footerSvg(project, theme) }));
}
