import assert from "node:assert/strict";
import { test } from "node:test";
import { optimizeSvg } from "../src/lib/optimize.mjs";
import { svgDocument } from "../src/lib/svg.mjs";

test("optimizeSvg keeps what accessibility and motion depend on", () => {
  const svg = svgDocument({
    width: 10,
    height: 10,
    title: "Title",
    desc: "Description",
    css: ".sweep{opacity:0;animation:pass 1s linear backwards}@keyframes pass{from{opacity:1}}",
    body: '<rect class="sweep" width="4" height="4"/>',
  });
  const optimized = optimizeSvg(svg);

  assert.match(optimized, /^<svg[^>]*\srole="img"/);
  assert.match(optimized, /<title>Title<\/title>/);
  assert.match(optimized, /<desc>Description<\/desc>/);
  assert.match(optimized, /prefers-reduced-motion:\s?reduce/);
  assert.match(optimized, /class="sweep"/);
});
