import { readFileSync } from "node:fs";

const templateUrl = new URL("../readme.template.md", import.meta.url);
const SPOTIFY = "https://spotify-github-profile.kittinanx.com/api/view";

// GitHub keeps <picture>, <source media>, <img>, <a>, <p align>, <details>, <sub> and <table>, and drops the rest.
const picture = (base, alt, attributes) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg"><img alt="${alt}" src="assets/${base}-light.svg"${attributes ? ` ${attributes}` : ""}></picture>`;

const centered = (markup) => `<p align="center">${markup}</p>`;

// Decorative dividers carry an empty alt so screen readers skip them.
const divider = (index) => centered(picture(`divider-${index}`, "", 'width="100%"'));

const sentenceList = (items) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

function spotify(uid, tokens) {
  const common = `uid=${uid}&cover_image=true&theme=spotify-embed&show_offline=true&interchange=false&profanity=false`;
  const dark = `${SPOTIFY}?${common}&mode=dark&background_color=${tokens.themes.dark.sky.slice(1)}&bar_color=${tokens.themes.dark.lit.slice(1)}&bar_color_cover=false`;
  const light = `${SPOTIFY}?${common}&mode=light&background_color=${tokens.themes.light.sky.slice(1)}&bar_color=${tokens.themes.light.lit.slice(1)}&bar_color_cover=false`;

  return centered(
    `<a href="${SPOTIFY}?uid=${uid}&redirect=true"><picture><source media="(prefers-color-scheme: dark)" srcset="${dark}"><img alt="What I am listening to on Spotify" src="${light}"></picture></a>`,
  );
}

function projectGrid(projects) {
  const card = ({ slug, name, url, alt }) => `<a href="${url}">${picture(`project-${slug}`, alt, 'width="49%"')}</a>`;
  const rows = [];
  for (let index = 0; index < projects.length; index += 2) {
    rows.push(centered(projects.slice(index, index + 2).map(card).join(" ")));
  }
  return rows.join("\n\n");
}

export function renderReadme(project) {
  const { content, tokens } = project;
  const { farm, footer, music, stack } = content;

  const values = {
    hero: centered(picture("hero", content.hero.alt, 'width="100%"')),
    about: content.about.paragraphs.join("\n\n"),
    terminal: centered(picture("terminal", `A terminal printing ${content.about.terminal.file}`, 'width="100%"')),
    stack: centered(picture("stack", "My stack drawn as a single-line diagram", 'width="100%"')),
    stackText: stack.layers
      .map(({ name, items }) => `**${name}:** ${items.join(", ")}`)
      .concat(`<sub>${stack.alsoShipped.label} ${sentenceList(stack.alsoShipped.items)} on ${stack.alsoShipped.source}.</sub>`)
      .join("  \n"),
    projects: projectGrid(content.projects),
    projectList: content.projects
      .map(({ name, url, lines }) => {
        // The second line continues the sentence here, so an ordinary capitalized word is lowered.
        // Acronyms like UNASP and SVGs keep their case.
        const continued = /^[A-Z][a-z]/.test(lines[1]) ? lines[1].charAt(0).toLowerCase() + lines[1].slice(1) : lines[1];
        return `- [${name}](${url}) — ${lines[0]}, ${continued}`;
      })
      .join("\n"),
    farm: centered(
      `<picture><source media="(prefers-color-scheme: dark)" srcset="${farm.url}/farm-dark.svg"><img alt="${farm.alt}" src="${farm.url}/farm-light.svg" width="100%"></picture>`,
    ),
    farmNote: centered(`<sub>${farm.note}</sub>`),
    spotify: spotify(music.spotifyUid, tokens),
    vuMeter: centered(picture("vu-meter", "A level meter built from solar cells, bouncing on the beat")),
    easterEgg: `<details>\n<summary>${music.summary}</summary>\n\n${music.detail.replace("{bpm}", tokens.tempo.bpm)}\n\n</details>`,
    connect: centered(
      content.connect.map(({ slug, label, url, alt }) => `<a href="${url}">${picture(`connect-${slug}`, alt, 'height="56"')}</a>`).join("&nbsp;&nbsp;"),
    ),
    connectText: centered(
      `<sub>${content.connect.map(({ url, text }) => `<a href="${url}">${text}</a>`).join("&nbsp;&nbsp;&nbsp;")}</sub>`,
    ),
    footer: centered(picture("footer", footer.quote.join(" "), 'width="100%"')),
    howItWorks: centered(`<sub><a href="docs/HOW-IT-WORKS.md">${footer.howItWorks}</a></sub>`),
  };

  for (let index = 1; index <= 6; index += 1) values[`divider${index}`] = divider(index);

  return readFileSync(templateUrl, "utf8").replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`The README template asks for "${key}", which the builder does not provide`);
    return values[key];
  });
}
