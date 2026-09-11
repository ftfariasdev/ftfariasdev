import assert from "node:assert/strict";
import { test } from "node:test";
import { round } from "../src/lib/format.mjs";
import { loadProject } from "../src/lib/project.mjs";

const project = loadProject();

test("measure is deterministic and scales with size", () => {
  const type = project.typesetter();
  const width = type.measure("sans", 10, "Softwrench");
  assert.ok(width > 0);
  assert.equal(type.measure("sans", 10, "Softwrench"), width);
  assert.ok(Math.abs(type.measure("sans", 20, "Softwrench") - width * 2) < 1e-9);
});

test("monospace characters share one advance", () => {
  const type = project.typesetter();
  assert.equal(type.measure("mono", 18, "iiii"), type.measure("mono", 18, "MMMM"));
});

test("run defines each glyph once and skips spaces", () => {
  const type = project.typesetter();
  const run = type.run({ face: "sans", size: 18, text: "O&M O&M", fill: "#fff" });
  assert.equal(run.match(/<use /g).length, 6);
  assert.equal(type.defs().match(/<path /g).length, 3);
  assert.match(run, /^<g fill="#fff">/);
});

test("middle anchor centers the run on x", () => {
  const type = project.typesetter();
  const width = type.measure("sansBold", 21, "Softwrench");
  const run = type.run({ face: "sansBold", size: 21, text: "Softwrench", x: 415, anchor: "middle" });
  assert.match(run, new RegExp(`x="${round(415 - width / 2)}"`));
});
