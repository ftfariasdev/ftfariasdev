const KB = 1024;
export const LIMITS = { file: 150 * KB, total: 1024 * KB };
const ALLOWED_URLS = new Set(["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink"]);

export const kilobytes = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

// Everything GitHub needs from an SVG shown through <img>, shared by the build check and the farm Action.
export function svgProblems(file, svg) {
  const problems = [];
  const size = Buffer.byteLength(svg);

  if (size > LIMITS.file) problems.push(`${file}: ${kilobytes(size)} is over the ${kilobytes(LIMITS.file)} limit`);
  if (/<script/i.test(svg)) problems.push(`${file}: contains <script>`);
  if (/<foreignObject/i.test(svg)) problems.push(`${file}: contains <foreignObject>`);
  if (/@import/i.test(svg)) problems.push(`${file}: contains @import`);
  if (/NaN/.test(svg)) problems.push(`${file}: contains NaN in its geometry`);
  for (const [url] of svg.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    if (!ALLOWED_URLS.has(url)) problems.push(`${file}: loads an external URL (${url})`);
  }
  if (!/^<svg[^>]*\srole="img"/.test(svg)) problems.push(`${file}: root <svg> needs role="img"`);
  if (!/<title>[^<]+<\/title>/.test(svg)) problems.push(`${file}: needs a <title>`);
  if (!/<desc>[^<]+<\/desc>/.test(svg)) problems.push(`${file}: needs a <desc>`);
  if (!/prefers-reduced-motion:\s?reduce/.test(svg)) problems.push(`${file}: needs the reduced-motion rule`);

  return problems;
}
