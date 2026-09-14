# How this profile is built

The README of this repository is not written by hand. A small Node build renders every animated SVG
from design tokens and content, then assembles the README from a template. The theme is "Solar Day":
the page reads as one day at a solar plant, from sunrise in the banner to sunset in the footer.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Renders `assets/*.svg` and `README.md`. Deletes assets no component produces any more. |
| `npm run check` | Size budget, no scripts, no external URLs, accessibility attributes, no private data. |
| `npm test` | Unit tests for the typesetter, the calendar and the build's determinism. |
| `npm run preview [filter]` | Screenshots of every asset at chosen moments, in `preview/` (needs Chrome). |
| `npm run farm` | Renders the contribution farm locally: `GITHUB_TOKEN=$(gh auth token) npm run farm`. |

## Where things live

```
src/tokens.json        palette, type scale, tempo and easings, one source for every piece
src/content.json       every word, link and project on the page
src/components/*.mjs   one file per piece; each exports render(project) -> [{ file, svg }]
src/lib/               typesetter, motion helpers, SVG document, validation, README builder
src/readme.template.md the page order; {{placeholders}} are filled by src/lib/readme.mjs
scripts/build.mjs      renders, optimizes with svgo and writes assets and README.md
scripts/solar-farm.mjs fetches the contribution calendar and renders the farm
assets/                generated SVGs, committed so GitHub can serve them
```

Change a color in `tokens.json` and every piece changes. Change a sentence in `content.json` and no
component needs to be touched. The build is deterministic: the same input always produces the same
bytes, so a diff only shows real changes.

## The motion system

Every animation runs at one tempo, 96 BPM, so one beat is 625 ms. Durations are whole beats: a bar is
4, a phrase 8, a verse 16, a loop 32. Three easings cover everything: `arrive` for things that settle,
`flow` (linear) for current, `breathe` for ambient glow.

Two rules keep it coherent:

- **Current only moves right or down.** Loops restart with a fade, never by running backwards.
- **The base style is the final frame.** Keyframes describe only how a piece gets there, with
  `animation-fill-mode: backwards`. A renderer that ignores animations, and anyone who asks for
  reduced motion, sees the finished piece instead of an empty one.

Nothing changes brightness more than once per beat (1.6 Hz), well under the three-flashes-per-second
limit in WCAG 2.3.1.

## What GitHub allows

- Markdown HTML is sanitized: `<style>`, `<script>`, `<iframe>` and `style`/`class` attributes are
  dropped. Only `<picture>`, `<source media>`, `<img>`, `<a>`, `<p align>`, `<details>`, `<table>`,
  `<sub>` and a few more survive. Theming is done with `<picture>` and `prefers-color-scheme`.
- An SVG shown through `<img>` cannot load anything external: no web fonts, no images by URL, no
  JavaScript. That is why text becomes glyph paths at build time with opentype.js, and why every
  animation lives inside the file as CSS.
- Links inside an SVG do not work and hover never fires, so clicks come from the `<a>` around the
  image and nothing depends on hover.
- Budget: 150 KB per file, 1 MB in total, enforced by `npm run check`.

## The contribution farm

`.github/workflows/solar-farm.yml` runs `scripts/solar-farm.mjs` daily, on demand, and on every push
to `main`. The script reads the contribution calendar over GraphQL with `GITHUB_TOKEN`, rejects any
response that does not look like a full year, renders both themes, and validates the SVGs before
writing anything. If any step fails, the job stops and the farm already published stays up.

The result is force-pushed as a single commit to the `output` branch, which keeps `main` clean, and
the README points at `raw.githubusercontent.com/.../output/farm-dark.svg`.

Brightness uses quartiles of the days that have contributions, not GitHub's own levels, which would
leave most of a light year on level one. The absolute number of contributions is only printed at or
above `farm.countThreshold` in `content.json`; below it, the label says nothing about the count.

**About the 60-day rule:** GitHub disables scheduled workflows in public repositories after 60 days
without activity. There is no keepalive trick here on purpose — the popular one was blocked for
violating the Terms of Service. Any commit to `main` counts as activity and also refreshes the farm.
If the schedule is ever switched off, GitHub emails a warning, the last good farm stays on the page,
and one command brings it back:

```bash
gh workflow enable solar-farm.yml
```

## Checks on every pull request

`.github/workflows/build-check.yml` installs, tests, builds, and fails if `README.md` or `assets/`
differ from what the build produces, if the size budget is exceeded, or if a script, an external URL
or private data shows up in a generated file.
