import { round } from "../lib/format.mjs";
import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const PADDING = { x: 32, top: 44, bottom: 26 };
const LINE_HEIGHT = 25;
const CYCLE = 32; // beats in one loop
const TICK = 0.25; // beats per typed character
const HOLD_UNTIL = 28; // the finished screen holds until here, then fades out
const FADED = 30;

const percent = (beat) => round((beat / CYCLE) * 100, 3);
const justBefore = (beat) => round(percent(beat) - 0.01, 3);

// about.json pretty-printed as colored tokens, with arrays kept on one line.
function jsonLines(json) {
  const entries = Object.entries(json);
  const lines = [[["punct", "{"]]];

  entries.forEach(([key, value], index) => {
    const tokens = [["punct", "  "], ["key", JSON.stringify(key)], ["punct", ": "]];
    if (Array.isArray(value)) {
      tokens.push(["punct", "["]);
      value.forEach((item, itemIndex) => {
        if (itemIndex > 0) tokens.push(["punct", ", "]);
        tokens.push(["string", JSON.stringify(item)]);
      });
      tokens.push(["punct", "]"]);
    } else {
      tokens.push(["string", JSON.stringify(value)]);
    }
    if (index < entries.length - 1) tokens.push(["punct", ","]);
    lines.push(tokens);
  });

  lines.push([["punct", "}"]]);
  return lines;
}

// When every line appears, derived from the content so longer commands still fit the loop.
function buildScript(terminal) {
  const script = [];
  let beat = 0;

  const command = (text) => {
    const line = { tokens: [["prompt", terminal.prompt]], command: text, appear: beat, typeAt: beat + 1 };
    line.typedAt = line.typeAt + [...text].length * TICK;
    beat = line.typedAt + 0.5;
    line.caretUntil = beat;
    script.push(line);
  };

  command("whoami");
  script.push({ tokens: [["output", terminal.whoami]], appear: beat });
  beat += 0.5;
  command(`cat ${terminal.file}`);
  for (const tokens of jsonLines(terminal.json)) {
    script.push({ tokens, appear: beat });
    beat += 0.5;
  }
  script.push({ tokens: [["prompt", terminal.prompt]], appear: beat, finalCaret: true });

  if (beat >= HOLD_UNTIL) throw new Error(`The terminal script needs ${beat} beats; the loop holds from beat ${HOLD_UNTIL}`);
  return script;
}

function visibleFrom(name, beat) {
  const hidden = beat === 0 ? "" : `0%,${justBefore(beat)}%{opacity:0}`;
  return `@keyframes ${name}{${hidden}${percent(beat)}%,${percent(HOLD_UNTIL)}%{opacity:1}${percent(FADED)}%,to{opacity:0}}`;
}

function visibleBetween(name, from, until) {
  const hidden = from === 0 ? "" : `0%,${justBefore(from)}%{opacity:0}`;
  return `@keyframes ${name}{${hidden}${percent(from)}%,${justBefore(until)}%{opacity:1}${percent(until)}%,to{opacity:0}}`;
}

function terminalSvg(project, theme) {
  const { content, tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const terminal = content.about.terminal;
  const size = tokens.type.size.terminal;
  const advance = type.measure("mono", size, " ");
  const loop = motion.time(CYCLE);
  const colors = {
    prompt: palette.sun,
    command: palette.ink,
    output: palette.inkDim,
    key: palette.ink,
    string: palette.irradiance,
    punct: palette.inkDim,
  };

  const script = buildScript(terminal);
  const commandX = PADDING.x + ([...terminal.prompt].length + 1) * advance;
  const height = PADDING.top + (script.length - 1) * LINE_HEIGHT + PADDING.bottom;
  const css = [`.cursor{animation:blink ${motion.time(2)} steps(1,end) infinite}`, "@keyframes blink{50%{opacity:0}}"];

  const cursor = (y) =>
    `<rect class="cursor" x="${round(commandX)}" y="${y - 15}" width="${round(advance - 2)}" height="19" fill="${palette.current}"/>`;

  const lines = script.map((line, index) => {
    const y = PADDING.top + index * LINE_HEIGHT;
    let column = 0;
    const parts = line.tokens.map(([kind, text]) => {
      const run = type.run({ face: "mono", size, text, x: PADDING.x + column * advance, y, fill: colors[kind] });
      column += [...text].length;
      return run;
    });

    if (line.command) {
      const typedWidth = round([...line.command].length * advance);
      parts.push(type.run({ face: "mono", size, text: line.command, x: commandX, y, fill: colors.command }));
      // A panel-colored cover slides right one character per tick, carrying the caret with it.
      parts.push(
        `<g class="type-${index}"><rect x="${round(commandX)}" y="${y - 18}" width="${typedWidth}" height="24" fill="${palette.sky}"/><g class="caret-${index}">${cursor(y)}</g></g>`,
      );
      css.push(
        `.type-${index}{transform:translateX(${typedWidth}px);animation:type-${index} ${loop} linear infinite}`,
        `@keyframes type-${index}{0%,${percent(line.typeAt)}%{transform:translateX(0);animation-timing-function:steps(${[...line.command].length},end)}${percent(line.typedAt)}%,to{transform:translateX(${typedWidth}px)}}`,
        `.caret-${index}{opacity:0;animation:caret-${index} ${loop} linear infinite}`,
        visibleBetween(`caret-${index}`, line.appear, line.caretUntil),
      );
    }

    if (line.finalCaret) parts.push(cursor(y));

    css.push(`.line-${index}{animation:line-${index} ${loop} linear infinite}`, visibleFrom(`line-${index}`, line.appear));
    return `<g class="line-${index}">${parts.join("")}</g>`;
  });

  const json = terminal.json;
  const summary = Object.entries(json)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join("; ");

  return svgDocument({
    width: WIDTH,
    height,
    title: `${terminal.file} in a terminal`,
    desc: `A terminal types whoami, answers ${terminal.whoami}, then prints ${terminal.file}. ${summary}.`,
    css: css.join(""),
    defs: type.defs(),
    body: `<rect x=".5" y=".5" width="${WIDTH - 1}" height="${height - 1}" rx="${tokens.layout.radius}" fill="${palette.sky}" stroke="${palette.cell}"/>${lines.join("")}`,
  });
}

export function render(project) {
  return project.themes.map((theme) => ({ file: `terminal-${theme}.svg`, svg: terminalSvg(project, theme) }));
}
