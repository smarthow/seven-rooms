/* illos — one registry of illustrations, keyed by slot name.
 *
 * Slots are listed in docs/ILLO_STYLE.md. Each slot resolves to a markup
 * string, so callers (`illo()` / `hasIllo()` in engine/ui.ts) never learn
 * whether a slot is a raster drawing or inline SVG.
 *
 * The drawings are rubber-hose cartoon PNGs with a transparent background,
 * dropped in src/illos/png as `<slotName>.png`. Vite hashes and serves them,
 * and `import.meta.glob` picks up new files with no code change here.
 *
 * There is no SVG fallback: the inline-SVG sets this replaced are deleted, so
 * a slot with no PNG resolves to undefined and `illo()` renders nothing at all
 * rather than a broken box.
 */
/** Alt text per slot. Written for a screen reader, not as a caption — the
 * illustration repeats the slide, so this describes what is drawn and nothing
 * more. Carried over from the SVG set, whose aria-labels these were. */
const ALT: Record<string, string> = {
  room1Happened: "a parking meter swallowing a ribbon of clock faces from a person, then reading empty as an agent walks past",
  room2Happened: "a funnel machine grabbing at a person while an agent walks straight through it untouched",
  room3Happened: "a person slumped before a mountain of small chores that an agent sweeps aside in one motion",
  room4Happened: "two agents at a level table: one behind a towering stack of past deals, the other holding a single card",
  room5Happened: "the old way of taking turns beside the new way, both drawing on the same sheet at once",
  room6Happened: "an agent reading an enormous contract through a magnifying glass, the pen at the signature line fading",
  room7Happened: "one pile of ballots divided by two different lines, giving two different results",
  typesIntro: "a shopfront with a single human-sized door, one person at it, and a horizon full of arriving agents",
  endingReport: "a report card on a clipboard with four check marks and one cross",
  endingWalls: "the agent shut outside a closed door while the human reads alone inside",
  introChoiceAgent: "a person handing a small glowing tool to their agent through a browser window",
  introChoiceGhost: "a translucent, dotted-outline ghost agent waving hello",
  room1Bad: "a newspaper locked behind a paywall gate with the agent shut out",
  room1Bright: "the agent dropping a coin straight into a writer’s open hand",
  room1Door: "a clock beside a newspaper whose page is half filled with ad boxes",
  room2Bad: "a funnel with a whispering mouth muttering false prices at the agent",
  room2Bright: "a plain honest price tag standing while the funnel lies discarded",
  room2Door: "a coin falling through a funnel next to a “most popular” ribbon",
  room3Bad: "the locked cabinet with a no-export sign while the human waits, exhausted",
  room3Bright: "the agent carrying a small suitcase of data from one open door to another",
  room3Door: "a padlock hanging on a three-drawer filing cabinet",
  room4Bad: "a small buyer’s agent facing a towering, better-funded seller agent",
  room4Bright: "a balanced scale with an equal agent standing on each pan",
  room4Door: "two hands haggling over a price tag",
  room5Bad: "the agent's hand covering the human's, painting over the marks the human made",
  room5Bright: "a human hand and an agent hand together drawing one heart neither could make alone",
  room5Door: "a human hand and an agent hand drawing on the same canvas at the same time",
  room6Bad: "a stamp floating over a contract with an empty signature line, pressed by nobody",
  room6Bright: "the agent holds the contract up and points at one clause; the human looks relieved",
  room6Door: "a rubber stamp coming down over a contract",
  room7Bad: "one human head drowned in a crowd of identical agent heads",
  room7Bright: "agents stand behind humans whispering advice while the humans raise their hands to vote",
  room7Door: "a circle of human and agent heads around one table",
  type1: "a clock beside a newspaper — sites that want your seconds",
  type2: "a funnel that swallows many visitors and drips out one coin",
  type3: "a padlock on a filing cabinet — sites that keep your data inside",
  type4: "a human hand and an agent hand reaching over one price tag",
  type5: "a pencil drawing on a sheet of paper",
  type6: "a rubber stamp pressing down on a sheet of paper",
  type7: "three heads — a human, an agent and a third — joining into one group",
};

/* Eager so a slide never waits on a dynamic import mid-transition. Vite turns
 * each match into a hashed asset URL at build time. */
const pngs = import.meta.glob('./png/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function fileOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.png'.length);
}

/**
 * The drawings are delivered named after the old SVG constants
 * (`room1Door`, `introChoiceAgent`, `type1`) but slot keys are kebab-case
 * (`room-1-door`, `intro-choice-agent`, `type-1`). Convert rather than rename
 * the files, so a redelivered batch keeps working.
 */
function slotKey(file: string): string {
  return file
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/(\d)([a-zA-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Escapes a value going into a double-quoted HTML attribute. */
function attr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const raster: Record<string, string> = {};
for (const [path, url] of Object.entries(pngs)) {
  const file = fileOf(path);
  const slot = slotKey(file);
  const alt = ALT[file];
  // No alt entry means the drawing is not described anywhere, and an
  // undescribed image is worse than a decorative one: mark it decorative
  // rather than let a screen reader read out a file name.
  raster[slot] =
    `<img src="${attr(url)}" alt="${attr(alt ?? '')}"` +
    ` class="illo__img" width="640" height="400" decoding="async" draggable="false">`;
}

export function getIllo(name: string): string | undefined {
  return raster[name];
}
