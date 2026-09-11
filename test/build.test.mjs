import assert from "node:assert/strict";
import { test } from "node:test";
import { renderAssets } from "../scripts/build.mjs";

test("the build is deterministic", () => {
  assert.deepEqual(renderAssets(), renderAssets());
});

test("every dark asset has a light twin", () => {
  const files = renderAssets().map(({ file }) => file);
  for (const dark of files.filter((file) => file.endsWith("-dark.svg"))) {
    assert.ok(files.includes(dark.replace(/-dark\.svg$/, "-light.svg")), `${dark} has no light version`);
  }
});
