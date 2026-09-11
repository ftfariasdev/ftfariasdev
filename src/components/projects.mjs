import { round } from "../lib/format.mjs";
import { svgDocument } from "../lib/svg.mjs";

// Sized for two cards side by side in the README column (<img width="49%">).
const WIDTH = 408;
const HEIGHT = 190;
const PADDING = 24;
const TITLE_BASELINE = 52;
const LINE_BASELINES = [84, 108];
const CHIP = { centerY: 150, height: 30, paddingX: 9, gap: 8, radius: 6 };
const CYCLE = 8; // beats
const TRAVEL = 4; // beats for the current to go from the entry corner to the exit corner
const STAGGER = 2; // beats between one card and the next, in reading order
const DASH = 36;
const EDGE = { left: 1, top: 1, right: WIDTH - 1, bottom: HEIGHT - 1 };

function largestFittingSize(type, face, text, preferred, minimum, available) {
  for (let size = preferred; size >= minimum; size -= 1) {
    if (type.measure(face, size, text) <= available) return size;
  }
  throw new Error(`"${text}" is wider than ${available}px even at ${minimum}px; shorten it in content.json`);
}

// Two branches leave the top-left corner: one runs along the top and down the right side,
// the other down the left side and along the bottom. Both always move right or down.
function branches(radius) {
  const { left, top, right, bottom } = EDGE;
  const straight = right - left - 2 * radius + (bottom - top - 2 * radius);
  const length = straight + (Math.PI * radius) / 2;

  return {
    length,
    topRight: `M${left + radius} ${top}H${right - radius}A${radius} ${radius} 0 0 1 ${right} ${top + radius}V${bottom - radius}`,
    leftBottom: `M${left} ${top + radius}V${bottom - radius}A${radius} ${radius} 0 0 0 ${left + radius} ${bottom}H${right - radius}`,
    // Distance along the left-bottom branch until it passes under x on the bottom edge.
    distanceTo: (x) => bottom - top - 2 * radius + (Math.PI * radius) / 2 + (x - left - radius),
    entry: [round(left + radius * (1 - Math.SQRT1_2)), round(top + radius * (1 - Math.SQRT1_2))],
    exit: [round(right - radius * (1 - Math.SQRT1_2)), round(bottom - radius * (1 - Math.SQRT1_2))],
  };
}

function css(palette, { time, ease }, length) {
  const arrival = (TRAVEL / CYCLE) * 100;
  return [
    `.flow{opacity:0;animation:flow ${time(CYCLE)} ${ease.flow} infinite backwards}`,
    `@keyframes flow{0%{opacity:1;stroke-dashoffset:${DASH}}${arrival}%{opacity:1;stroke-dashoffset:-${round(length)}}${arrival + 0.01}%,to{opacity:0}}`,
    `.entry{animation:depart ${time(CYCLE)} ${ease.breathe} infinite backwards}`,
    "@keyframes depart{0%{opacity:1}12%,to{opacity:.45}}",
    `.exit{animation:arrive ${time(CYCLE)} ${ease.breathe} infinite backwards}`,
    `@keyframes arrive{0%,${arrival - 6}%{opacity:.45}${arrival + 2}%{opacity:1}${arrival + 20}%,to{opacity:.45}}`,
    `.chip{stroke:${palette.lit};fill:${palette.ink};animation:energize ${time(CYCLE)} ${ease.arrive} infinite backwards}`,
    `@keyframes energize{0%{stroke:${palette.photovoltaic};fill:${palette.inkDim}}3%,50%{stroke:${palette.lit};fill:${palette.ink}}62.5%,to{stroke:${palette.photovoltaic};fill:${palette.inkDim}}}`,
  ].join("");
}

function cardSvg(project, theme, card, index) {
  const { tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const radius = tokens.layout.radius;
  const available = WIDTH - PADDING * 2;
  const path = branches(radius);
  const delay = index * STAGGER;

  const titleSize = largestFittingSize(type, "sansBold", card.name, tokens.type.size.display, tokens.type.size.primary, available);
  const lineSize = tokens.type.size.secondary;
  const chipSize = tokens.type.size.chip;

  const lines = card.lines.map((line, lineIndex) => {
    if (type.measure("sans", lineSize, line) > available) {
      throw new Error(`"${line}" is wider than the ${card.name} card; shorten it in content.json`);
    }
    return type.run({ face: "sans", size: lineSize, text: line, x: PADDING, y: LINE_BASELINES[lineIndex], fill: palette.inkDim });
  });

  const chipBaseline = round(CHIP.centerY + type.capHeight("sansBold", chipSize) / 2);
  let x = PADDING;
  const chips = card.chips.map((chip) => {
    const width = type.measure("sansBold", chipSize, chip) + CHIP.paddingX * 2;
    // Each chip switches on when the bottom branch of the current passes beneath it.
    const reached = delay + (path.distanceTo(x + width / 2) / path.length) * TRAVEL;
    const label = type.run({ face: "sansBold", size: chipSize, text: chip, x: x + CHIP.paddingX, y: chipBaseline });
    const markup = `<g class="chip" style="animation-delay:${motion.time(reached)}"><rect x="${round(x)}" y="${CHIP.centerY - CHIP.height / 2}" width="${round(width)}" height="${CHIP.height}" rx="${CHIP.radius}" fill="${palette.sky}" stroke-width="1.5"/><g stroke="none">${label}</g></g>`;
    x += width + CHIP.gap;
    return markup;
  });
  if (x - CHIP.gap > WIDTH - PADDING) {
    throw new Error(`The chips on the ${card.name} card are wider than the card; remove one in content.json`);
  }

  const start = `style="animation-delay:${motion.time(delay)}"`;
  const body = [
    `<rect x="${EDGE.left}" y="${EDGE.top}" width="${EDGE.right - EDGE.left}" height="${EDGE.bottom - EDGE.top}" rx="${radius}" fill="${palette.sky}" stroke="${palette.cell}" stroke-width="1.5"/>`,
    `<g stroke="${palette.current}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${DASH} 2000" fill="none"><path class="flow" ${start} d="${path.topRight}"/><path class="flow" ${start} d="${path.leftBottom}"/></g>`,
    `<circle class="entry" ${start} cx="${path.entry[0]}" cy="${path.entry[1]}" r="4" fill="${palette.current}"/>`,
    `<circle class="exit" ${start} cx="${path.exit[0]}" cy="${path.exit[1]}" r="5" fill="${palette.current}"/>`,
    type.run({ face: "sansBold", size: titleSize, text: card.name, x: PADDING, y: TITLE_BASELINE, fill: palette.ink }),
    ...lines,
    chips.join(""),
  ].join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: card.name,
    desc: card.alt,
    css: css(palette, motion, path.length),
    defs: type.defs(),
    body,
  });
}

export function render(project) {
  return project.content.projects.flatMap((card, index) =>
    project.themes.map((theme) => ({ file: `project-${card.slug}-${theme}.svg`, svg: cardSvg(project, theme, card, index) })),
  );
}
