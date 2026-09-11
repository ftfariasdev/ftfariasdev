import { round } from "../lib/format.mjs";
import { svgDocument } from "../lib/svg.mjs";

const HEIGHT = 56;
const INSET = 6; // room around the button for its glow
const PADDING_X = 16;
const ICON = 20;
const ICON_GAP = 10;
const RADIUS = 10;
const CYCLE = 16; // beats per breath

// Stroke icons drawn here in a 20 × 20 box. Simple Icons has no LinkedIn mark, and email and portfolio have no brand.
const ICONS = {
  linkedin: "M2 4.5h16v11H2zM7 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M4.3 14q2.7-3.2 5.4 0M11.5 8.5h4.5M11.5 11.5h3",
  portfolio: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16M2 10h16M10 2q-4.5 8 0 16M10 2q4.5 8 0 16",
  email: "M2 4.5h16v11H2zM2.5 5.2 10 11l7.5-5.8",
};

function buttonSvg(project, theme, link, index, labelWidth) {
  const { tokens, motion } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const size = tokens.type.size.secondary;
  // Whole pixels: a fractional intrinsic width blurs the button's edges when GitHub renders the <img>.
  const width = Math.ceil(INSET * 2 + PADDING_X * 2 + ICON + ICON_GAP + labelWidth);
  const icon = ICONS[link.slug];
  if (!icon) throw new Error(`No icon drawn for the "${link.slug}" link`);

  const frame = `x="${INSET}" y="${INSET}" width="${round(width - INSET * 2)}" height="${HEIGHT - INSET * 2}" rx="${RADIUS}"`;
  const iconX = INSET + PADDING_X;
  const baseline = round(HEIGHT / 2 + type.capHeight("sansBold", size) / 2);

  const body = [
    `<rect class="halo" style="animation-delay:${motion.time(index)}" ${frame} fill="none" stroke="${palette.lit}" stroke-width="4" filter="url(#blur)"/>`,
    `<rect ${frame} fill="${palette.sky}" stroke="${palette.lit}" stroke-width="1.5"/>`,
    `<path transform="translate(${iconX} ${(HEIGHT - ICON) / 2})" d="${icon}" fill="none" stroke="${palette.lit}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    type.run({ face: "sansBold", size, text: link.label, x: iconX + ICON + ICON_GAP, y: baseline, fill: palette.ink }),
  ].join("");

  return svgDocument({
    width,
    height: HEIGHT,
    title: link.label,
    desc: `${link.alt}. The button's glow breathes slowly.`,
    // Each button breathes one beat after the one to its left.
    css: `.halo{opacity:.25;animation:breathe ${motion.time(CYCLE)} ${motion.ease.breathe} infinite backwards}@keyframes breathe{0%,to{opacity:.08}50%{opacity:.5}}`,
    defs: `<filter id="blur" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="2.5"/></filter>${type.defs()}`,
    body,
  });
}

export function render(project) {
  const { content, tokens } = project;
  const measure = project.typesetter();
  // Every button shares the widest label's width, so the row reads as one set.
  const labelWidth = Math.max(...content.connect.map(({ label }) => measure.measure("sansBold", tokens.type.size.secondary, label)));

  return content.connect.flatMap((link, index) =>
    project.themes.map((theme) => ({ file: `connect-${link.slug}-${theme}.svg`, svg: buttonSvg(project, theme, link, index, labelWidth) })),
  );
}
