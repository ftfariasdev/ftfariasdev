import { readFileSync } from "node:fs";
import { createMotion } from "./motion.mjs";
import { Typesetter } from "./text.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

// Everything a component needs: design tokens, editable content and the shared helpers built from them.
export function loadProject() {
  const tokens = readJson("../tokens.json");
  const content = readJson("../content.json");

  return {
    tokens,
    content,
    motion: createMotion(tokens),
    themes: Object.keys(tokens.themes),
    palette: (theme) => tokens.themes[theme],
    typesetter: () => new Typesetter(tokens.type.faces),
  };
}
