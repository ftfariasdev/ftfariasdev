import { round } from "../lib/format.mjs";
import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const BUS_X = 96;
const MODULE_TOP = 16; // the PV module symbol that feeds the bus
const MODULE_HEIGHT = 28;
const INVERTER_TOP = 58;
const INVERTER_SIZE = 30;
const FIRST_FEEDER = 128;
const FEEDER_PITCH = 56;
const BOTTOM_PADDING = 36;
const BREAKER_X = 116;
const LABEL_X = 136;
const TAG = { height: 34, paddingX: 14, radius: 6, gap: 26 };
const SPEED = 200; // px per beat, the same on the bus and on every feeder
const CYCLE = 16;
const ENERGIZED = { on: 0.5, holdUntil: 10, off: 12 }; // beats after the current reaches a tag
const DASH = 24;

function css(palette, { time, ease }, flows) {
  const percent = (beats) => round((beats / CYCLE) * 100, 3);
  const flowRules = flows.map(({ name, length }) => {
    const end = percent(length / SPEED);
    return (
      `.${name}{opacity:0;animation:${name} ${time(CYCLE)} ${ease.flow} infinite backwards}` +
      `@keyframes ${name}{0%{opacity:1;stroke-dashoffset:${DASH}}${end}%{opacity:1;stroke-dashoffset:-${round(length)}}${round(end + 0.01, 3)}%,to{opacity:0}}`
    );
  });

  return [
    `.tag{stroke:${palette.lit};fill:${palette.ink};animation:energize ${time(CYCLE)} ${ease.arrive} infinite backwards}`,
    `@keyframes energize{0%{stroke:${palette.photovoltaic};fill:${palette.inkDim}}${percent(ENERGIZED.on)}%,${percent(ENERGIZED.holdUntil)}%{stroke:${palette.lit};fill:${palette.ink}}${percent(ENERGIZED.off)}%,to{stroke:${palette.photovoltaic};fill:${palette.inkDim}}}`,
    ...flowRules,
  ].join("");
}

// Standard single-line symbols: a PV module, then an inverter (DC in, AC out) on top of the bus.
function source(palette) {
  const left = BUS_X - 22;
  const bottom = MODULE_TOP + MODULE_HEIGHT;
  const inverterLeft = BUS_X - INVERTER_SIZE / 2;
  const inverterBottom = INVERTER_TOP + INVERTER_SIZE;

  const sunX = BUS_X - 40;
  const sunY = MODULE_TOP + 6;
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const point = (radius) => `${round(sunX + Math.cos(angle) * radius)} ${round(sunY + Math.sin(angle) * radius)}`;
    return `M${point(7)}L${point(10)}`;
  }).join("");

  return [
    `<circle cx="${sunX}" cy="${sunY}" r="4.5" fill="${palette.sunDisc}"/>`,
    `<path d="${rays}" stroke="${palette.sunDisc}" stroke-width="1.5" stroke-linecap="round"/>`,
    `<rect x="${left}" y="${MODULE_TOP}" width="44" height="${MODULE_HEIGHT}" rx="2" fill="${palette.cell}" stroke="${palette.photovoltaic}"/>`,
    `<path d="M${round(BUS_X - 7.33)} ${MODULE_TOP}V${bottom}M${round(BUS_X + 7.33)} ${MODULE_TOP}V${bottom}M${left} ${MODULE_TOP + MODULE_HEIGHT / 2}H${BUS_X + 22}" stroke="${palette.photovoltaic}"/>`,
    `<rect x="${inverterLeft}" y="${INVERTER_TOP}" width="${INVERTER_SIZE}" height="${INVERTER_SIZE}" fill="${palette.sky}" stroke="${palette.photovoltaic}" stroke-width="1.5"/>`,
    `<path d="M${inverterLeft} ${inverterBottom}L${inverterLeft + INVERTER_SIZE} ${INVERTER_TOP}M${inverterLeft + 4} ${INVERTER_TOP + 7}h8M${inverterLeft + 4} ${INVERTER_TOP + 11}h8M${inverterLeft + 17} ${inverterBottom - 8}q2.5-4 5 0t5 0" stroke="${palette.inkDim}" fill="none"/>`,
  ].join("");
}

function stackSvg(project, theme) {
  const { content, tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const size = tokens.type.size.secondary;
  const layers = content.stack.layers;
  const busTop = MODULE_TOP + MODULE_HEIGHT;
  const baselineOffset = type.capHeight("sansBold", size) / 2;
  const labelEnd = LABEL_X + Math.max(...layers.map(({ name }) => type.measure("sans", size, name)));
  const tagsStart = labelEnd + 36;
  const lastFeeder = FIRST_FEEDER + (layers.length - 1) * FEEDER_PITCH;
  const height = lastFeeder + BOTTOM_PADDING;

  const flows = [{ name: "flow-bus", length: lastFeeder - busTop, delay: 0, d: `M${BUS_X} ${busTop}V${lastFeeder}` }];
  const wires = [`M${BUS_X} ${busTop}V${lastFeeder}`];
  const breakers = [];
  const labels = [];
  const tags = [];

  layers.forEach((layer, index) => {
    const y = FIRST_FEEDER + index * FEEDER_PITCH;
    const reached = (y - busTop) / SPEED;
    const baseline = round(y + baselineOffset);
    let x = tagsStart;

    for (const item of layer.items) {
      const width = type.measure("sansBold", size, item) + TAG.paddingX * 2;
      // Each technology switches on when the current reaches its left edge.
      const delay = motion.time(reached + (x - BUS_X) / SPEED);
      const label = type.run({ face: "sansBold", size, text: item, x: x + TAG.paddingX, y: baseline });
      tags.push(
        `<g class="tag" style="animation-delay:${delay}"><rect x="${round(x)}" y="${y - TAG.height / 2}" width="${round(width)}" height="${TAG.height}" rx="${TAG.radius}" fill="${palette.sky}" stroke-width="1.5"/><g stroke="none">${label}</g></g>`,
      );
      x += width + TAG.gap;
    }

    const feederEnd = round(x - TAG.gap);
    if (feederEnd > WIDTH - 24) {
      throw new Error(`The ${layer.name} feeder runs ${round(feederEnd - WIDTH + 24)}px past the sheet; move an item to another layer in content.json`);
    }
    wires.push(`M${BUS_X} ${y}H${LABEL_X - 8}M${round(labelEnd + 16)} ${y}H${feederEnd}`);
    breakers.push(`<rect x="${BREAKER_X - 5}" y="${y - 5}" width="10" height="10"/>`);
    // A panel-colored plate under the label lets the passing pulse slip beneath it instead of striking it through.
    labels.push(
      `<rect x="${LABEL_X - 6}" y="${y - 12}" width="${round(labelEnd - LABEL_X + 12)}" height="24" fill="${palette.sky}"/>` +
        type.run({ face: "sans", size, text: layer.name, x: LABEL_X, y: baseline, fill: palette.inkDim }),
    );
    flows.push({ name: `flow-${index + 1}`, length: feederEnd - BUS_X, delay: reached, d: `M${BUS_X} ${y}H${feederEnd}` });
  });

  const pulses = flows
    .map(({ name, delay, d }) => `<path class="${name}" style="animation-delay:${motion.time(delay)}" d="${d}"/>`)
    .join("");
  const summary = layers.map(({ name, items }) => `${name}: ${items.join(", ")}`).join(". ");

  const body = [
    `<rect x=".5" y=".5" width="${WIDTH - 1}" height="${height - 1}" rx="${tokens.layout.radius}" fill="${palette.sky}" stroke="${palette.cell}"/>`,
    `<path d="${wires.join("")}" stroke="${palette.photovoltaic}" stroke-width="1.5" fill="none"/>`,
    `<path d="M${BUS_X} ${busTop}V${lastFeeder}" stroke="${palette.photovoltaic}" stroke-width="3.5" stroke-linecap="round"/>`,
    `<g stroke="${palette.current}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${DASH} 2000" fill="none">${pulses}</g>`,
    source(palette),
    `<g fill="${palette.sky}" stroke="${palette.photovoltaic}" stroke-width="1.5">${breakers.join("")}</g>`,
    `<g fill="${palette.inkDim}">${labels.join("")}</g>`,
    tags.join(""),
  ].join("");

  return svgDocument({
    width: WIDTH,
    height,
    title: "Tech stack as a single-line diagram",
    desc: `A solar module feeds an inverter and a busbar. Current runs down the bus into one feeder per layer and switches on each technology. ${summary}.`,
    css: css(palette, motion, flows),
    defs: type.defs(),
    body,
  });
}

export function render(project) {
  return project.themes.map((theme) => ({ file: `stack-${theme}.svg`, svg: stackSvg(project, theme) }));
}
