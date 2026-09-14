import assert from "node:assert/strict";
import { test } from "node:test";
import { attrs, escapeXml, round } from "../src/lib/format.mjs";

test("round prints stable, compact numbers", () => {
  assert.equal(round(0.1 + 0.2), 0.3);
  assert.equal(round(-0.0001), 0);
  assert.equal(round(12.3456, 1), 12.3);
});

test("escapeXml neutralizes markup characters", () => {
  assert.equal(escapeXml('O&M <"US">'), "O&amp;M &lt;&quot;US&quot;&gt;");
});

test("attrs skips empty values and rounds numbers", () => {
  assert.equal(attrs({ x: 1.23456, fill: "#fff", class: undefined, hidden: false }), ' x="1.23" fill="#fff"');
});
