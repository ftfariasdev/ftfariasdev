// Every number printed into an SVG goes through round(), so the same input always yields the same bytes.
export function round(value, digits = 2) {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Serializes an attribute map, skipping empty values and rounding numbers.
export function attrs(map) {
  return Object.entries(map)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => ` ${name}="${typeof value === "number" ? round(value) : escapeXml(value)}"`)
    .join("");
}
