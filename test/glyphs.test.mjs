import assert from "node:assert/strict";
import { test } from "node:test";
import { loadProject } from "../src/lib/project.mjs";

const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");

// A single NaN in path data makes the browser stop drawing the glyph halfway.
test("every font face renders printable ASCII without NaN", () => {
  const project = loadProject();

  for (const face of Object.keys(project.tokens.type.faces)) {
    const type = project.typesetter();
    type.run({ face, size: 18, text: PRINTABLE_ASCII });
    assert.doesNotMatch(type.defs(), /NaN/, `${face} produced NaN path data`);
  }
});
