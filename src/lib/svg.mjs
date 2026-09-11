import { escapeXml } from "./format.mjs";
import { REDUCED_MOTION_CSS } from "./motion.mjs";

// Root element shared by every asset: intrinsic size for <img>, accessible name and the reduced-motion rule.
export function svgDocument({ width, height, title, desc, css = "", defs = "", body }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml(desc)}</desc>`,
    `<style>${css}${REDUCED_MOTION_CSS}</style>`,
    defs ? `<defs>${defs}</defs>` : "",
    body,
    "</svg>",
  ].join("");
}
