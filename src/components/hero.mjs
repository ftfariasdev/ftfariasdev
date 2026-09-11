import { round } from "../lib/format.mjs";
import { MATRIX_COLUMNS, MATRIX_ROWS, matrixGlyph } from "../lib/matrix-font.mjs";
import { svgDocument } from "../lib/svg.mjs";

const WIDTH = 830;
const HEIGHT = 300;
const CELL = { pitch: 9.6, size: 7.4, radius: 1.3 };
const MODULE_ROWS = MATRIX_ROWS + 2; // a blank row above and below each letter
const ARRAY_TOP = 30;
const HORIZON = 248;
const SUN = { x: 96, y: 238, radius: 22, halo: 96 };
const ROLE_BASELINE = 168;
const LINE_BASELINE = 198;
const STARS = 28;
const PHOTONS = 6;

// The signature moment, in beats. It ends on beat 8, where the ambient loops take over.
const INTRO = {
  dawn: { delay: 0.5, duration: 3 },
  sunrise: { delay: 1, duration: 2 },
  sweep: { delay: 2.75, duration: 3 },
  ignite: { delay: 3, duration: 1, perColumn: 0.04 },
  tagline: { delay: 5, duration: 2 },
  pulse: { delay: 7, duration: 1 },
  ambient: 8,
};

function randomSequence(seed) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

// One photovoltaic module per letter, separated by exactly one empty column.
function layoutArray(text) {
  const inset = CELL.pitch - CELL.size;
  const step = (MATRIX_COLUMNS + 1) * CELL.pitch;
  const width = (text.length * (MATRIX_COLUMNS + 1) - 1) * CELL.pitch - inset;
  const left = (WIDTH - width) / 2;

  return {
    left,
    moduleWidth: MATRIX_COLUMNS * CELL.pitch - inset,
    moduleHeight: MODULE_ROWS * CELL.pitch - inset,
    moduleX: (index) => left + index * step,
  };
}

function litCellsByColumn(text, array) {
  const columns = new Map();

  [...text].forEach((char, moduleIndex) => {
    matrixGlyph(char).forEach((row, rowIndex) => {
      [...row].forEach((bit, columnIndex) => {
        if (bit !== "1") return;
        const column = moduleIndex * (MATRIX_COLUMNS + 1) + columnIndex;
        const x = round(array.moduleX(moduleIndex) + columnIndex * CELL.pitch);
        const y = round(ARRAY_TOP + (rowIndex + 1) * CELL.pitch);
        const cells = columns.get(column) ?? [];
        cells.push(`<rect x="${x}" y="${y}" width="${CELL.size}" height="${CELL.size}" rx="${CELL.radius}"/>`);
        columns.set(column, cells);
      });
    });
  });

  return [...columns.entries()].sort(([a], [b]) => a - b);
}

function css(palette, { time, ease }) {
  return [
    `.star{animation:twinkle ${time(8)} ${ease.breathe} infinite}`,
    `.dawn{animation:fade ${time(INTRO.dawn.duration)} ${ease.breathe} ${time(INTRO.dawn.delay)} backwards}`,
    `.sun{animation:rise ${time(INTRO.sunrise.duration)} ${ease.arrive} ${time(INTRO.sunrise.delay)} backwards}`,
    `.halo{animation:fade ${time(INTRO.sunrise.duration)} ${ease.breathe} ${time(INTRO.sunrise.delay)} backwards,breathe ${time(16)} ${ease.breathe} ${time(INTRO.ambient)} infinite}`,
    `.sweep{opacity:0;animation:sweep ${time(INTRO.sweep.duration)} ${ease.flow} ${time(INTRO.sweep.delay)} backwards}`,
    `.ignite{animation:ignite ${time(INTRO.ignite.duration)} ${ease.arrive} backwards}`,
    `.tagline{animation:settle ${time(INTRO.tagline.duration)} ${ease.arrive} ${time(INTRO.tagline.delay)} backwards}`,
    `.pulse{opacity:0;animation:drop ${time(INTRO.pulse.duration)} ${ease.flow} ${time(INTRO.pulse.delay)} backwards}`,
    `.photon{opacity:0;animation:photon ${time(8)} ${ease.flow} infinite}`,
    `.shimmer{opacity:0;animation:shimmer ${time(32)} ${ease.flow} ${time(INTRO.ambient + 2)} infinite}`,
    "@keyframes twinkle{50%{opacity:.25}}",
    "@keyframes fade{from{opacity:0}}",
    "@keyframes rise{from{transform:translateY(64px)}}",
    "@keyframes breathe{50%{opacity:.55}}",
    "@keyframes sweep{from{opacity:1;transform:translateX(-200px)}85%{opacity:1}to{opacity:0;transform:translateX(900px)}}",
    `@keyframes ignite{from{fill:${palette.cell}}}`,
    "@keyframes settle{from{opacity:0;transform:translateY(8px)}}",
    "@keyframes drop{from{opacity:1;stroke-dashoffset:40}to{opacity:1;stroke-dashoffset:-190}}",
    "@keyframes photon{0%{opacity:0;transform:translateX(0)}15%,85%{opacity:.9}to{opacity:0;transform:translateX(720px)}}",
    "@keyframes shimmer{0%{opacity:.45;transform:translateX(-200px)}10%{opacity:.45;transform:translateX(900px)}10.01%,to{opacity:0}}",
  ].join("");
}

function defs(palette, array, radius) {
  const glow =
    palette.glow > 0
      ? `<filter id="glow" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="2.4"/><feComponentTransfer result="soft"><feFuncA type="linear" slope="${palette.glow}"/></feComponentTransfer><feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
      : "";

  return [
    `<clipPath id="frame"><rect width="${WIDTH}" height="${HEIGHT}" rx="${radius}"/></clipPath>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.skyHigh}"/><stop offset=".62" stop-color="${palette.sky}"/></linearGradient>`,
    `<radialGradient id="dawn" cx="${SUN.x}" cy="${HORIZON}" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${palette.dawn}" stop-opacity=".95"/><stop offset="1" stop-color="${palette.dawn}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="halo" cx="${SUN.x}" cy="${SUN.y}" r="${SUN.halo}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${palette.sun}" stop-opacity=".55"/><stop offset="1" stop-color="${palette.sun}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="sweep"><stop offset="0" stop-color="${palette.lit}" stop-opacity="0"/><stop offset=".5" stop-color="${palette.lit}" stop-opacity="${palette.sweep}"/><stop offset="1" stop-color="${palette.lit}" stop-opacity="0"/></linearGradient>`,
    `<pattern id="cells" width="${CELL.pitch}" height="${CELL.pitch}" x="${round(array.left)}" y="${ARRAY_TOP}" patternUnits="userSpaceOnUse"><rect width="${CELL.size}" height="${CELL.size}" rx="${CELL.radius}" fill="${palette.cell}"/></pattern>`,
    glow,
  ].join("");
}

// Stars stay clear of the array and the tagline, where a dot would read as a cell or as punctuation.
const STAR_FREE_BANDS = [
  [ARRAY_TOP - 12, ARRAY_TOP + MODULE_ROWS * CELL.pitch + 12],
  [ROLE_BASELINE - 26, LINE_BASELINE + 10],
];

function stars(palette, motion) {
  if (!palette.starOpacity) return "";
  const random = randomSequence(7);
  const circles = [];

  while (circles.length < STARS) {
    const cx = round(random() * WIDTH);
    const cy = round(random() * (HORIZON - 18));
    const r = round(0.6 + random() * 0.9);
    if (STAR_FREE_BANDS.some(([top, bottom]) => cy > top && cy < bottom)) continue;
    circles.push(`<circle class="star" style="animation-delay:-${motion.time(circles.length * 0.5)}" cx="${cx}" cy="${cy}" r="${r}"/>`);
  }

  return `<g fill="${palette.ink}" opacity="${palette.starOpacity}">${circles.join("")}</g>`;
}

// Light specks drifting across the array. On the daylight theme they read as faulty cells, so the token turns them off.
function photons(palette, array, motion) {
  if (!palette.photons) return "";
  const circles = Array.from({ length: PHOTONS }, (_, index) => {
    const delay = motion.time(INTRO.ambient + index * 1.25);
    return `<circle class="photon" style="animation-delay:${delay}" cx="${round(array.left + 10)}" cy="${round(ARRAY_TOP + 8 + index * 13)}" r="1.6"/>`;
  });
  return `<g fill="${palette.lit}">${circles.join("")}</g>`;
}

// "Full Stack Developer at Softwrench" followed by the company symbol, centered as one line.
function tagline({ content, tokens }, palette, type) {
  const roleSize = tokens.type.size.primary;
  const mark = content.company.mark;
  const roleWidth = type.measure("sansBold", roleSize, content.hero.role);
  const markSize = mark ? round(type.capHeight("sansBold", roleSize) * 1.1) : 0;
  const gap = mark ? round(roleSize * 0.43) : 0;
  const roleX = (WIDTH - (roleWidth + gap + markSize)) / 2;

  const parts = [
    type.run({ face: "sansBold", size: roleSize, text: content.hero.role, x: roleX, y: ROLE_BASELINE, fill: palette.ink }),
    type.run({
      face: "sans",
      size: tokens.type.size.secondary,
      text: content.hero.line,
      x: WIDTH / 2,
      y: LINE_BASELINE,
      anchor: "middle",
      fill: palette.inkDim,
    }),
  ];

  if (mark) {
    const [boxX, boxY, boxWidth] = mark.box;
    const translate = `translate(${round(roleX + roleWidth + gap)} ${round(ROLE_BASELINE - markSize)})`;
    const scale = `scale(${round(markSize / boxWidth, 5)})`;
    parts.push(`<path fill="${palette.ink}" transform="${translate} ${scale} translate(${-boxX} ${-boxY})" d="${mark.path}"/>`);
  }

  return `<g class="tagline">${parts.join("")}</g>`;
}

function heroSvg(project, theme) {
  const { content, motion, tokens } = project;
  const palette = project.palette(theme);
  const type = project.typesetter();
  const text = content.hero.matrix;
  const array = layoutArray(text);
  const modules = [...text].map((_, index) => array.moduleX(index));

  const frames = modules
    .map((x) => `<rect x="${round(x - 3)}" y="${ARRAY_TOP - 3}" width="${round(array.moduleWidth + 6)}" height="${round(array.moduleHeight + 6)}" rx="2.5"/>`)
    .join("");
  const panels = modules
    .map((x) => `<rect x="${round(x)}" y="${ARRAY_TOP}" width="${round(array.moduleWidth)}" height="${round(array.moduleHeight)}"/>`)
    .join("");
  const litColumns = litCellsByColumn(text, array)
    .map(([column, cells]) => {
      const delay = motion.time(INTRO.ignite.delay + column * INTRO.ignite.perColumn);
      return `<g class="ignite" style="animation-delay:${delay}">${cells.join("")}</g>`;
    })
    .join("");
  const band = `y="${ARRAY_TOP - 10}" width="200" height="${round(array.moduleHeight + 20)}" fill="url(#sweep)"`;
  const glowFilter = palette.glow > 0 ? ' filter="url(#glow)"' : "";

  const body = [
    '<g clip-path="url(#frame)">',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>`,
    `<rect class="dawn" width="${WIDTH}" height="${HEIGHT}" fill="url(#dawn)"/>`,
    stars(palette, motion),
    `<circle class="halo" cx="${SUN.x}" cy="${SUN.y}" r="${SUN.halo}" fill="url(#halo)"/>`,
    `<circle class="sun" cx="${SUN.x}" cy="${SUN.y}" r="${SUN.radius}" fill="${palette.sunDisc}"/>`,
    `<rect y="${HORIZON}" width="${WIDTH}" height="${HEIGHT - HORIZON}" fill="${palette.ground}"/>`,
    `<path d="M0 ${HORIZON + 0.5}H${WIDTH}" stroke="${palette.inkDim}" stroke-opacity=".45"/>`,
    `<g fill="none" stroke="${palette.photovoltaic}" stroke-opacity=".55">${frames}</g>`,
    `<g fill="url(#cells)">${panels}</g>`,
    `<g fill="${palette.lit}"${glowFilter}>${litColumns}</g>`,
    `<rect class="sweep" ${band}/>`,
    `<rect class="shimmer" ${band}/>`,
    photons(palette, array, motion),
    tagline(project, palette, type),
    `<path class="pulse" d="M${round(array.left - 3)} ${round(ARRAY_TOP + array.moduleHeight)}V${HEIGHT}" stroke="${palette.current}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 400"/>`,
    "</g>",
  ].join("");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    title: `${content.name.full}, ${content.hero.role}`,
    desc: `Animated banner. Before dawn the sun rises over a photovoltaic array, its light sweeps across the cells and lights up the name ${text}, then the tagline appears: ${content.hero.role}. ${content.hero.line}.`,
    css: css(palette, motion),
    defs: defs(palette, array, tokens.layout.radius) + type.defs(),
    body,
  });
}

export function render(project) {
  return project.themes.map((theme) => ({ file: `hero-${theme}.svg`, svg: heroSvg(project, theme) }));
}
