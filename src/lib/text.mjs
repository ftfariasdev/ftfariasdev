import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { attrs, round } from "./format.mjs";

const repoRoot = new URL("../../", import.meta.url);
const fonts = new Map();

function loadFont(file) {
  if (!fonts.has(file)) {
    const bytes = readFileSync(new URL(`node_modules/${file}`, repoRoot));
    fonts.set(file, opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  return fonts.get(file);
}

const byId = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);

// opentype.js 2.0.0 writes NaN from toPathData() for some B612 glyphs, and browsers stop drawing
// a path at the first NaN. The glyph commands themselves are correct, so they are serialized here.
function pathData(commands) {
  return commands
    .map(({ type, x, y, x1, y1, x2, y2 }) => {
      if (type === "M" || type === "L") return `${type}${round(x)} ${round(y)}`;
      if (type === "Q") return `Q${round(x1)} ${round(y1)} ${round(x)} ${round(y)}`;
      if (type === "C") return `C${round(x1)} ${round(y1)} ${round(x2)} ${round(y2)} ${round(x)} ${round(y)}`;
      if (type === "Z") return "Z";
      throw new Error(`Unsupported path command "${type}"`);
    })
    .join("");
}

// SVGs shown through <img> cannot load fonts, so text becomes glyph paths.
// Each glyph is defined once per face and size, then placed with <use>.
export class Typesetter {
  #faces;
  #glyphs = new Map();

  constructor(faceFiles) {
    this.#faces = Object.fromEntries(Object.entries(faceFiles).map(([name, file]) => [name, loadFont(file)]));
  }

  #font(face) {
    const font = this.#faces[face];
    if (!font) throw new Error(`Unknown font face "${face}"`);
    return font;
  }

  // Pen position of every character in px, kerning included. One glyph per character, no ligatures.
  layout(face, size, text) {
    const font = this.#font(face);
    const scale = size / font.unitsPerEm;
    const glyphs = [...text].map((char) => font.charToGlyph(char));
    const positions = [];
    let pen = 0;

    glyphs.forEach((glyph, index) => {
      positions.push({ glyph, x: pen });
      pen += glyph.advanceWidth * scale;
      if (index < glyphs.length - 1) pen += font.getKerningValue(glyph, glyphs[index + 1]) * scale;
    });

    return { positions, width: pen };
  }

  measure(face, size, text) {
    return this.layout(face, size, text).width;
  }

  capHeight(face, size) {
    const font = this.#font(face);
    return (font.tables.os2.sCapHeight * size) / font.unitsPerEm;
  }

  // y is the baseline. anchor works like SVG text-anchor.
  run({ face, size, text, x = 0, y = 0, anchor = "start", fill, className }) {
    const { positions, width } = this.layout(face, size, text);
    const start = x - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
    const uses = positions
      .filter(({ glyph }) => glyph.path.commands.length > 0)
      .map(({ glyph, x: offset }) => `<use href="#${this.#define(face, size, glyph)}" x="${round(start + offset)}" y="${round(y)}"/>`)
      .join("");
    return `<g${attrs({ fill, class: className })}>${uses}</g>`;
  }

  #define(face, size, glyph) {
    const id = `g-${face}-${size}-${glyph.index}`;
    if (!this.#glyphs.has(id)) this.#glyphs.set(id, pathData(glyph.getPath(0, 0, size).commands));
    return id;
  }

  defs() {
    return [...this.#glyphs.entries()]
      .sort(byId)
      .map(([id, d]) => `<path id="${id}" d="${d}"/>`)
      .join("");
  }
}
